// feed.mjs — the Atom feed of construction-site changes (A-2, amended
// 2026-10-18).
//
// One entry per update run, generated from the same entries as
// data/changelog.json and the app's "Neu" tab (amendment decisions 4 and 5):
// same 30-day window, same #28 filter, same firstFill collapse. So the feed,
// the tab and data/CHANGELOG.md can never disagree — feed ⊆ changelog.json ⊆
// CHANGELOG.md.
//
// Pure and dependency-free, build-side only (decision 6): nothing in the
// browser renders Atom. Every identity and timestamp derives from `stand`,
// the time of the real change, never from the run (decision 9) — two
// generations from the same entries are byte-identical.
//
// Run directly, it regenerates feeds/alle.xml from the committed
// data/changelog.json (bootstrap, decision 11; and the drift check in
// test-feed.mjs uses the same path):
//   node scripts/feed.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { filterChangelogEntries } from '../src/lib/changelog.js';

/** The live site; Atom needs absolute links (decision 9). */
export const SITE_URL = 'https://ahirrea.github.io/BauWatch-KA/';
/** The feed's path below SITE_URL — a public contract once subscribed. */
export const FEED_PATH = 'feeds/alle.xml';
// Tag URIs (RFC 4151): identities that survive a move to another domain.
const TAG = 'tag:ahirrea.github.io,2026:BauWatch-KA/changes';

const xml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Items are title strings; since A-17/E10 they may be { titel, district }.
// Both shapes are read during the 30-day window.
const titleOf = (item) => (typeof item === 'string' ? item : (item?.titel ?? ''));
const withDistrict = (item, html) => {
  const district = typeof item === 'object' && item ? item.district : null;
  return district ? `${html} (${xml(district)})` : html;
};

const WHEN = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "18.10.2026, 06:08 — 1 neu, 2 entfernt" (Karlsruhe time). */
export function entryTitle(entry) {
  const when = WHEN.format(new Date(entry.stand));
  if (entry.firstFill) return `${when} — Erstbefüllung: ${entry.total} Baustellen`;
  const parts = [
    [(entry.hinzugefuegt ?? []).length, 'neu'],
    [(entry.entfernt ?? []).length, 'entfernt'],
    [(entry.geaendert ?? []).length, 'geändert'],
  ]
    .filter(([n]) => n > 0)
    .map(([n, word]) => `${n} ${word}`);
  return `${when} — ${parts.join(', ')}`;
}

/** The entry's list as HTML — the same lines as the "Neu" tab. */
export function entryHtml(entry) {
  if (entry.firstFill) return `<p>🎉 Erstbefüllung: ${xml(entry.total)} Baustellen.</p>`;
  const items = [
    ...(entry.hinzugefuegt ?? []).map((it) => `<li>➕ ${withDistrict(it, `<strong>${xml(titleOf(it))}</strong>`)}</li>`),
    ...(entry.entfernt ?? []).map((it) => `<li>➖ ${withDistrict(it, `<s>${xml(titleOf(it))}</s>`)}</li>`),
    ...(entry.geaendert ?? []).map(
      (c) => `<li>✏️ ${withDistrict(c, xml(titleOf(c)))} — ${xml((c.changes ?? []).join('; '))}</li>`
    ),
  ];
  return `<ul>${items.join('')}</ul>`;
}

/**
 * The whole feed. `entries` newest first, as in changelog.json; `updated`
 * falls back to the snapshot's stand when the window is empty.
 * @param {Array<object>} entries
 * @param {{ attribution: string, fallbackUpdated: string }} options
 */
export function renderAtomFeed(entries, { attribution, fallbackUpdated }) {
  const updated = entries[0]?.stand ?? fallbackUpdated;
  const body = entries
    .map(
      (e) => `  <entry>
    <id>${TAG}/${xml(e.stand)}</id>
    <title>${xml(entryTitle(e))}</title>
    <updated>${xml(e.stand)}</updated>
    <link rel="alternate" type="text/html" href="${SITE_URL}"/>
    <content type="html">${xml(entryHtml(e))}</content>
  </entry>
`
    )
    .join('');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="de">
  <title>Wo wird gebaut? – Baustellen-Änderungen in Karlsruhe</title>
  <subtitle>Neue, geänderte und entfernte Baustellen der letzten 30 Tage</subtitle>
  <id>${TAG}</id>
  <link rel="self" type="application/atom+xml" href="${SITE_URL}${FEED_PATH}"/>
  <link rel="alternate" type="text/html" href="${SITE_URL}"/>
  <icon>${SITE_URL}icons/icon-192.png</icon>
  <updated>${xml(updated)}</updated>
  <author><name>BauWatch-KA</name></author>
  <rights>${xml(attribution)}</rights>
${body}</feed>
`;
}

/** Regenerates feeds/alle.xml from the committed changelog.json. */
export async function regenerateFeed(root) {
  const { ATTRIBUTION } = await import('./build-data.mjs');
  const entries = filterChangelogEntries(JSON.parse(readFileSync(join(root, 'data', 'changelog.json'), 'utf8')));
  const snapshot = JSON.parse(readFileSync(join(root, 'data', 'baustellen.geojson'), 'utf8'));
  return renderAtomFeed(entries, { attribution: ATTRIBUTION, fallbackUpdated: snapshot.stand });
}

// No top-level await here: build-data.mjs imports this module, so awaiting
// its import while this module is still evaluating would deadlock the cycle.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const out = join(root, FEED_PATH);
  regenerateFeed(root).then((text) => {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, text, 'utf8');
    console.log(`${FEED_PATH} regenerated from data/changelog.json.`);
  });
}
