// changelog.js — what the "What's new?" feed is allowed to show (A-6, #28).
//
// Pure, DOM-free, dependency-free — imported by BOTH sides, like transform.js /
// classify.js: `scripts/diff-data.mjs` uses it when writing
// `data/changelog.json`, `src/app.js` uses it when rendering the feed.
//
// Why both sides: the generic note is a single string literal, and it would
// otherwise exist twice (once in the writer's filter, once in the reader's).
// Keeping it here also means already-committed entries carrying the note — the
// feed's 30-day tail, or a copy an installed service worker still holds — get
// cleaned on read instead of lingering for a month.

/**
 * The fallback note `summaryMarkdown()`/`changelogEntry()` fall back to when a
 * case changed only in fields outside WATCH_FIELDS (coordinates, `art`, mode of
 * transport). Verbatim German, like every other quoted piece of the raw dataset.
 */
export const GENERIC_CHANGE_NOTE = 'sonstige Angaben aktualisiert';

/**
 * Drops the generic note from a change list. A case whose *only* note is the
 * generic one has nothing to tell a resident ("something about this site is
 * different, we can't say what") and therefore doesn't belong in the feed —
 * `data/CHANGELOG.md` keeps it, since there it's a record of a real data change.
 * @param {string[]} changes
 * @returns {string[]} the notes worth showing
 */
export function meaningfulChanges(changes = []) {
  return changes.filter((note) => note !== GENERIC_CHANGE_NOTE);
}

/**
 * One feed entry (a single Action run), with generic-only changes removed.
 * `firstFill` entries pass through untouched — they carry no per-case list.
 * @param {object} entry
 * @returns {object} a new entry, never the original
 */
export function cleanChangelogEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  if (entry.firstFill) return { ...entry };
  const geaendert = (Array.isArray(entry.geaendert) ? entry.geaendert : [])
    .map((c) => ({ ...c, changes: meaningfulChanges(c && c.changes) }))
    .filter((c) => c.changes.length > 0);
  return { ...entry, geaendert };
}

/**
 * Does an entry still say anything after cleaning? A run whose only change was
 * a generic-note one comes out empty — showing it would leave a bare timestamp
 * heading with an empty list under it.
 * @param {object} entry
 * @returns {boolean}
 */
export function hasFeedContent(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (entry.firstFill) return true;
  return (
    (entry.hinzugefuegt || []).length > 0 ||
    (entry.entfernt || []).length > 0 ||
    (entry.geaendert || []).length > 0
  );
}

/**
 * Read path for the feed: cleans every entry and drops the ones left empty.
 * Idempotent — entries written by a current build are already clean and pass
 * through unchanged.
 * @param {object[]} entries
 * @returns {object[]}
 */
export function filterChangelogEntries(entries = []) {
  return entries.map(cleanChangelogEntry).filter(hasFeedContent);
}
