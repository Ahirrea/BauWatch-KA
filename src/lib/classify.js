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
// Starter-Tabelle. Schlüssel werden case-insensitiv und getrimmt verglichen.
// Erweitern, sobald reale Codes aus dem Datensatz bekannt sind (Backlog #15).
export const ART_MAP = {
  baustelle: 'Baustelle',
  bauarbeiten: 'Bauarbeiten',
  strassenbau: 'Straßenbau',
  strassensperrung: 'Straßensperrung',
  vollsperrung: 'Vollsperrung',
  teilsperrung: 'Teilsperrung',
  leitungsarbeiten: 'Leitungsarbeiten',
  kanalbau: 'Kanalarbeiten',
  gleisbau: 'Gleisbauarbeiten',
  bruckenbau: 'Brückenarbeiten',
  brückenbau: 'Brückenarbeiten',
  veranstaltung: 'Veranstaltung',
  sonstiges: 'Sonstiges',
};

/**
 * Übersetzt einen art-Code in Klartext.
 * @param {string} art Roh-Code aus dem Datensatz
 * @returns {{code: string, label: string, known: boolean}}
 */
export function classifyArt(art) {
  const code = String(art ?? '').trim();
  if (!code) return { code: '', label: 'Baustelle', known: false };
  const key = code.toLowerCase().replace(/[\s_-]+/g, '');
  const label = ART_MAP[code] ?? ART_MAP[code.toLowerCase()] ?? ART_MAP[key];
  if (label) return { code, label, known: true };
  // Ehrlicher Fallback: Code sichtbar lassen, damit fehlende Mappings auffallen.
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
