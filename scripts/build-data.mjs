#!/usr/bin/env node
// build-data.mjs — von der GitHub Action ausgeführt (siehe ADR-001).
//
// Ablauf:
//   1. WFS-GeoJSON der Stadt Karlsruhe serverseitig abrufen (kein CORS im Runner).
//   2. Auf gemeinde="Karlsruhe" filtern (Elsass-Einträge haben gemeinde=null).
//   3. Punkt + Polygon je Vorgang deduplizieren -> ein Marker je Vorgang.
//   4. Koordinaten EPSG:25832 -> WGS84 transformieren.
//   5. Felder bereinigen (HTML aus zusatzinfo, art-Klartext, Ampel, Verkehrsmittel).
//   6. Schlankes data/baustellen.geojson schreiben (nur benötigte Properties + stand).
//
// Robustheit: Bei API-Fehler, ungültiger Antwort oder verdächtig leerem
// Ergebnis bricht das Skript ab, OHNE die vorhandene Datei zu überschreiben.
// Geschrieben wird atomar (temp + rename), damit ein Abbruch mitten im
// Schreiben keine korrupte Datei hinterlässt.

import { writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { utm32ToWgs84 } from '../src/lib/transform.js';
import { classifyArt, classifySperrgrad, classifyVerkehrsmittel } from '../src/lib/classify.js';
import { stripHtml, parseDate } from '../src/lib/format.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_FILE = join(ROOT, 'data', 'baustellen.geojson');

const WFS_URL =
  'https://mobil.trk.de/geoserver/TBA/ows?service=WFS&version=2.0.0' +
  '&request=GetFeature&typeName=TBA:baustellen_aktuell' +
  '&outputFormat=application/json&srsName=EPSG:25832';

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

const FIELDS = {
  id: ['id', 'objectid', 'fid', 'vorgang', 'vorgangsnummer', 'baustelle_id', 'gid'],
  gemeinde: ['gemeinde', 'kommune', 'ort_gemeinde'],
  art: ['art', 'art_code', 'artcode', 'typ', 'kategorie', 'baustellenart'],
  info: ['zusatzinfo', 'info', 'beschreibung', 'bemerkung', 'hinweis', 'text'],
  titel: ['bezeichnung', 'titel', 'name', 'strasse', 'straße', 'ort', 'lage'],
  von: ['von', 'beginn', 'startdatum', 'datum_von', 'gueltig_von', 'beginn_datum', 'anfang'],
  bis: ['bis', 'ende', 'enddatum', 'datum_bis', 'gueltig_bis', 'ende_datum'],
  verursacher: ['verursacher', 'bauherr', 'firma', 'auftraggeber', 'traeger'],
};

// Repräsentativer Punkt (für Marker) aus einer beliebigen Geometrie in EPSG:25832.
function representativePoint(geometry) {
  if (!geometry || !geometry.coordinates) return null;
  if (geometry.type === 'Point') {
    return utm32ToWgs84(geometry.coordinates[0], geometry.coordinates[1]);
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
  return utm32ToWgs84(acc[0] / n, acc[1] / n);
}

function toIso(value) {
  const d = parseDate(value);
  return d ? d.toISOString().slice(0, 10) : null;
}

// --- Hauptlogik ------------------------------------------------------------

async function fetchWfs() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(WFS_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BauWatch-KA build (github.com/Ahirrea/BauWatch-KA)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const json = await res.json();
    if (!json || !Array.isArray(json.features)) {
      throw new Error('Antwort enthält keine features[]');
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

function isKarlsruhe(props) {
  const g = pick(props, FIELDS.gemeinde);
  // Elsass-Einträge haben gemeinde=null -> fallen raus. Nur exakt Karlsruhe.
  return typeof g === 'string' && g.trim().toLowerCase() === 'karlsruhe';
}

// Dedup-Schlüssel: bevorzugt die Vorgangs-ID, sonst eine Kombination stabiler Felder.
function dedupKey(props) {
  const id = pick(props, FIELDS.id);
  if (id !== undefined) return `id:${id}`;
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

  // Klassifikation über den kombinierten Klartext (art-Label + Info).
  const combined = `${art.label} ${titel} ${info}`;
  const ampel = classifySperrgrad(combined);
  const vm = classifyVerkehrsmittel(combined);

  const point = representativePoint(geometry);
  if (!point) return null;

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [round(point[0]), round(point[1])] },
    properties: {
      id: pick(props, FIELDS.id) ?? null,
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

  const collection = {
    type: 'FeatureCollection',
    stand: new Date().toISOString(),
    attribution: ATTRIBUTION,
    count: features.length,
    features,
  };

  writeAtomic(collection);
  console.log(`OK: ${features.length} Baustellen -> ${OUT_FILE}`);
}

// Nur ausführen, wenn direkt gestartet (nicht beim Import durch Tests).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(`Unerwarteter Fehler: ${err.stack || err}`);
    console.error('Vorhandene Datei bleibt unverändert.');
    process.exit(1);
  });
}

export { pick, isKarlsruhe, buildFeature, representativePoint };
