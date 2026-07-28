// Test script for the data/changelog.json artifact behind the "What's new?"
// feed (requirement A-6). Run: node scripts/test-changelog-feed.mjs
// (exit 0 = ok, 1 = failure)
//
// Pure Node, NO network, no browser. Covers:
//   1. changelogEntry() carries the added/removed/changed content of
//      summaryMarkdown() for the same diff — no drift between data/CHANGELOG.md
//      and data/changelog.json (same anti-drift discipline as
//      test-attribution.mjs/test-rechtstexte.mjs). Since #28 the parity is
//      *directional*: the one thing the Markdown keeps and the feed drops is
//      the generic "sonstige Angaben aktualisiert" note.
//   2. A firstFill run collapses to one synthetic entry, not per-item noise.
//   3. pruneChangelogEntries() drops entries older than the 30-day window
//      and keeps the rest.
//   4. Entries are plain, well-formed JSON with no per-run-volatile fields.
//   5. build-data.mjs actually wires changelogEntry()/pruneChangelogEntries()
//      into the same real-change branch as prependChangelog() — a static
//      source check, since build-data.mjs needs network access to run
//      end-to-end and can't be exercised here.
//   6. #28: generic-only changes never reach the feed — not from the writer
//      (changelogEntry / build-data.mjs) and not from the reader (src/lib/
//      changelog.js, which src/app.js applies to already-committed entries),
//      and a run left empty by that produces no bare timestamp heading.

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
import {
  GENERIC_CHANGE_NOTE,
  meaningfulChanges,
  cleanChangelogEntry,
  hasFeedContent,
  filterChangelogEntries,
} from '../src/lib/changelog.js';

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

// --- 1b. #28: the generic note is the one deliberate divergence -------------
// An unwatched-field change (here: coordinates only) still gets its generic note
// in data/CHANGELOG.md — it IS a real data change and belongs in the record —
// but says nothing to a resident, so it must not appear in the feed at all.
const before = mk('A', 'X', '2026-07-25');
const after = { ...before, geometry: { type: 'Point', coordinates: [8.41, 49.01] } };
const coordDiff = diffFeatures([before], [after]);
const coordEntry = changelogEntry(coordDiff, stand, 1);
check(
  'data/CHANGELOG.md keeps the generic note for an unwatched-field change',
  summaryMarkdown(coordDiff, 1, 'Test').includes(GENERIC_CHANGE_NOTE)
);
check(
  'changelogEntry drops a generic-only change instead of listing it',
  coordEntry.geaendert.length === 0
);
check(
  'the feed entry carries no generic note anywhere',
  !JSON.stringify(coordEntry).includes(GENERIC_CHANGE_NOTE)
);
check(
  'a run whose only change was generic has no feed content (no bare timestamp)',
  hasFeedContent(coordEntry) === false
);
check(
  'the same run still counts as a real change for the snapshot/CHANGELOG.md',
  coordDiff.changed.length === 1
);

// Mixed case: a real note next to the generic one keeps the case, drops the note.
const mixed = {
  stand,
  firstFill: false,
  hinzugefuegt: [],
  entfernt: [],
  geaendert: [
    { titel: 'Zentralhof', changes: ['Sperrgrad: teil → gering', GENERIC_CHANGE_NOTE] },
    { titel: 'Nur-Rauschen', changes: [GENERIC_CHANGE_NOTE] },
  ],
};
const mixedClean = cleanChangelogEntry(mixed);
check('meaningfulChanges strips only the generic note', JSON.stringify(meaningfulChanges(['a', GENERIC_CHANGE_NOTE, 'b'])) === JSON.stringify(['a', 'b']));
check('a case with a real note survives, without the generic note', mixedClean.geaendert.length === 1 && mixedClean.geaendert[0].titel === 'Zentralhof' && !mixedClean.geaendert[0].changes.includes(GENERIC_CHANGE_NOTE));
check('cleaning does not mutate the original entry', mixed.geaendert.length === 2 && mixed.geaendert[0].changes.length === 2);
check('an added/removed-only run stays in the feed', hasFeedContent(cleanChangelogEntry({ stand, firstFill: false, hinzugefuegt: ['Neu'], entfernt: [], geaendert: [{ titel: 'X', changes: [GENERIC_CHANGE_NOTE] }] })));
check('a firstFill entry passes cleaning untouched', hasFeedContent(cleanChangelogEntry(firstFillEntryProbe())) === true);
function firstFillEntryProbe() {
  return { stand, firstFill: true, total: 183 };
}

// Read path (what src/app.js applies to the already-committed 30-day tail).
const legacyFeed = [
  { stand, firstFill: false, hinzugefuegt: [], entfernt: [], geaendert: [{ titel: 'Goethestraße', changes: [GENERIC_CHANGE_NOTE] }] },
  mixed,
];
const filtered = filterChangelogEntries(legacyFeed);
check('filterChangelogEntries drops a run left empty by the filter', filtered.length === 1);
check('filterChangelogEntries keeps the run that still says something', filtered[0].geaendert[0].titel === 'Zentralhof');
check('filterChangelogEntries output is free of the generic note', !JSON.stringify(filtered).includes(GENERIC_CHANGE_NOTE));
check('filterChangelogEntries is idempotent', JSON.stringify(filterChangelogEntries(filtered)) === JSON.stringify(filtered));
check('filterChangelogEntries survives malformed entries', filterChangelogEntries([null, {}, { firstFill: false }]).length === 0);

// The committed feed itself must not carry generic notes any more.
const committedFeed = readFileSync(join(ROOT, 'data', 'changelog.json'), 'utf8');
check('data/changelog.json carries no generic-note entries', !committedFeed.includes(GENERIC_CHANGE_NOTE));

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

// --- 6. #28 wiring on both sides (static source checks) ---------------------

check(
  'build-data.mjs imports the feed filter from src/lib/changelog.js',
  /from '\.\.\/src\/lib\/changelog\.js'/.test(build) && /hasFeedContent/.test(build)
);
check(
  'build-data.mjs only prepends an entry that has feed content',
  /hasFeedContent\(changelogJsonEntry\)\s*\?/.test(build)
);

const app = lies('src/app.js');
check(
  'src/app.js imports filterChangelogEntries from src/lib/changelog.js',
  /import \{[^}]*filterChangelogEntries[^}]*\} from '\.\/lib\/changelog\.js'/.test(app)
);
check(
  'src/app.js runs the loaded feed through filterChangelogEntries()',
  /changelogEntries = filterChangelogEntries\(/.test(app)
);
check(
  'src/app.js does not carry its own copy of the generic-note literal',
  !app.includes(GENERIC_CHANGE_NOTE)
);

// src/lib/ hard constraint: pure, DOM-free, dependency-free (imported by both
// the Node build and the browser client).
const lib = lies('src/lib/changelog.js');
check(
  'src/lib/changelog.js stays DOM-free and import-free',
  !/\bdocument\b|\bwindow\b|^import /m.test(lib)
);

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll changelog-feed tests passed.');
