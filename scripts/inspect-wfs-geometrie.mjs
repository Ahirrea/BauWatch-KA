#!/usr/bin/env node
// TEMPORÄR — nach der Auswertung wieder entfernen (Schritt 10 in A-7).
//
// Beantwortet die eine Frage, die lokal nicht beantwortbar ist (Egress, siehe
// CLAUDE.md): WIE liefert der WFS die Geometrien eines Vorgangs? Genau ein
// Punkt plus genau ein Polygon — oder mehr? Und was für Formen sind das:
// echte Umrisse oder achsparallele Kästen?
//
// Nur lesend: kein Schreiben, kein Commit. Die Zahlen aus data/QUALITY.md
// (444 Karlsruher Features -> 183 Vorgänge, also ~2,4 Geometrien je Vorgang)
// legen nahe, dass E8's Randfall „mehr als eine Nicht-Punkt-Geometrie" der
// Normalfall ist. Das prüft dieses Skript nach, statt es zu schätzen.

import { pick, isKarlsruhe } from './build-data.mjs';

const WFS_BASE = 'https://mobil.trk.de/geoserver/TBA/ows';
const WFS_LAYER = 'TBA:baustellen_aktuell';

const url =
  WFS_BASE +
  '?' +
  Object.entries({
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typeName: WFS_LAYER,
    outputFormat: 'application/json',
  })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

const res = await fetch(url, {
  headers: { 'User-Agent': 'BauWatch-KA geometry inspection (github.com/Ahirrea/BauWatch-KA)' },
});
if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
const raw = await res.json();

const ka = raw.features.filter((f) => isKarlsruhe(f.properties));
console.log(`Rohdaten: ${raw.features.length} Features · Karlsruhe: ${ka.length}`);

