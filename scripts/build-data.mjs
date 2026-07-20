#!/usr/bin/env node
// build-data.mjs — von der GitHub Action ausgeführt (siehe ADR-001).
//
// Ablauf:
//   1. WFS-GeoJSON der Stadt Karlsruhe serverseitig abrufen (kein CORS im Runner).
//   2. Auf gemeinde="Karlsruhe" filtern (Elsass-Einträge haben gemeinde=null).
//   3. Punkt + Polygon je Vorgang deduplizieren -> ein Marker je Vorgang.
//   4. Koordinaten EPSG:25832 -> WGS84 transformieren.
//   5. Felder bereinigen (HTML aus zusatzinfo, art-Klartext, Ampel, Verkehrsmittel).
//   6. Mit dem vorherigen Snapshot vergleichen und NUR bei echter Änderung ein
//      schlankes data/baustellen.geojson schreiben (nur benötigte Properties +
//      stand = Zeitpunkt der letzten Änderung). Zusätzlich data/CHANGELOG.md
//      fortschreiben und eine Übersicht für Commit-Message/Job-Summary erzeugen.
//
// Robustheit: Bei API-Fehler, ungültiger Antwort oder verdächtig leerem
// Ergebnis bricht das Skript ab, OHNE die vorhandene Datei zu überschreiben.
// Geschrieben wird atomar (temp + rename), damit ein Abbruch mitten im
// Schreiben keine korrupte Datei hinterlässt. Ändern sich die Baustellen nicht,
// bleibt die Datei unverändert -> kein Commit -> die Git-Historie von
// data/baustellen.geojson entspricht exakt den echten Datenänderungen.

