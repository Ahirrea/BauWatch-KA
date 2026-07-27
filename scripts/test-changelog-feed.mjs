// Test script for the data/changelog.json artifact behind the "What's new?"
// feed (requirement A-6). Run: node scripts/test-changelog-feed.mjs
// (exit 0 = ok, 1 = failure)
//
// Pure Node, NO network, no browser. Covers:
//   1. changelogEntry() carries the same added/removed/changed content as
//      summaryMarkdown() for the same diff — no drift between data/CHANGELOG.md
//      and data/changelog.json (same anti-drift discipline as
//      test-attribution.mjs/test-rechtstexte.mjs).
//   2. A firstFill run collapses to one synthetic entry, not per-item noise.
//   3. pruneChangelogEntries() drops entries older than the 30-day window
//      and keeps the rest.
//   4. Entries are plain, well-formed JSON with no per-run-volatile fields.
//   5. build-data.mjs actually wires changelogEntry()/pruneChangelogEntries()
//      into the same real-change branch as prependChangelog() — a static
//      source check, since build-data.mjs needs network access to run
//      end-to-end and can't be exercised here.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  diffFeatures,
  summaryMarkdown,
  changelogEntry,
  pruneChangelogEntries,
  CHANGELOG_WINDOW_DAYS,
} from './diff-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}

const mk = (id, titel, bis, ampel = 'teil') => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [8.4, 49.0] },
  properties: {
    id,
    titel,
    bis,
    von: '2026-07-01',
    ampel,
    verursacher: 'X',
    info: null,
    verkehrsmittel: { fuss: false, rad: false, auto: true, oepnv: false },
  },
});

// --- 1. Content matches summaryMarkdown() 1:1 ------------------------------

const prev = [mk('A', 'Kaiserstr', '2026-07-25'), mk('B', 'Sophienstr', '2026-07-24'), mk('C', 'Durlacher', '2026-09-30')];
const next = [mk('A', 'Kaiserstr', '2026-07-25'), mk('C', 'Durlacher', '2026-10-15'), mk('D', 'Haid-Neu', '2026-08-15')];
const diff = diffFeatures(prev, next);
const stand = '2026-07-27T17:48:00.000Z';
const entry = changelogEntry(diff, stand, next.length);

check('changelogEntry keeps the real stand timestamp', entry.stand === stand);
check('changelogEntry is not marked firstFill', entry.firstFill === false);
check('changelogEntry lists the added title', entry.hinzugefuegt.includes('Haid-Neu'));
check('changelogEntry lists the removed title', entry.entfernt.includes('Sophienstr'));
check(
  'changelogEntry lists the changed title with its note',
  entry.geaendert.some((c) => c.titel === 'Durlacher' && c.changes.some((s) => s.includes('Ende')))
);

const md = summaryMarkdown(diff, next.length, 'Test');
check('added titles match summaryMarkdown 1:1', entry.hinzugefuegt.every((titel) => md.includes(titel)));
check('removed titles match summaryMarkdown 1:1', entry.entfernt.every((titel) => md.includes(titel)));
check('changed titles match summaryMarkdown 1:1', entry.geaendert.every((c) => md.includes(c.titel)));

// Unwatched-field change still gets a note, same fallback as summaryMarkdown.
const before = mk('A', 'X', '2026-07-25');
const after = { ...before, geometry: { type: 'Point', coordinates: [8.41, 49.01] } };
const coordDiff = diffFeatures([before], [after]);
const coordEntry = changelogEntry(coordDiff, stand, 1);
check(
  'unwatched-field change still gets a generic note (mirrors summaryMarkdown)',
  coordEntry.geaendert[0].changes.includes('sonstige Angaben aktualisiert')
);

// --- 2. firstFill collapses to one synthetic entry -------------------------

const firstFillEntry = changelogEntry(diff, stand, next.length, { firstFill: true });
check('firstFill entry is marked as such', firstFillEntry.firstFill === true);
check('firstFill entry carries the total count', firstFillEntry.total === next.length);
check(
  'firstFill entry has no per-item noise (added/removed/changed)',
  !('hinzugefuegt' in firstFillEntry) && !('entfernt' in firstFillEntry) && !('geaendert' in firstFillEntry)
);

