#!/usr/bin/env node
// build-data.mjs — von der GitHub Action ausgeführt (siehe ADR-001).
//
// Ablauf:
//   1. WFS-GeoJSON der Stadt Karlsruhe serverseitig abrufen (kein CORS im Runner).
//   2. Auf gemeinde="Karlsruhe" filtern (Elsass-Einträge haben gemeinde=null).
//   3. Punkt + Polygon je Vorgang deduplizieren -> ein Marker je Vorgang;
//      die Polygon-Geometrie bleibt als properties.area erhalten (A-7).
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

import { utm32ToWgs84, transformGeometry } from '../src/lib/transform.js';
import { classifyArt, classifySperrgrad, classifyVerkehrsmittel } from '../src/lib/classify.js';
import { stripHtml, parseDate } from '../src/lib/format.js';
import { cleanChangelogEntry, hasFeedContent } from '../src/lib/changelog.js';
import {
  diffFeatures,
  hasChanges,
  summaryLine,
  summaryMarkdown,
  changelogEntry,
  pruneChangelogEntries,
} from './diff-data.mjs';
import { analyzeQuality, summarizeQuality, renderQualityMarkdown } from './quality-report.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_FILE = join(ROOT, 'data', 'baustellen.geojson');
const CHANGELOG_FILE = join(ROOT, 'data', 'CHANGELOG.md');
const CHANGELOG_JSON_FILE = join(ROOT, 'data', 'changelog.json');
const QUALITY_FILE = join(ROOT, 'data', 'QUALITY.md');
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

// First coordinate pair of an arbitrarily nested geometry, or null when there
// isn't one. Used to decide whether a shape needs transforming at all — the
// same auto-detection `toWgs84()` applies to single points, just reached
// through one more layer of nesting.
function firstCoordinate(coords) {
  if (!Array.isArray(coords) || coords.length === 0) return null;
  if (typeof coords[0] === 'number') return coords;
  return firstCoordinate(coords[0]);
}

// One non-Point geometry, transformed and rounded, ready for the snapshot.
//
// `transformGeometry()` transforms unconditionally, so the UTM check happens
// here — otherwise a source that unexpectedly answers in WGS84 would get its
// area mangled while its point came through untouched. Rounded to the same 6
// decimals as the Point coordinates: an area is drawn, not measured, and the
// raw float tails would otherwise bloat the committed snapshot.
function prepareArea(geometry) {
  if (!geometry || geometry.type === 'Point' || geometry.type === 'MultiPoint') return null;
  const first = firstCoordinate(geometry.coordinates);
  if (!first) return null; // malformed/empty shape -> no area, never a crash
  const wgs = looksLikeUtm32(first[0], first[1]) ? transformGeometry(geometry) : geometry;
  const roundDeep = (c) => (typeof c[0] === 'number' ? [round(c[0]), round(c[1])] : c.map(roundDeep));
  return { type: wgs.type, coordinates: roundDeep(wgs.coordinates) };
}

const POLYGONAL = new Set(['Polygon', 'MultiPolygon']);
const LINEAR = new Set(['LineString', 'MultiLineString']);

// Coordinates of a geometry lifted to the member level of its Multi* form, so
// several geometries of the same family can be concatenated into one.
function areaParts(g) {
  return g.type === 'MultiPolygon' || g.type === 'MultiLineString' ? g.coordinates : [g.coordinates];
}

/**
 * Construction-site area (A-7): ALL sibling non-Point geometries of the same
 * `vorgangsnummer`, combined into one geometry for `properties.area`.
 *
 * E8 originally said "the first one wins" for a case with more than one shape,
 * noting it was unconfirmed whether that even occurs. The live inspection
 * (2026-07-28, 444 Karlsruhe features) says it does: 24 of 183 cases carry
 * between 2 and 6 shapes — a closure split across several street segments or
 * building entrances. Keeping only the first would draw one segment of such a
 * closure and silently drop the rest, which is worse than drawing nothing:
 * a partial shape still looks authoritative. So they're combined instead.
 *
 * A single shape stays exactly as it is (the 159-case majority) rather than
 * being wrapped in a pointless `MultiPolygon`.
 */