import { writeFileSync, readFileSync, appendFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { utm32ToWgs84 } from '../src/lib/transform.js';
import { classifyArt, classifySperrgrad, classifyVerkehrsmittel } from '../src/lib/classify.js';
import { stripHtml, parseDate } from '../src/lib/format.js';
import { diffFeatures, hasChanges, summaryLine, summaryMarkdown } from './diff-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_FILE = join(ROOT, 'data', 'baustellen.geojson');
const CHANGELOG_FILE = join(ROOT, 'data', 'CHANGELOG.md');
// Gitignorierte Datei; die Action liest daraus die Commit-Message.
const BUILD_SUMMARY_FILE = join(ROOT, 'build-summary.txt');

const WFS_BASE = 'https://mobil.trk.de/geoserver/TBA/ows';
const WFS_LAYER = 'TBA:baustellen_aktuell';

// Dieser GeoServer akzeptiert bekanntermaßen WFS 1.0.0 mit `typeName` (Singular);
// WFS 2.0.0 verlangt `typeNames` (Plural). Kein `srsName` -> Daten bleiben im
// nativen EPSG:25832 (falsches srsName-Format war die Ursache des HTTP 400).
// Wir probieren die Varianten der Reihe nach, bis eine gültiges GeoJSON liefert.
function wfsCandidates() {
  const q = (params) =>
    WFS_BASE +
    '?' +
    Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
  return [
    q({ service: 'WFS', version: '1.0.0', request: 'GetFeature', typeName: WFS_LAYER, outputFormat: 'application/json' }),
    q({ service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: WFS_LAYER, outputFormat: 'application/json' }),
    q({ service: 'WFS', version: '1.1.0', request: 'GetFeature', typeName: WFS_LAYER, outputFormat: 'application/json' }),
    q({ service: 'WFS', version: '1.0.0', request: 'GetFeature', typeName: WFS_LAYER, outputFormat: 'json' }),
  ];
}

const ATTRIBUTION =
  'Datensatz „Baustellen", Stadt Karlsruhe, Lizenz CC-BY 4.0';

const ALLOW_EMPTY = process.argv.includes('--allow-empty');

// --- Hilfsfunktionen für den robusten Feldzugriff --------------------------

// Der genaue Feldname im amtlichen Datensatz ist nicht garantiert. Wir prüfen
// mehrere plausible Kandidaten case-insensitiv und nehmen den ersten Treffer.
function pick(props, candidates) {
  if (!props) return undefined;
  const lower = {};
  for (const k of Object.keys(props)) lower[k.toLowerCase()] = props[k];
  for (const c of candidates) {
    const v = lower[c.toLowerCase()];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

// Feldnamen aus dem echten Datensatz (mit Fallback-Kandidaten für Robustheit).
const FIELDS = {
  // Vorgangs-Identität: Punkt und Polygon eines Vorgangs teilen `vorgangsnummer`
  // (die per-Geometrie-`id` NICHT). Deshalb ist das der Dedup-/Identitätsschlüssel.
  vorgang: ['vorgangsnummer', 'vorgang', 'projektnummer', 'baustelle_id'],
  id: ['id', 'objectid', 'fid', 'gid'],
  gemeinde: ['gemeinde', 'kommune', 'ort_gemeinde'],
  art: ['art', 'art_code', 'artcode', 'typ', 'kategorie', 'baustellenart'],
  info: ['zusatzinfo', 'info', 'beschreibung', 'bemerkung', 'hinweis', 'text'],
  titel: ['lage', 'bezeichnung', 'strasse', 'straße', 'titel', 'name', 'ort'],
  von: ['vorgangszeitraum_von', 'von', 'beginn', 'startdatum', 'datum_von', 'gueltig_von', 'anfang'],
  bis: ['vorgangszeitraum_bis', 'bis', 'ende', 'enddatum', 'datum_bis', 'gueltig_bis'],
  verursacher: ['verursacher', 'bauherr', 'firma', 'auftraggeber', 'traeger'],
  sperrung: ['sperrung', 'sperrgrad', 'sperrungsart', 'sperrungsgrad'],
};

// Sieht ein Koordinatenpaar nach UTM32 (Meter) aus? WGS84-Grad für KA sind
// einstellige lon / ~49 lat, UTM32-Werte liegen im Bereich Hunderttausende /
// Millionen. So erkennen wir automatisch, ob transformiert werden muss —
// robust, falls der Dienst wider Erwarten doch WGS84 liefert.
function looksLikeUtm32(x, y) {
  return Math.abs(x) > 1000 || Math.abs(y) > 1000;
}

function toWgs84(x, y) {
  return looksLikeUtm32(x, y) ? utm32ToWgs84(x, y) : [x, y];
}

// Repräsentativer Punkt (für Marker) aus einer beliebigen Geometrie.
function representativePoint(geometry) {
  if (!geometry || !geometry.coordinates) return null;
  if (geometry.type === 'Point') {
    return toWgs84(geometry.coordinates[0], geometry.coordinates[1]);
  }
  // Für Polygone/Linien: einfacher Mittelwert aller Stützpunkte (genügt für einen Marker).
  const acc = [0, 0];
  let n = 0;
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      acc[0] += c[0];
      acc[1] += c[1];
      n++;
    } else c.forEach(walk);
  };
  walk(geometry.coordinates);
  if (n === 0) return null;
  return toWgs84(acc[0] / n, acc[1] / n);
}

function toIso(value) {
  const d = parseDate(value);
  return d ? d.toISOString().slice(0, 10) : null;
}

// --- Hauptlogik ------------------------------------------------------------

async function fetchOne(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BauWatch-KA build (github.com/Ahirrea/BauWatch-KA)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      // GeoServer meldet Fehler oft als XML (ExceptionReport) mit Status 200.
      throw new Error('Antwort war kein JSON (vermutlich WFS-ExceptionReport)');
    }
    if (!json || !Array.isArray(json.features)) {
      throw new Error('Antwort enthält keine features[]');
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWfs() {
  const candidates = wfsCandidates();
  const errors = [];
  for (const url of candidates) {
    try {
      const json = await fetchOne(url);
      const version = new URL(url).searchParams.get('version');
      console.log(`WFS-Abruf erfolgreich (Version ${version}).`);
      return json;
    } catch (err) {
      errors.push(`  - ${url.split('?')[1]} -> ${err.message}`);
    }
  }
  throw new Error('Alle WFS-Varianten fehlgeschlagen:\n' + errors.join('\n'));
}

function isKarlsruhe(props) {
  const g = pick(props, FIELDS.gemeinde);
  // Elsass-Einträge haben gemeinde=null -> fallen raus. Nur exakt Karlsruhe.
  return typeof g === 'string' && g.trim().toLowerCase() === 'karlsruhe';
}

// Dedup-Schlüssel: die Vorgangsnummer (teilen sich Punkt & Polygon eines Vorgangs),
// sonst eine Kombination stabiler Felder.
function dedupKey(props) {
  const v = pick(props, FIELDS.vorgang);
  if (v !== undefined) return `v:${v}`;
  return [
    pick(props, FIELDS.art) ?? '',
    pick(props, FIELDS.titel) ?? '',
    pick(props, FIELDS.von) ?? '',
    pick(props, FIELDS.bis) ?? '',
  ].join('|');
}

function buildFeature(props, geometry) {
  const art = classifyArt(pick(props, FIELDS.art));
  const info = stripHtml(pick(props, FIELDS.info) ?? '');
  const titel = String(pick(props, FIELDS.titel) ?? '').trim() || art.label;
  const von = toIso(pick(props, FIELDS.von));
  const bis = toIso(pick(props, FIELDS.bis));
  const verursacher = String(pick(props, FIELDS.verursacher) ?? '').trim() || null;
  const sperrung = String(pick(props, FIELDS.sperrung) ?? '').trim();

  // Klassifikation: amtliches Feld `sperrung` zuerst (dominiert), dann Klartext.
  const combined = `${sperrung} ${art.label} ${titel} ${info}`;
  const ampel = classifySperrgrad(combined);
  const vm = classifyVerkehrsmittel(combined);

  const point = representativePoint(geometry);
  if (!point) return null;

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [round(point[0]), round(point[1])] },
    properties: {
      // Stabile Vorgangsnummer als Identität (überdauert Läufe; Basis der
      // Änderungsverfolgung), Fallback auf die per-Geometrie-id.
      id: pick(props, FIELDS.vorgang) ?? pick(props, FIELDS.id) ?? null,
      titel,
      art: art.label,
      artCode: art.code || null,
      artKnown: art.known,
      info: info || null,
      von,
      bis,
      verursacher,
      ampel: ampel.level,
      ampelLabel: ampel.label,
      verkehrsmittel: { fuss: vm.fuss, rad: vm.rad, auto: vm.auto, oepnv: vm.oepnv },
    },
  };
}

