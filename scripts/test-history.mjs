// test-history.mjs — the daily history (A-16, ADR-006).
// Run: node scripts/test-history.mjs (exit 0 = ok, 1 = failure)
//
// Pure, no network, no browser. Covers the helpers the build and the backfill
// share (scripts/history.mjs), the browser-side helpers (src/lib/stats.js),
// the committed data/history.json, and the one trap a test can see from here:
// the workflow commits an explicit file list, and a history it does not list
// is never committed — silently.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { historyEntry, serializeHistory, upsertHistory } from './history.mjs';
import { berlinDate, changeOver, fillHistory, historyExtremes, summarize } from '../src/lib/stats.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}

// --- berlinDate: the calendar day in Karlsruhe -----------------------------
check('summer: 22:30 UTC is already the next day (CEST, UTC+2)', berlinDate('2026-10-17T22:30:00Z') === '2026-10-18');
check('summer: 21:59 UTC is still the same day', berlinDate('2026-10-17T21:59:00Z') === '2026-10-17');
check('winter: 23:30 UTC on New Year’s Eve is New Year (CET, UTC+1)', berlinDate('2026-12-31T23:30:00Z') === '2027-01-01');
check('winter: 22:59 UTC is still the same day', berlinDate('2026-12-31T22:59:00Z') === '2026-12-31');
check('the night the clocks go back: 00:30 UTC is 02:30 CEST, same day', berlinDate('2026-10-25T00:30:00Z') === '2026-10-25');
check('a Date object works like a string', berlinDate(new Date('2026-07-20T12:00:00Z')) === '2026-07-20');
check('an invalid timestamp gives null', berlinDate('kein Datum') === null && berlinDate(undefined) === null);

// --- historyEntry ----------------------------------------------------------
const f = (ampel) => ({ type: 'Feature', properties: { ampel }, geometry: { type: 'Point', coordinates: [8.4, 49] } });
const snap = (stand, features, extra = {}) => ({ type: 'FeatureCollection', stand, features, ...extra });
{
  const e = historyEntry(snap('2026-10-18T04:08:27.807Z', [f('voll'), f('teil'), f('teil'), f('gering')]));
  check(
    'historyEntry: the date from stand, the counts from the features',
    JSON.stringify(e) === JSON.stringify({ date: '2026-10-18', total: 4, voll: 1, teil: 2, gering: 1 }),
    JSON.stringify(e)
  );
  check('historyEntry: keys in a fixed order (stable file diffs)', Object.keys(e).join() === 'date,total,voll,teil,gering');
}
check('historyEntry: sample data is never counted', historyEntry(snap('2026-10-18T04:00:00Z', [f('voll')], { sample: true })) === null);
check('historyEntry: no stand → null', historyEntry(snap(undefined, [f('voll')])) === null);
check('historyEntry: an unknown Sperrgrad still counts toward total', historyEntry(snap('2026-10-18T04:00:00Z', [f('voll'), f(null)])).total === 2);

// --- upsertHistory ---------------------------------------------------------
{
  const a = { date: '2026-10-16', total: 1, voll: 0, teil: 1, gering: 0 };
  const b = { date: '2026-10-17', total: 2, voll: 1, teil: 1, gering: 0 };
  const b2 = { date: '2026-10-17', total: 3, voll: 1, teil: 2, gering: 0 };
  const c = { date: '2026-10-18', total: 4, voll: 2, teil: 2, gering: 0 };
  check('upsert: the same day is replaced (the last snapshot wins)', JSON.stringify(upsertHistory([a, b], b2)) === JSON.stringify([a, b2]));
  check('upsert: a new day is appended', JSON.stringify(upsertHistory([a, b], c)) === JSON.stringify([a, b, c]));
  check('upsert: the result is sorted by date', JSON.stringify(upsertHistory([c, a], b)) === JSON.stringify([a, b, c]));
  check('upsert: a missing file (no array) starts the history', JSON.stringify(upsertHistory(undefined, a)) === JSON.stringify([a]));
  check('upsert: malformed entries are dropped', JSON.stringify(upsertHistory([a, { date: 'gestern' }, null], c)) === JSON.stringify([a, c]));
  check('upsert: no entry (sample data) leaves the history as it was', JSON.stringify(upsertHistory([a, b], null)) === JSON.stringify([a, b]));
  const text = serializeHistory([a, b]);
  check('serialize: one entry per line, valid JSON', text.split('\n').length === 5 && JSON.parse(text).length === 2, JSON.stringify(text));
  check('serialize: an empty history is "[]"', serializeHistory([]) === '[]\n');
}