function buildArea(geometries) {
  const list = (geometries || []).map(prepareArea).filter(Boolean);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  if (list.every((g) => POLYGONAL.has(g.type))) {
    return { type: 'MultiPolygon', coordinates: list.flatMap(areaParts) };
  }
  if (list.every((g) => LINEAR.has(g.type))) {
    return { type: 'MultiLineString', coordinates: list.flatMap(areaParts) };
  }
  // Polygons and lines in the same case can't share a Multi* type. This is rare
  // but real — the first full build produced 2 such cases out of 183 — so the
  // client has to handle it: L.geoJSON renders a GeometryCollection, and
  // renderAreas() splits it so each member is styled by its own type.
  return { type: 'GeometryCollection', geometries: list };
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

/**
 * Groups the Karlsruhe features by `vorgangsnummer`: one marker feature per
 * case, plus ALL of that case's sibling non-Point geometries (A-7).
 *
 * Pulled out of main() so it's testable without a live WFS fetch — the dedup
 * rule is the one place where a mistake silently doubles or halves the dataset
 * (see the `id` vs. `vorgangsnummer` pitfall in CLAUDE.md).
 *
 * The marker keeps being the FIRST Point of the case, unchanged. For the 24
 * multi-part cases that means the marker sits on one of several points while
 * the area spans them all — acceptable, since the marker is the handle for the
 * popup, not a claim about where the work is; moving it to a computed centroid
 * would shift marker positions in the committed snapshot for no gain.
 *
 * @param {object[]} features WFS features, already filtered to Karlsruhe
 * @returns {Map<string, {feature: object, areas: object[]}>}
 */
function dedupeFeatures(features) {
  const byKey = new Map();
  for (const f of features) {
    const key = dedupKey(f.properties);
    const isPoint = f.geometry?.type === 'Point';
    let entry = byKey.get(key);
    if (!entry) {
      entry = { feature: f, areas: [] };
      byKey.set(key, entry);
    } else if (isPoint && entry.feature.geometry?.type !== 'Point') {
      // Punkt-Geometrie ist als Marker-Position präziser als ein Polygon-Mittelwert.
      entry.feature = f;
    }
    if (!isPoint && f.geometry) entry.areas.push(f.geometry);
  }
  return byKey;
}

function buildFeature(props, geometry, areaGeometries) {
  const art = classifyArt(pick(props, FIELDS.art));
  const info = stripHtml(pick(props, FIELDS.info) ?? '');
  const titel = String(pick(props, FIELDS.titel) ?? '').trim() || art.label;
  const von = toIso(pick(props, FIELDS.von));
  const bis = toIso(pick(props, FIELDS.bis));
  const verursacher = String(pick(props, FIELDS.verursacher) ?? '').trim() || null;
  const sperrung = String(pick(props, FIELDS.sperrung) ?? '').trim();

  // Ampel autoritativ aus dem amtlichen Feld `sperrung` (konsistent je Wert);
  // nur wenn es fehlt, aus dem kombinierten Klartext ableiten.
  const combined = `${sperrung} ${art.label} ${titel} ${info}`;
  const ampel = classifySperrgrad(sperrung || combined);
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
      // Spatial extent of the case, when the WFS delivered one (A-7). English
      // name on purpose, unlike the German properties above — new identifiers
      // are named in English since 2026-07-27 (E7 in A-7). Additive: `geometry`
      // stays the marker Point, so search, filters, and the list are untouched.
      area: buildArea(areaGeometries),
    },
  };
}

// Koordinaten auf 6 Nachkommastellen (~11 cm) runden — mehr braucht kein Marker.
function round(n) {
  return Math.round(n * 1e6) / 1e6;
}

// Generic atomic writer (temp + rename) — used for baustellen.geojson AND
// changelog.json, so an abort mid-write never leaves either as a corrupt file.
function writeAtomic(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + '.tmp';
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
}

