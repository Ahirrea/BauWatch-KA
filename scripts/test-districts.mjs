// test-districts.mjs — districts per construction site (A-17, ADR-007).
// Run: node scripts/test-districts.mjs (exit 0 = ok, 1 = failure)
//
// Pure, no network. Point-in-polygon on hand-made fixtures (holes,
// multipolygons, edges, the 100 m fallback); the committed boundaries file;
// the committed snapshot annotated against it (A-17/E9); the build's wiring;
// and the item shape the changelog carries since E10.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEAREST_MAX_M, assignDistrict, containsPoint, distanceToBoundaryM, loadDistrictsFile } from './districts.mjs';
import { changelogEntry, diffFeatures } from './diff-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let failed = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}

// --- point-in-polygon ---------------------------------------------------------
// Two squares side by side around 8.40/49.00 (0.01° ≈ 730 m east, 1.1 km north),
// the western one with a hole; a two-part district further east.
const sq = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const districts = {
  features: [
    { properties: { name: 'West' }, geometry: { type: 'Polygon', coordinates: [sq(8.39, 49.0, 8.4, 49.01), sq(8.393, 49.003, 8.397, 49.007)] } },
    { properties: { name: 'Ost' }, geometry: { type: 'Polygon', coordinates: [sq(8.4, 49.0, 8.41, 49.01)] } },
    {
      properties: { name: 'Zweiteilig' },
      geometry: { type: 'MultiPolygon', coordinates: [[sq(8.42, 49.0, 8.43, 49.01)], [sq(8.44, 49.0, 8.45, 49.01)]] },
    },
  ],
};
check('a point inside the outer ring', assignDistrict([8.391, 49.001], districts) === 'West');
check('a point in the hole is not in that district', !containsPoint(districts.features[0].geometry, [8.395, 49.005]));
check('the second part of a multipolygon counts', assignDistrict([8.445, 49.005], districts) === 'Zweiteilig');
check('a point on the shared edge lands in exactly one district', ['West', 'Ost'].includes(assignDistrict([8.4, 49.005], districts)));
{
  // 0.0005° east of the last polygon ≈ 37 m: the fallback takes it.
  const near = [8.4505, 49.005];
  const m = distanceToBoundaryM(districts.features[2].geometry, near);
  check('distance to the boundary in metres (≈ 37 m)', m > 30 && m < 45, m.toFixed(1));
  check(`a point within ${NEAREST_MAX_M} m of a district gets it`, assignDistrict(near, districts) === 'Zweiteilig');
  check('a point far from every district gets null', assignDistrict([8.6, 49.2], districts) === null);
}
check('no districts → null, never a crash', assignDistrict([8.4, 49.0], null) === null && assignDistrict(undefined, districts) === null);
check('a missing boundaries file loads as null', loadDistrictsFile(join(ROOT, 'data', 'gibt-es-nicht.geojson')) === null);

// --- the committed boundaries ---------------------------------------------------
const committed = loadDistrictsFile(join(ROOT, 'data', 'districts.geojson'));
check('data/districts.geojson loads', Boolean(committed));
if (committed) {
  const names = committed.features.map((f) => f.properties?.name);
  check('27 districts', committed.features.length === 27, String(committed.features.length));
  check('names are unique strings', new Set(names).size === names.length && names.every((n) => typeof n === 'string' && n));
  check('every district has a number', committed.features.every((f) => /^\d+$/.test(f.properties?.nr ?? '')));
  check('only polygons', committed.features.every((f) => /Polygon$/.test(f.geometry?.type)));
  const coords = JSON.stringify(committed.features.map((f) => f.geometry.coordinates)).match(/-?\d+\.\d+/g).map(Number);
  const lons = coords.filter((_, i) => i % 2 === 0);
  const lats = coords.filter((_, i) => i % 2 === 1);
  check(
    'coordinates are WGS84 around Karlsruhe',
    Math.min(...lons) > 8.2 && Math.max(...lons) < 8.6 && Math.min(...lats) > 48.9 && Math.max(...lats) < 49.2,
    `${Math.min(...lons)}–${Math.max(...lons)} / ${Math.min(...lats)}–${Math.max(...lats)}`
  );
  check('the file says where it comes from and how it was simplified', /transparenz\.karlsruhe\.de/.test(committed.source ?? '') && typeof committed.simplifiedM === 'number');

  // --- the committed snapshot, annotated against these boundaries (E9) -------
  const snapshot = JSON.parse(read('data/baustellen.geojson'));
  if (!snapshot.sample) {
    const missing = snapshot.features.filter((f) => !('district' in (f.properties ?? {})));
    check(
      'every site in the snapshot carries `district` (rerun annotate-districts.mjs if not)',
      missing.length === 0,
      `${missing.length} without the key`
    );
    const stale = snapshot.features.filter((f) => 'district' in f.properties && f.properties.district !== assignDistrict(f.geometry.coordinates, committed));
    check(
      "every site's district equals what the build computes — no change on the next run",
      stale.length === 0,
      stale.slice(0, 3).map((f) => `${f.properties.titel}: ${f.properties.district}`).join('; ')
    );
    // An observation, not a defect (A-17/E2 allows null): printed, never failed
    // on — a site outside every district must not turn the suite red. 0 of 166
    // on 2026-10-18 (A-17's implementation record).
    const nulls = snapshot.features.filter((f) => f.properties.district === null).length;
    console.log(`[INFO] sites without a district in the snapshot: ${nulls}`);
  }
}

// --- the build's wiring -----------------------------------------------------------
{
  const build = read('scripts/build-data.mjs');
  check('buildFeature assigns the district from the point', /district: districts \? assignDistrict\(coordinates, districts\) : null/.test(build));
  check('the build loads the committed boundaries, never fetches them', /loadDistrictsFile\(DISTRICTS_FILE\)/.test(build) && !/stadtteile\.json/.test(build));
  const workflow = read('.github/workflows/update-data.yml');
  check(
    "the regular workflow never rewrites the boundaries (ADR-007)",
    !/districts\.geojson|fetch-districts/.test(workflow)
  );
}

// --- the changelog item shape since E10 --------------------------------------------
{
  const f = (id, titel, district, bis = '2026-12-31') => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [8.4, 49.0] },
    properties: { id, titel, bis, ampel: 'teil', district },
  });
  const prev = [f('A', 'Alt', 'Durlach'), f('B', 'Bleibt', 'Oststadt')];
  const next = [f('B', 'Bleibt', 'Oststadt', '2027-01-31'), f('C', 'Neu', 'Mühlburg')];
  const entry = changelogEntry(diffFeatures(prev, next), '2026-10-18T04:00:00.000Z', next.length);
  check('added items carry the district of the new snapshot', JSON.stringify(entry.hinzugefuegt) === JSON.stringify([{ titel: 'Neu', district: 'Mühlburg' }]));
  check('removed items carry the district of the previous snapshot', JSON.stringify(entry.entfernt) === JSON.stringify([{ titel: 'Alt', district: 'Durlach' }]));
  check('changed items carry title, district and the notes', entry.geaendert[0]?.titel === 'Bleibt' && entry.geaendert[0]?.district === 'Oststadt' && entry.geaendert[0]?.changes.length > 0);
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll district tests passed.');