// --- browser-side helpers ---------------------------------------------------
{
  const rows = fillHistory(
    [
      { date: '2026-10-03', total: 7, voll: 2 },
      { date: '2026-10-01', total: 5, voll: 1 },
    ],
    '2026-10-05'
  );
  check('fill: one row per day from the first entry to today', rows.map((r) => r.date).join() === '2026-10-01,2026-10-02,2026-10-03,2026-10-04,2026-10-05');
  check('fill: a day without an entry carries the value forward', rows[1].total === 5 && rows[4].total === 7);
  check('fill: across a month boundary', fillHistory([{ date: '2026-07-31', total: 1 }], '2026-08-02').map((r) => r.date).join() === '2026-07-31,2026-08-01,2026-08-02');
  check('fill: today before the last entry keeps the entries', fillHistory([{ date: '2026-10-03', total: 1 }], '2026-10-01').length === 1);
  check('fill: nothing in, nothing out', fillHistory([], '2026-10-05').length === 0);
  const ext = historyExtremes(
    [
      { date: 'a', total: 3 },
      { date: 'b', total: 9 },
      { date: 'c', total: 3 },
      { date: 'd', total: 9 },
    ],
    'total'
  );
  check('extremes: a tie goes to the most recent day', ext.max.date === 'd' && ext.min.date === 'c', JSON.stringify(ext));
  const ch = changeOver(rows, 'total', 30);
  check('change: a series shorter than the span compares with its first day', ch.from.date === '2026-10-01' && ch.delta === 2 && ch.days === 4, JSON.stringify(ch));
  const ch2 = changeOver(rows, 'total', 2);
  check('change: two days back', ch2.from.date === '2026-10-03' && ch2.delta === 0 && ch2.days === 2, JSON.stringify(ch2));
}

// --- the committed data/history.json ---------------------------------------
{
  const history = JSON.parse(readFileSync(join(ROOT, 'data', 'history.json'), 'utf8'));
  const snapshot = JSON.parse(readFileSync(join(ROOT, 'data', 'baustellen.geojson'), 'utf8'));
  check('data/history.json is an array', Array.isArray(history));
  const dates = history.map((e) => e.date);
  check('dates are valid, ascending and unique', dates.every((d, i) => /^\d{4}-\d{2}-\d{2}$/.test(d) && (i === 0 || d > dates[i - 1])));
  check(
    'every day: voll + teil + gering = total',
    history.every((e) => e.voll + e.teil + e.gering === e.total && e.total >= 0),
    JSON.stringify(history.find((e) => e.voll + e.teil + e.gering !== e.total))
  );
  check('no day lies after the snapshot', !dates.length || dates.at(-1) <= berlinDate(snapshot.stand));
  // The history must not be behind the snapshot: after a rebase onto main's
  // newer data, this fails until the backfill is rerun (A-16/E8). After the
  // release, the Action writes both in the same run.
  if (!snapshot.sample) {
    const last = history.at(-1);
    const expected = { date: berlinDate(snapshot.stand), ...summarize(snapshot.features) };
    check(
      'the last day equals the committed snapshot (rerun backfill-history.mjs if not)',
      last && last.date === expected.date && last.total === expected.total && last.voll === expected.voll,
      `history ${JSON.stringify(last)} vs snapshot ${JSON.stringify(expected)}`
    );
  }
}

// --- the workflow commits the file ------------------------------------------
{
  const workflow = readFileSync(join(ROOT, '.github', 'workflows', 'update-data.yml'), 'utf8');
  const addLines = workflow.split('\n').filter((l) => /^\s*git add /.test(l));
  check(
    "update-data.yml's git add lists data/history.json (ADR-006)",
    addLines.some((l) => l.split(/\s+/).includes('data/history.json')),
    addLines.join(' | ')
  );
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll history tests passed.');
