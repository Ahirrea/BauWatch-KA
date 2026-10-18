// history.mjs — the daily history of the open-site counts (A-16, ADR-006).
//
// Pure helpers, build-side. build-data.mjs calls upsertHistory() in the same
// "real change" branch that writes the snapshot; the one-off backfill
// (backfill-history.mjs) runs historyEntry() over every committed snapshot.
//
// Only counts that the snapshot alone determines go in (A-16/E3). "Ends
// within 7 days" changes at midnight without a data change — recording it
// would need a write every day, a per-run-volatile value by another name.

import { berlinDate, summarize } from '../src/lib/stats.js';

/**
 * The history entry for a snapshot: its calendar day in Karlsruhe (from
 * `stand`, the time of the last real change — never the run time) and its
 * counts. Null for sample data and for a snapshot without a valid `stand`.
 * @param {{sample?: boolean, stand?: string, features?: object[]}} collection
 */
export function historyEntry(collection) {
  if (!collection || collection.sample === true) return null;
  const date = berlinDate(collection.stand);
  if (!date) return null;
  const { total, voll, teil, gering } = summarize(collection.features);
  return { date, total, voll, teil, gering };
}

/**
 * Replaces the entry of the same day, or adds one, and returns the history
 * sorted by date. The day's last snapshot wins (ADR-006). Malformed entries
 * from a damaged file are dropped rather than carried along.
 */
export function upsertHistory(entries, entry) {
  const valid = (Array.isArray(entries) ? entries : []).filter(
    (e) => e && typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date)
  );
  const out = entry ? valid.filter((e) => e.date !== entry.date).concat(entry) : valid;
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** One entry per line: a real change shows up as one changed or added line. */
export function serializeHistory(entries) {
  return entries.length ? `[\n${entries.map((e) => JSON.stringify(e)).join(',\n')}\n]\n` : '[]\n';
}
