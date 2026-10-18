// annotate-districts.mjs — writes `district` into every feature of the
// committed data/baustellen.geojson (A-17/E9).
//
// Why: `district` takes part in the diff signature. Without this step the
// first Action run after the release would see every case as changed and log
// 166 "sonstige Angaben aktualisiert" lines. With it, the build computes the
// same districts the file already holds, and nothing changes. The same
// pattern as #28's cleaned changelog.json: run the committed file through the
// build's own pure function, in the same commit.
//
// Run by hand: during implementation, and again right before landing, because
// the data Action keeps committing snapshots without districts to main until
// the code lands. test-districts.mjs fails while the snapshot is not
// annotated against the committed boundaries.
//   node scripts/annotate-districts.mjs
//
// `stand` stays as it is: adding a derived property is not a change of the
// city's data.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assignDistrict, loadDistrictsFile } from './districts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = join(ROOT, 'data', 'baustellen.geojson');
const districts = loadDistrictsFile(join(ROOT, 'data', 'districts.geojson'));
if (!districts) {
  console.error('data/districts.geojson missing or unreadable.');
  process.exit(1);
}

const collection = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
let assigned = 0;
for (const f of collection.features ?? []) {
  const district = assignDistrict(f.geometry?.coordinates, districts);
  if (district) assigned++;
  // Same key order as buildFeature(): `district` right after `area`.
  const props = {};
  for (const [k, v] of Object.entries(f.properties ?? {})) {
    if (k === 'district') continue;
    props[k] = v;
    if (k === 'area') props.district = district;
  }
  if (!('district' in props)) props.district = district;
  f.properties = props;
}
// Serialised exactly as build-data.mjs writes it.
writeFileSync(SNAPSHOT, JSON.stringify(collection) + '\n', 'utf8');
const total = (collection.features ?? []).length;
console.log(`${total} sites annotated: ${assigned} with a district, ${total - assigned} without.`);
