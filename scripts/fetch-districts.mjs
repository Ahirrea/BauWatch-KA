// fetch-districts.mjs — fetches the city's district boundaries ONCE and writes
// data/districts.geojson (A-17 step 1, ADR-007).
//
// Not part of the regular data run, and never scheduled. The portal is
// unreachable from development sessions (egress policy, like the WFS), so this
// runs from a dispatched workflow run, and its output is committed as a
// static input that the build (assignment) and the browser (outline) share.
// A refresh is a deliberate re-run of the same step.
//
// What it does, and reports:
//   1. reads the portal metadata — licence, resource dates;
//   2. fetches the GeoJSON and converts UTM to WGS84 if needed;
//   3. keeps only { nr, name } per district, one feature per district;
//   4. simplifies the rings with the FINEST tolerance of at least
//      MIN_TOLERANCE_M that changes no site's district in the committed
//      snapshot and keeps the file under MAX_BYTES (A-17/E3). Finest, not
//      coarsest: boundaries often run along streets, which is exactly where
//      sites are, so a coarse outline would put future sites on the wrong side.
//
// Optional overrides when the field heuristics pick wrongly:
//   NAME_KEY=<property> NR_KEY=<property> node scripts/fetch-districts.mjs
// SOURCE_URL=<url> skips the portal metadata and reads that GeoJSON instead
// (for a local dry run against a fixture).

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformGeometry } from '../src/lib/transform.js';
import { assignDistrict, containsPoint, distanceToBoundaryM } from './districts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = join(ROOT, 'data', 'districts.geojson');
const SNAPSHOT_FILE = join(ROOT, 'data', 'baustellen.geojson');
const PORTAL = 'https://transparenz.karlsruhe.de';
const DATASET_ID = 'stadtteile';
const DATASET_PAGE = `${PORTAL}/dataset/${DATASET_ID}`;
// The GeoJSON resource as found during refinement (2026-10-18); used only if
// the metadata lists no GeoJSON resource.
const FALLBACK_URL = `${PORTAL}/dataset/8474ba52-f851-4f4b-b05a-1cba9bbd1f4d/resource/2a7fd644-bc67-477a-bb9e-cf88f076b7af/download/stadtteile.json`;
const MAX_BYTES = 150 * 1024;
// Every tolerance is measured and reported; 0 = unsimplified. Below
// MIN_TOLERANCE_M the file grows fast for no visible gain (at zoom 17 one
// pixel is about 0.8 m).
const TOLERANCES_M = [10, 6, 4, 3, 2, 1.5, 1, 0.5, 0];
const MIN_TOLERANCE_M = 1;
const M_PER_DEG = 111320;

