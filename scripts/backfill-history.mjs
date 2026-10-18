// backfill-history.mjs — derives data/history.json from the Git history of
// data/baustellen.geojson (A-16/E8, ADR-006).
//
// Every commit of the snapshot is one real data change, so walking them in
// order and keeping each day's last snapshot reproduces exactly what the
// Action would have written, had it kept the history from the start.
//
// Run by hand, like render-icons.mjs, and outside npm test:
//   node scripts/backfill-history.mjs
// Run it again right before landing (ADR-006): the data Action keeps
// committing to main in the meantime, and a day between the backfill and the
// Action's first own write would otherwise be missing. test-history.mjs fails
// while the history is behind the snapshot, so this cannot be forgotten.

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { historyEntry, serializeHistory, upsertHistory } from './history.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = 'data/baustellen.geojson';
const OUT_FILE = join(ROOT, 'data', 'history.json');

const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 256 << 20 });

if (git('rev-parse', '--is-shallow-repository').trim() === 'true') {
  console.error('Shallow clone: the snapshot history is incomplete. Run `git fetch --unshallow` first.');
  process.exit(1);
}

// Oldest first, so that upsertHistory() lets each day's LAST snapshot win.
const hashes = git('log', '--reverse', '--format=%H', '--', SNAPSHOT).trim().split('\n').filter(Boolean);
let history = [];
let skipped = 0;
for (const hash of hashes) {
  let collection;
  try {
    collection = JSON.parse(git('show', `${hash}:${SNAPSHOT}`));
  } catch {
    skipped++; // the file did not exist or did not parse at that commit
    continue;
  }
  const entry = historyEntry(collection);
  if (!entry) {
    skipped++; // sample data, or no valid `stand`
    continue;
  }
  history = upsertHistory(history, entry);
}

writeFileSync(OUT_FILE, serializeHistory(history), 'utf8');

const DAY = 86400000;
const first = history[0]?.date;
const last = history.at(-1)?.date;
const span = first ? (Date.parse(last) - Date.parse(first)) / DAY + 1 : 0;
console.log(`${hashes.length} snapshot commits, ${skipped} skipped (sample, unparsable or without stand)`);
console.log(`${history.length} days written, ${first} … ${last} (${span} calendar days, ${span - history.length} without a change)`);