// --- 3. 30-day pruning -------------------------------------------------------

const now = new Date('2026-07-27T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const recent = { stand: new Date(now.getTime() - 5 * DAY).toISOString(), firstFill: false, hinzugefuegt: [], entfernt: [], geaendert: [] };
const boundary = {
  stand: new Date(now.getTime() - (CHANGELOG_WINDOW_DAYS * DAY - 1000)).toISOString(),
  firstFill: false,
  hinzugefuegt: [],
  entfernt: [],
  geaendert: [],
};
const old = { stand: new Date(now.getTime() - 40 * DAY).toISOString(), firstFill: false, hinzugefuegt: [], entfernt: [], geaendert: [] };

const pruned = pruneChangelogEntries([recent, boundary, old], now);
check('30-day pruning keeps recent entries', pruned.includes(recent));
check('30-day pruning keeps entries right at the boundary', pruned.includes(boundary));
check('30-day pruning drops entries older than the window', !pruned.includes(old));
check('30-day pruning does not invent entries', pruned.length === 2);
check(
  'pruning drops entries with an unparsable stand instead of keeping them',
  pruneChangelogEntries([{ stand: 'not-a-date' }], now).length === 0
);

// --- 4. Well-formed JSON, no volatile fields --------------------------------

check(
  'changelog entries serialize to valid JSON',
  (() => {
    try {
      JSON.parse(JSON.stringify([entry, firstFillEntry, coordEntry]));
      return true;
    } catch {
      return false;
    }
  })()
);

const ALLOWED_KEYS = new Set(['stand', 'firstFill', 'total', 'hinzugefuegt', 'entfernt', 'geaendert']);
for (const [label, e] of [
  ['normal entry', entry],
  ['firstFill entry', firstFillEntry],
  ['unwatched-field entry', coordEntry],
]) {
  const unbekannt = Object.keys(e).filter((k) => !ALLOWED_KEYS.has(k));
  check(`${label} has no unexpected (volatile) fields`, unbekannt.length === 0, unbekannt.join(', '));
}

// --- 5. build-data.mjs wiring (static source check) -------------------------

const lies = (p) => readFileSync(join(ROOT, p), 'utf8');
const build = lies('scripts/build-data.mjs');

check(
  'build-data.mjs imports changelogEntry/pruneChangelogEntries from diff-data.mjs',
  /changelogEntry/.test(build) && /pruneChangelogEntries/.test(build)
);
check('build-data.mjs defines a data/changelog.json output path', /CHANGELOG_JSON_FILE/.test(build) && /changelog\.json/.test(build));

// Same invariant as CHANGELOG.md/QUALITY.md: written only in the branch that
// already writes on a real change (after prependChangelog(), same run),
// never in the no-change early-return branch above it.
const prependIdx = build.indexOf('prependChangelog(md)');
// The bootstrap-if-missing write in the no-change branch comes first in the
// file — search for the real-change write AFTER prependChangelog(md).
const changelogWriteIdx = prependIdx === -1 ? -1 : build.indexOf('writeAtomic(CHANGELOG_JSON_FILE', prependIdx);
check('build-data.mjs writes data/changelog.json (guard is active)', changelogWriteIdx !== -1);
check(
  'data/changelog.json is written in the same real-change branch as data/CHANGELOG.md, after prependChangelog()',
  prependIdx !== -1 && changelogWriteIdx > prependIdx
);

const noChangeBranch = build.slice(
  build.indexOf('if (prev && !prev.sample && !hasChanges(diff))'),
  build.indexOf('const collection = {')
);
check(
  'no-change branch does not run changelogEntry()/pruneChangelogEntries() (only bootstraps an empty file if missing)',
  !/changelogEntry\(/.test(noChangeBranch) && !/pruneChangelogEntries\(/.test(noChangeBranch)
);
check(
  'no-change branch bootstraps data/changelog.json as an empty array if missing (fresh-fork edge case)',
  /CHANGELOG_JSON_FILE/.test(noChangeBranch) && /\[\]/.test(noChangeBranch)
);

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll changelog-feed tests passed.');