const report = [];
function log(line = '') {
  console.log(line);
  report.push(line);
}
function finish(code) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, ['## Stadtteilgrenzen (A-17)', '', '```', ...report, '```', ''].join('\n'));
  }
  process.exit(code);
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json, application/geo+json;q=0.9, */*;q=0.1',
      'User-Agent': 'BauWatch-KA build (github.com/Ahirrea/BauWatch-KA)',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

const round6 = (n) => Math.round(n * 1e6) / 1e6;
const firstPair = (c) => (typeof c?.[0] === 'number' ? c : Array.isArray(c) ? firstPair(c[0]) : null);
const ringsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
const vertexCount = (g) => ringsOf(g).reduce((n, rings) => n + rings.reduce((m, r) => m + r.length, 0), 0);

// Douglas–Peucker on one closed ring, in a metric frame, without recursion
// (rings can carry thousands of vertices). The ring's first point is kept as
// an anchor; a ring that would collapse below a triangle stays as it was.
function simplifyRing(ring, tol) {
  if (tol <= 0 || ring.length <= 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = ring[a];
    const [bx, by] = ring[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let maxD = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = ring[i];
      let d;
      if (len2 === 0) d = Math.hypot(px - ax, py - ay);
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      }
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > tol) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  const out = ring.filter((_, i) => keep[i]);
  return out.length >= 4 ? out : ring;
}

// Metric frame: UTM is metric already; WGS84 is projected equirectangularly
// around the data's mean latitude, which is exact enough for a tolerance of
// a few metres within one city.
function metricFrame(isUtm, lat0) {
  if (isUtm) return { fwd: (c) => c, inv: (g) => transformGeometry(g) };
  const kx = M_PER_DEG * Math.cos((lat0 * Math.PI) / 180);
  const mapCoords = (c, f) => (typeof c[0] === 'number' ? f(c) : c.map((x) => mapCoords(x, f)));
  return {
    fwd: (c) => [c[0] * kx, c[1] * M_PER_DEG],
    inv: (g) => ({ ...g, coordinates: mapCoords(g.coordinates, ([x, y]) => [x / kx, y / M_PER_DEG]) }),
  };
}

function mapPairs(coords, f) {
  return typeof coords[0] === 'number' ? f(coords) : coords.map((c) => mapPairs(c, f));
}

// Picks the property holding the name and the one holding the number.
function pickKeys(features) {
  const keys = Object.keys(features[0]?.properties ?? {});
  const values = (k) => features.map((f) => f.properties?.[k]);
  // Names need not be unique per feature (a district can come in parts),
  // but a key with only a few distinct values is a type or a city name.
  const distinct = (k) => new Set(values(k)).size;
  const isNameKey = (k) =>
    values(k).every((v) => typeof v === 'string' && /\p{L}/u.test(v)) &&
    distinct(k) >= Math.min(10, Math.ceil(features.length / 2));
  const isNrKey = (k) => {
    const vs = values(k);
    return vs.every((v) => v !== null && v !== '' && /^\d+$/.test(String(v).trim()));
  };
  const nameKey =
    process.env.NAME_KEY ||
    keys
      .filter(isNameKey)
      .sort((a, b) => Number(/name|bez/i.test(b)) - Number(/name|bez/i.test(a)) || distinct(b) - distinct(a))[0];
  const nrKey =
    process.env.NR_KEY ||
    keys.filter(isNrKey).sort((a, b) => Number(/nr|num|nummer/i.test(b)) - Number(/nr|num|nummer/i.test(a)))[0];
  return { keys, nameKey, nrKey };
}

async function main() {
  log(`Dataset: ${DATASET_PAGE}`);

  // 1. Metadata: licence and resources.
  let licence = 'unknown';
  let licenceTitle = '';
  let geojsonUrl = FALLBACK_URL;
  let dataModified = null;
  if (process.env.SOURCE_URL) {
    geojsonUrl = process.env.SOURCE_URL;
    log('SOURCE_URL set — portal metadata skipped (dry run).');
  } else try {
    const meta = await getJson(`${PORTAL}/api/3/action/package_show?id=${DATASET_ID}`);
    const r = meta.result ?? {};
    licence = r.license_id ?? licence;
    licenceTitle = r.license_title ?? '';
    log(`Licence: ${licence}${licenceTitle ? ` (${licenceTitle})` : ''}`);
    log(`Metadata modified: ${r.metadata_modified ?? '?'}`);
    for (const res of r.resources ?? []) {
      log(`Resource: ${res.format ?? '?'} · ${res.name ?? ''} · last_modified ${res.last_modified ?? '?'} · ${res.url}`);
    }
    const gj = (r.resources ?? []).find((res) => /geojson/i.test(res.format ?? '') || /\.(geo)?json$/i.test(res.url ?? ''));
    if (gj?.url) {
      geojsonUrl = gj.url;
      dataModified = gj.last_modified ?? gj.created ?? null;
    }
  } catch (err) {
    log(`Metadata not available (${err.message}); using the known resource URL.`);
  }

  // 2. The boundaries.
  log(`GeoJSON: ${geojsonUrl}`);
  const fc = await getJson(geojsonUrl);
  const raw = (fc.features ?? []).filter((f) => f?.geometry && /Polygon$/.test(f.geometry.type));
  log(`Features: ${(fc.features ?? []).length} (polygonal: ${raw.length}) · crs: ${fc.crs?.properties?.name ?? 'none given'}`);
  if (!raw.length) {
    log('No polygonal features — nothing written.');
    finish(1);
  }
  const { keys, nameKey, nrKey } = pickKeys(raw);
  log(`Property keys: ${keys.join(', ')}`);
  for (const f of raw.slice(0, 3)) log(`  sample: ${JSON.stringify(f.properties)}`);
  log(`Chosen keys: name = ${nameKey ?? '—'}, nr = ${nrKey ?? '—'}`);
  if (!nameKey) {
    log('No property qualifies as the district name (strings with letters, enough distinct values) — rerun with NAME_KEY=<property>.');
    finish(1);
  }

  const first = firstPair(raw[0].geometry.coordinates);
  const isUtm = Math.abs(first[0]) > 1000 || Math.abs(first[1]) > 1000;
  log(`Coordinates: ${isUtm ? 'UTM metres (converted to WGS84)' : 'degrees (WGS84)'}, first pair ${JSON.stringify(first)}`);

  // One feature per district: features sharing a name become a MultiPolygon.
  const byName = new Map();
  for (const f of raw) {
    const name = String(f.properties[nameKey]).trim();
    const nr = nrKey ? String(f.properties[nrKey]).trim() : null;
    const entry = byName.get(name) ?? { nr, name, polys: [] };
    entry.polys.push(...ringsOf(f.geometry));
    byName.set(name, entry);
  }
  const merged = [...byName.values()].filter((e) => e.polys.length > 1).map((e) => e.name);
  log(`Districts: ${byName.size}${merged.length ? ` (merged from several features: ${merged.join(', ')})` : ''}`);

  const toWgs = (g) => (isUtm ? transformGeometry(g) : g);
  const geomOf = (polys) => (polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys });
  const original = {
    features: [...byName.values()].map((e) => ({ properties: { name: e.name }, geometry: toWgs(geomOf(e.polys)) })),
  };
  log(`Vertices (unsimplified): ${original.features.reduce((n, f) => n + vertexCount(f.geometry), 0)}`);

  // The committed snapshot's points: the yardstick for simplification.
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8'));
  const points = (snapshot.features ?? []).map((f) => f.geometry?.coordinates).filter(Array.isArray);
  const reference = points.map((p) => assignDistrict(p, original));
  const outside = points.filter((p) => !original.features.some((d) => containsPoint(d.geometry, p)));
  log(`Snapshot sites: ${points.length} · in no polygon: ${outside.length}`);
  for (const p of outside) {
    const nearest = Math.min(...original.features.map((d) => distanceToBoundaryM(d.geometry, p)));
    log(`  outside at ${JSON.stringify(p)}: nearest boundary ${nearest.toFixed(1)} m → ${assignDistrict(p, original) ?? 'null'}`);
  }
  log(`Unassigned (null): ${reference.filter((x) => x === null).length}`);

  // 3./4. Simplify in a metric frame; keep the coarsest tolerance that changes
  // no assignment and fits MAX_BYTES.
  const lat0 = isUtm ? 49 : first[1];
  const frame = metricFrame(isUtm, lat0);
  const candidates = [];
  for (const tol of TOLERANCES_M) {
    const features = [...byName.values()].map((e) => {
      const polys = e.polys
        .map((rings) => rings.map((ring) => simplifyRing(ring.map(frame.fwd), tol)))
        .map((rings) => rings.filter((ring, k) => k === 0 || ring.length >= 4));
      const metric = geomOf(polys);
      const wgs = isUtm ? transformGeometry(metric) : frame.inv(metric);
      const geometry = { type: wgs.type, coordinates: mapPairs(wgs.coordinates, ([x, y]) => [round6(x), round6(y)]) };
      const properties = e.nr !== null ? { nr: e.nr, name: e.name } : { name: e.name };
      return { type: 'Feature', properties, geometry };
    });
    features.sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'de'));
    const candidate = { features };
    const changed = points.filter((p, i) => assignDistrict(p, candidate) !== reference[i]).length;
    const header = {
      type: 'FeatureCollection',
      source: DATASET_PAGE,
      license: licence,
      ...(dataModified ? { dataModified } : {}),
      simplifiedM: tol,
    };
    const text =
      JSON.stringify(header).replace(/}$/, ',"features":[\n') + features.map((f) => JSON.stringify(f)).join(',\n') + '\n]}\n';
    const bytes = Buffer.byteLength(text);
    const vertices = features.reduce((n, f) => n + vertexCount(f.geometry), 0);
    log(`Tolerance ${tol} m: ${vertices} vertices, ${(bytes / 1024).toFixed(1)} KB, assignments changed: ${changed}`);
    candidates.push({ tol, text, bytes, changed });
  }
  // The finest qualifying tolerance; if none qualifies, the exact boundaries,
  // whatever the size.
  const chosen =
    candidates
      .filter((c) => c.tol >= MIN_TOLERANCE_M && c.changed === 0 && c.bytes <= MAX_BYTES)
      .sort((a, b) => a.tol - b.tol)[0] ?? candidates.find((c) => c.tol === 0);

  writeFileSync(OUT_FILE, chosen.text, 'utf8');
  log(`Written: data/districts.geojson — tolerance ${chosen.tol} m, ${(chosen.bytes / 1024).toFixed(1)} KB`);
  const counts = new Map();
  for (const d of reference) counts.set(d ?? '(none)', (counts.get(d ?? '(none)') ?? 0) + 1);
  log('Sites per district in the committed snapshot:');
  for (const [name, n] of [...counts].sort((a, b) => b[1] - a[1])) log(`  ${String(n).padStart(3)}  ${name}`);
  finish(0);
}

main().catch((err) => {
  log(`FAILED: ${err.stack ?? err.message}`);
  finish(1);
});
