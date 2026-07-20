// classify.js — fachliche Einordnung der Rohfelder in Klartext.
//
// Reine Funktionen, keine DOM-Abhängigkeit. Geteilt von Build-Skript und Client.
//
// Drei Aufgaben:
//   1. `art`-Verwaltungscode -> Klartext (mit Fallback für Unbekanntes).
//   2. Sperrgrad -> Ampel (rot = Vollsperrung, gelb = Teilsperrung,
//      grün = geringe Behinderung).
//   3. Betroffene Verkehrsmittel (Fuß / Rad / Auto / ÖPNV).
//
// Da der amtliche Datensatz keine sauber getrennten Felder für Sperrgrad und
// Verkehrsmittel garantiert, arbeiten (2) und (3) schlüsselwortbasiert über den
// kombinierten Klartext (art-Label + zusatzinfo). Das ist robust gegenüber
// wechselnden Feldnamen und lässt sich leicht erweitern. Die art-Codes selbst
// werden über eine Tabelle übersetzt; unbekannte Codes bekommen einen
// generischen, aber ehrlichen Fallback (siehe Backlog #15).

// ---------------------------------------------------------------------------
// 1. art-Code -> Klartext
// ---------------------------------------------------------------------------
// Der amtliche Datensatz liefert im Feld `art` bereits lesbaren Klartext — kein
// kryptischer Code (Stand 2026-07: 15 Kategorien, u. a. „Strom bzw. TK-Versorgung",
// „Fernwärmeversorgung", „Bauliche Sondernutzung", „Gas bzw. Wasserversorgung",
// „Straßenbau", „Kanalbau", „Gleisbau", „Brückenbau", „Tunnelbau", „Stützwand",
// „Abbruch/Rückbau", „Haltestellenumbau mit Straßenumgestaltung", „Kraneinsatz",
// „Baugrunduntersuchung", „geänderte Verkehrsführung im Zuge von Baumaßnahmen").
// Solche Werte werden unverändert übernommen. ART_MAP ist nur der Override-Punkt,
// falls eine Kategorie doch umformuliert werden soll; Schlüssel werden
// case-insensitiv und ohne Leer-/Sonderzeichen verglichen.
export const ART_MAP = {
  // Beispiel-Override (aktuell keiner nötig):
  // 'sonstiges': 'Sonstige Baustelle',
};

// Unterscheidet echten Klartext (enthält Kleinbuchstaben, z. B. „Straßenbau",
// „Stützwand") von einem kryptischen Code (z. B. „K12", „STRB-3", „0815").
function looksReadable(s) {
  return s.length >= 3 && /[a-zäöüß]/.test(s);
}

/**
 * Übersetzt/normalisiert den art-Wert in Klartext.
 * @param {string} art Rohwert aus dem Datensatz
 * @returns {{code: string, label: string, known: boolean}}
 */
export function classifyArt(art) {
  const code = String(art ?? '').trim();
  if (!code) return { code: '', label: 'Baustelle', known: false };
  const key = code.toLowerCase().replace(/[\s_-]+/g, '');
  const override = ART_MAP[code] ?? ART_MAP[code.toLowerCase()] ?? ART_MAP[key];
  if (override) return { code, label: override, known: true };
  // Bereits lesbare Kategorie -> direkt übernehmen.
  if (looksReadable(code)) return { code, label: code, known: true };
  // Ehrlicher Fallback: kryptischen Code sichtbar lassen, damit er auffällt.
  return { code, label: `Baustelle (${code})`, known: false };
}

// ---------------------------------------------------------------------------
// 2. Sperrgrad -> Ampel
// ---------------------------------------------------------------------------
export const AMPEL = {
  VOLL: { level: 'voll', color: 'red', label: 'Vollsperrung' },
  TEIL: { level: 'teil', color: 'amber', label: 'Teilsperrung' },
  GERING: { level: 'gering', color: 'green', label: 'Geringe Behinderung' },
};

// Eindeutige Voll­sperrung: nur explizite Formulierungen (ein bloßes „gesperrt"
// ist mehrdeutig — z. B. „Gehweg gesperrt" — und zählt bewusst NICHT hier).
const VOLL_RE =
  /vollsperrung|komplettsperrung|voll gesperrt|komplett gesperrt|gesamte fahrbahn gesperrt|durchfahrt (?:nicht möglich|gesperrt)/i;
// Teilsperrung: partielle Einschränkungen haben Vorrang vor einem bloßen „gesperrt".
const TEIL_RE =
  /teilsperrung|halbseitig|einseitig|einbahn|eine fahrspur|(?:fahr)?spur (?:gesperrt|verengt)|fahrstreifen|verengt|ampelregelung|wechselseitig|(?:geh|rad|fuß|fuss)weg[^.]{0,25}gesperrt/i;

/**
 * Bestimmt den Sperrgrad (Ampelstufe) aus dem kombinierten Klartext.
 * Reihenfolge: erst eindeutige Vollsperrung, dann partielle Einschränkungen,
 * sonst geringe Behinderung.
 * @param {string} text art-Label + zusatzinfo (bereits von HTML bereinigt)
 * @returns {{level: string, color: string, label: string}}
 */
export function classifySperrgrad(text) {
  const t = String(text ?? '');
  if (VOLL_RE.test(t)) return AMPEL.VOLL;
  if (TEIL_RE.test(t)) return AMPEL.TEIL;
  return AMPEL.GERING;
}

// ---------------------------------------------------------------------------
// 3. Betroffene Verkehrsmittel
// ---------------------------------------------------------------------------
const MODES = [
  { key: 'fuss', label: 'zu Fuß', re: /gehweg|fußweg|fussweg|fußgänger|fussgänger|bürgersteig|gehbahn/i },
  { key: 'rad', label: 'Rad', re: /radweg|radfahr|fahrradweg|schutzstreifen|radstreifen/i },
  // Bewusst OHNE "straße/strasse": das steckt in fast jedem Straßennamen und
  // wäre kein echtes Signal. Straßenbaustellen ohne Detailhinweis fängt der
  // Auto-Fallback unten ab.
  { key: 'auto', label: 'Auto', re: /fahrbahn|fahrspur|fahrstreifen|\bkfz\b|\bpkw\b|durchfahrt|einbahn|parkplatz|parken/i },
  { key: 'oepnv', label: 'ÖPNV', re: /bus|straßenbahn|strassenbahn|tram|haltestelle|linie \d|öpnv|oepnv|gleis|bahnverkehr/i },
];

/**
 * Ermittelt, welche Verkehrsmittel betroffen sind.
 * Fällt auf "Auto" zurück, wenn keine spezifischen Hinweise gefunden werden
 * (Straßenbaustellen betreffen im Zweifel den Kfz-Verkehr).
 * @param {string} text art-Label + zusatzinfo (bereits von HTML bereinigt)
 * @returns {{fuss: boolean, rad: boolean, auto: boolean, oepnv: boolean, labels: string[]}}
 */
export function classifyVerkehrsmittel(text) {
  const t = String(text ?? '');
  const result = { fuss: false, rad: false, auto: false, oepnv: false, labels: [] };
  for (const m of MODES) {
    if (m.re.test(t)) {
      result[m.key] = true;
      result.labels.push(m.label);
    }
  }
  if (result.labels.length === 0) {
    result.auto = true;
    result.labels.push('Auto');
  }
  return result;
}