// Vorhandenes data/changelog.json laden (für's Voranstellen + Pruning).
// Fehlt/kaputt -> leeres Array, dieselbe Grosszügigkeit wie loadPrevious().
function loadChangelogJson() {
  if (!existsSync(CHANGELOG_JSON_FILE)) return [];
  try {
    const parsed = JSON.parse(readFileSync(CHANGELOG_JSON_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

  // 2. Deduplizieren (Punkt + Polygon je Vorgang) — Punkt-Geometrie bevorzugen,
  //    die Polygon-Geometrie als Fläche behalten (A-7).
  const byKey = dedupeFeatures(kaFeatures);
  console.log(`Nach Deduplizierung: ${byKey.size} Vorgänge.`);

  // 3.–5. Transformieren, bereinigen, klassifizieren. Nebenbei Qualitäts-Records
  //        (mit Rohwerten) für den Datenqualitäts-Report sammeln (Backlog #18).
  const features = [];
  const qualityRecords = [];
  let skipped = 0;
  for (const { feature: f, areas } of byKey.values()) {
    const built = buildFeature(f.properties, f.geometry, areas);
    if (!built) {
      skipped++;
      continue;
    }
    features.push(built);
    qualityRecords.push({
      vorgang: built.properties.id,
      titel: built.properties.titel,
      titelRaw: String(pick(f.properties, FIELDS.titel) ?? '').trim(),
      von: built.properties.von,
      bis: built.properties.bis,
      art: built.properties.art,
      artKnown: built.properties.artKnown,
      verursacher: built.properties.verursacher,
      sperrung: String(pick(f.properties, FIELDS.sperrung) ?? '').trim(),
      ampel: built.properties.ampel,
      hasVorgangsnummer: pick(f.properties, FIELDS.vorgang) !== undefined,
      // A-7/E9: carries a paired non-Point geometry, i.e. renders as an area.
      hasArea: built.properties.area != null,
      lon: built.geometry.coordinates[0],
      lat: built.geometry.coordinates[1],
    });
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

  const now = new Date();
  const ts = humanTimestamp(now);

  // Datenqualitäts-Report (Backlog #18) — bei JEDEM Lauf berechnet und ins
  // Job-Summary geschrieben (auch ohne Datenänderung), damit Auffälligkeiten
  // jederzeit sichtbar sind. Die committete Datei data/QUALITY.md wird nur bei
  // echter Datenänderung geschrieben (siehe unten), um Rausch-Commits zu vermeiden.
  const stats = { raw: raw.features.length, ka: kaFeatures.length, deduped: byKey.size, skipped };
  const report = analyzeQuality(qualityRecords, stats, now);
  const qualityMd = renderQualityMarkdown(report, ts);
  console.log(`Qualität: ${summarizeQuality(report)}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${qualityMd}\n`);
  }

  // 6. Mit vorherigem Snapshot vergleichen — nur bei echter Änderung schreiben.
  //    So bleibt jeder Commit an der Datei eine tatsächliche Datenänderung, und
  //    ein bloß wechselnder Zeitstempel erzeugt keinen Rausch-Commit.
  const prev = loadPrevious();
  const firstFill = !prev || prev.sample === true; // Beispieldaten -> Erstbefüllung
  const diff = diffFeatures(prev && !prev.sample ? prev.features || [] : [], features);

  if (prev && !prev.sample && !hasChanges(diff)) {
    console.log(`Keine Änderung (${features.length} Baustellen unverändert). Datei bleibt wie sie ist.`);
    // Keine Datenänderung -> kein Snapshot-/Changelog-Update. Den Qualitäts-Report
    // aber einmalig anlegen, falls er noch fehlt (Bootstrap), damit data/QUALITY.md
    // existiert, ohne bei jedem Lauf einen Rausch-Commit zu erzeugen.
    if (!existsSync(QUALITY_FILE)) {
      writeFileSync(QUALITY_FILE, qualityMd, 'utf8');
      writeFileSync(BUILD_SUMMARY_FILE, 'chore(data): Datenqualitäts-Report ergänzt\n');
      console.log('Datenqualitäts-Report erstmalig erzeugt (data/QUALITY.md).');
    }
    // Dasselbe Bootstrap-Muster für data/changelog.json (A-6): ein leeres Array,
    // damit ein frischer Fork/eine frische Umgebung den echten leeren Zustand
    // zeigt ("keine Änderungen") statt eines fehlenden/404-Datensatzes.
    if (!existsSync(CHANGELOG_JSON_FILE)) {
      writeAtomic(CHANGELOG_JSON_FILE, '[]\n');
      console.log('data/changelog.json erstmalig angelegt (leer).');
    }
    return;
  }

  const collection = {
    type: 'FeatureCollection',
    stand: now.toISOString(), // Zeitpunkt der letzten tatsächlichen Änderung
    attribution: ATTRIBUTION,
    count: features.length,
    features,
  };
  writeAtomic(OUT_FILE, JSON.stringify(collection) + '\n');

  // Übersicht erzeugen (Changelog + Quality-Report + Job-Summary + Commit-Message).
  const line = summaryLine(diff, features.length);
  const md = summaryMarkdown(diff, features.length, ts, { firstFill });

  prependChangelog(md);
  writeFileSync(QUALITY_FILE, qualityMd, 'utf8');

  // data/changelog.json (A-6) — dieselbe Aussage wie CHANGELOG.md, nur
  // strukturiert statt Markdown. Neuester Eintrag zuerst, auf 30 Tage
  // beschnitten (E3); `stand` ist der echte Änderungszeitpunkt, kein
  // Lauf-Zeitstempel — sonst verwässert jeder Action-Lauf das Pruning-Fenster.
  // Läufe, deren einzige Änderung "sonstige Angaben aktualisiert" wäre, tragen
  // für Anwohner nichts bei (#28) — changelogEntry() lässt sie weg, und bleibt
  // der Eintrag dadurch leer, kommt er gar nicht in den Feed. Sonst stünde im
  // Dialog eine Uhrzeit mit leerer Liste darunter. data/CHANGELOG.md protokolliert
  // die Änderung weiterhin, der Snapshot wird ohnehin geschrieben.
  const changelogJsonEntry = changelogEntry(diff, now.toISOString(), features.length, { firstFill });
  const vorherige = loadChangelogJson().map(cleanChangelogEntry).filter(hasFeedContent);
  const changelogJson = pruneChangelogEntries(
    hasFeedContent(changelogJsonEntry) ? [changelogJsonEntry, ...vorherige] : vorherige,
    now
  );
  writeAtomic(CHANGELOG_JSON_FILE, JSON.stringify(changelogJson) + '\n');
  if (!hasFeedContent(changelogJsonEntry)) {
    console.log('„Was ist neu?"-Feed: kein Eintrag (nur sonstige Angaben geändert).');
  }
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

export { pick, isKarlsruhe, buildFeature, buildArea, dedupeFeatures, representativePoint, main };