// Koordinaten auf 6 Nachkommastellen (~11 cm) runden — mehr braucht kein Marker.
function round(n) {
  return Math.round(n * 1e6) / 1e6;
}

function writeAtomic(collection) {
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  const tmp = OUT_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(collection) + '\n', 'utf8');
  renameSync(tmp, OUT_FILE);
}

// Vorhandenen Snapshot laden (für den Änderungsvergleich). Fehlt/kaputt -> null.
function loadPrevious() {
  if (!existsSync(OUT_FILE)) return null;
  try {
    return JSON.parse(readFileSync(OUT_FILE, 'utf8'));
  } catch {
    console.warn('Warnung: vorhandene Datei nicht lesbar — wird als Neubefüllung behandelt.');
    return null;
  }
}

// Neuen Eintrag oben an den CHANGELOG anfügen (neueste Änderung zuerst).
function prependChangelog(entryMarkdown) {
  const header = '# Änderungsprotokoll der Baustellendaten\n\nAutomatisch von der Daten-Action gepflegt. Neueste Änderung zuerst.\n';
  let body = '';
  if (existsSync(CHANGELOG_FILE)) {
    const existing = readFileSync(CHANGELOG_FILE, 'utf8');
    body = existing.replace(/^# [^\n]*\n(?:[^\n]*\n)*?\n/, ''); // alten Kopf entfernen
  }
  writeFileSync(CHANGELOG_FILE, `${header}\n${entryMarkdown}\n\n${body}`.trimEnd() + '\n', 'utf8');
}

// Menschlich lesbarer Zeitstempel (Europe/Berlin) für die Übersichten.
function humanTimestamp(date) {
  return date.toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

async function main() {
  console.log('Rufe WFS ab …');
  let raw;
  try {
    raw = await fetchWfs();
  } catch (err) {
    console.error(`FEHLER beim Abruf: ${err.message}`);
    console.error('Vorhandene Datei bleibt unverändert.');
    process.exit(1);
  }

  console.log(`Rohdatensatz: ${raw.features.length} Features.`);

  // 1. Auf Karlsruhe filtern.
  const kaFeatures = raw.features.filter((f) => isKarlsruhe(f.properties));
  console.log(`Nach Gemeinde-Filter (Karlsruhe): ${kaFeatures.length}.`);

  // 2. Deduplizieren (Punkt + Polygon je Vorgang) — Punkt-Geometrie bevorzugen.
  const byKey = new Map();
  for (const f of kaFeatures) {
    const key = dedupKey(f.properties);
    const existing = byKey.get(key);
    const isPoint = f.geometry && f.geometry.type === 'Point';
    if (!existing) {
      byKey.set(key, f);
    } else if (isPoint && existing.geometry.type !== 'Point') {
      // Punkt-Geometrie ist als Marker-Position präziser als ein Polygon-Mittelwert.
      byKey.set(key, f);
    }
  }
  console.log(`Nach Deduplizierung: ${byKey.size} Vorgänge.`);

  // 3.–5. Transformieren, bereinigen, klassifizieren.
  const features = [];
  let skipped = 0;
  for (const f of byKey.values()) {
    const built = buildFeature(f.properties, f.geometry);
    if (built) features.push(built);
    else skipped++;
  }
  if (skipped) console.log(`${skipped} Vorgänge ohne verwertbare Geometrie übersprungen.`);

  // Sicherung gegen versehentliches Leeren durch Schema-Änderungen der Quelle.
  if (features.length === 0 && !ALLOW_EMPTY) {
    console.error(
      'FEHLER: 0 Karlsruher Baustellen nach Aufbereitung. Verdacht auf ' +
        'Schema-Änderung der Quelle. Vorhandene Datei bleibt unverändert. ' +
        '(Mit --allow-empty erzwingbar.)'
    );
    process.exit(2);
  }

  // 6. Mit vorherigem Snapshot vergleichen — nur bei echter Änderung schreiben.
  //    So bleibt jeder Commit an der Datei eine tatsächliche Datenänderung, und
  //    ein bloß wechselnder Zeitstempel erzeugt keinen Rausch-Commit.
  const prev = loadPrevious();
  const firstFill = !prev || prev.sample === true; // Beispieldaten -> Erstbefüllung
  const diff = diffFeatures(prev && !prev.sample ? prev.features || [] : [], features);

  if (prev && !prev.sample && !hasChanges(diff)) {
    console.log(`Keine Änderung (${features.length} Baustellen unverändert). Datei bleibt wie sie ist.`);
    // Bewusst KEIN Schreiben, KEIN Commit, KEIN Changelog-Eintrag.
    return;
  }

  const now = new Date();
  const collection = {
    type: 'FeatureCollection',
    stand: now.toISOString(), // Zeitpunkt der letzten tatsächlichen Änderung
    attribution: ATTRIBUTION,
    count: features.length,
    features,
  };
  writeAtomic(collection);

  // Übersicht erzeugen (Changelog + Job-Summary + Commit-Message-Quelle).
  const ts = humanTimestamp(now);
  const line = summaryLine(diff, features.length);
  const md = summaryMarkdown(diff, features.length, ts, { firstFill });

  prependChangelog(md);
  writeFileSync(BUILD_SUMMARY_FILE, `chore(data): ${line}\n\n${md}\n`, 'utf8');
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
  }

  console.log(`OK: ${features.length} Baustellen -> ${OUT_FILE}`);
  console.log(`Änderung: ${line}`);
}

// Nur ausführen, wenn direkt gestartet (nicht beim Import durch Tests).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(`Unerwarteter Fehler: ${err.stack || err}`);
    console.error('Vorhandene Datei bleibt unverändert.');
    process.exit(1);
  });
}

export { pick, isKarlsruhe, buildFeature, representativePoint, main };