// --- Geometrietypen ---------------------------------------------------------
const typen = new Map();
for (const f of ka) typen.set(f.geometry?.type ?? '(keine)', (typen.get(f.geometry?.type ?? '(keine)') || 0) + 1);
console.log('\n## Geometrietypen (Karlsruhe)');
for (const [t, n] of [...typen].sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${n}`);

// --- Gruppierung je Vorgangsnummer ------------------------------------------
const byVorgang = new Map();
for (const f of ka) {
  const v = pick(f.properties, ['vorgangsnummer']) ?? '(ohne)';
  if (!byVorgang.has(v)) byVorgang.set(v, []);
  byVorgang.get(v).push(f);
}
console.log(`\n## Vorgänge: ${byVorgang.size}`);

// Wie viele Punkte / Nicht-Punkte je Vorgang?
const kombi = new Map(); // "1P/1F" -> count
const nichtPunktHist = new Map(); // Anzahl Nicht-Punkt-Geometrien -> Vorgänge
for (const [, fs] of byVorgang) {
  const p = fs.filter((f) => f.geometry?.type === 'Point').length;
  const a = fs.length - p;
  kombi.set(`${p} Punkt / ${a} Fläche`, (kombi.get(`${p} Punkt / ${a} Fläche`) || 0) + 1);
  nichtPunktHist.set(a, (nichtPunktHist.get(a) || 0) + 1);
}
console.log('\n## Punkt-/Flächen-Kombination je Vorgang');
for (const [k, n] of [...kombi].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n} Vorgänge`);
console.log('\n## Anzahl Nicht-Punkt-Geometrien je Vorgang');
for (const [k, n] of [...nichtPunktHist].sort((a, b) => a[0] - b[0]))
  console.log(`  ${k}: ${n} Vorgänge`);

const mehrfach = [...byVorgang.entries()].filter(
  ([, fs]) => fs.filter((f) => f.geometry?.type !== 'Point').length > 1
);
console.log(
  `\n>>> Vorgänge mit MEHR als einer Nicht-Punkt-Geometrie: ${mehrfach.length} von ${byVorgang.size}` +
    ` (${((mehrfach.length / byVorgang.size) * 100).toFixed(0)} %)`
);
console.log('    Bei E8 (erste gewinnt) würde bei genau diesen ein Teil der Fläche fehlen.');

// --- Formtreue: Kasten oder echter Umriss? ----------------------------------
// Koordinaten sind EPSG:25832 (Meter) -> Ausdehnung direkt in Metern lesbar.
function ringe(geometry) {
  if (!geometry?.coordinates) return [];
  const out = [];
  const walk = (c, tiefe) => {
    if (typeof c[0]?.[0] === 'number') out.push(c);
    else if (Array.isArray(c)) c.forEach((x) => walk(x, tiefe + 1));
  };
  walk(geometry.coordinates, 0);
  return out;
}

function bbox(pts) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// Achsparalleler Kasten: jeder Stützpunkt liegt auf einer bbox-Ecke.
function istKasten(pts) {
  const b = bbox(pts);
  const eps = 0.5; // 50 cm
  return pts.every(
    (p) =>
      (Math.abs(p[0] - b.minX) < eps || Math.abs(p[0] - b.maxX) < eps) &&
      (Math.abs(p[1] - b.minY) < eps || Math.abs(p[1] - b.maxY) < eps)
  );
}

const stuetzpunkte = [];
let kaesten = 0;
let formen = 0;
const groessen = [];
for (const f of ka) {
  if (!f.geometry || f.geometry.type === 'Point') continue;
  for (const r of ringe(f.geometry)) {
    formen++;
    stuetzpunkte.push(r.length);
    if (istKasten(r)) kaesten++;
    const b = bbox(r);
    groessen.push([Math.round(b.maxX - b.minX), Math.round(b.maxY - b.minY)]);
  }
}
stuetzpunkte.sort((a, b) => a - b);
const median = (arr) => arr[Math.floor(arr.length / 2)];
console.log(`\n## Formtreue (${formen} Ringe)`);
console.log(`  Stützpunkte je Ring: min ${stuetzpunkte[0]} · Median ${median(stuetzpunkte)} · max ${stuetzpunkte.at(-1)}`);
console.log(`  achsparallele Kästen: ${kaesten} von ${formen} (${((kaesten / formen) * 100).toFixed(0)} %)`);
const breiten = groessen.map((g) => g[0]).sort((a, b) => a - b);
const hoehen = groessen.map((g) => g[1]).sort((a, b) => a - b);
console.log(`  Ausdehnung Ost-West [m]: min ${breiten[0]} · Median ${median(breiten)} · max ${breiten.at(-1)}`);
console.log(`  Ausdehnung Nord-Süd [m]: min ${hoehen[0]} · Median ${median(hoehen)} · max ${hoehen.at(-1)}`);

// --- Beispiele --------------------------------------------------------------
console.log('\n## Beispiele: Vorgänge mit mehreren Flächen');
for (const [v, fs] of mehrfach.slice(0, 6)) {
  const lage = pick(fs[0].properties, ['lage']) ?? '?';
  console.log(`\n  Vorgang ${v} — ${lage}`);
  for (const f of fs) {
    if (f.geometry?.type === 'Point') {
      console.log(`    Point   id=${pick(f.properties, ['id'])}`);
      continue;
    }
    for (const r of ringe(f.geometry)) {
      const b = bbox(r);
      console.log(
        `    ${f.geometry.type.padEnd(7)} id=${pick(f.properties, ['id'])} ` +
          `${r.length} Punkte · ${Math.round(b.maxX - b.minX)}×${Math.round(b.maxY - b.minY)} m` +
          `${istKasten(r) ? ' · Kasten' : ''}`
      );
    }
  }
}

console.log('\n## Beispiel: ein Vorgang mit genau einer Fläche');
const einfach = [...byVorgang.entries()].find(
  ([, fs]) => fs.filter((f) => f.geometry?.type !== 'Point').length === 1
);
if (einfach) {
  const [v, fs] = einfach;
  console.log(`  Vorgang ${v} — ${pick(fs[0].properties, ['lage'])}`);
  for (const f of fs) {
    console.log(`    ${f.geometry?.type}: ${JSON.stringify(f.geometry?.coordinates).slice(0, 300)}`);
  }
}
