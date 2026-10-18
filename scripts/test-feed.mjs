// test-feed.mjs — the Atom feed (A-2, amended 2026-10-18).
// Run: node scripts/test-feed.mjs (exit 0 = ok, 1 = failure)
//
// Pure, no network. Checks the generator (well-formed Atom, identities from
// `stand` only, escaping, the entry title), the committed feeds/alle.xml
// against a fresh generation from the committed changelog.json (drift), and
// the places the feed has to be wired into: the workflow's git add, the
// discovery link, and the service worker leaving it alone.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEED_PATH, SITE_URL, entryHtml, entryTitle, regenerateFeed, renderAtomFeed } from './feed.mjs';
import { filterChangelogEntries } from '../src/lib/changelog.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let failed = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}

// A small well-formedness check, enough for what the generator emits: tags
// balance, one root, and every & in text or attributes starts an entity.
function wellFormed(text) {
  const body = text.replace(/^<\?xml[^?]*\?>\s*/, '');
  const stack = [];
  let roots = 0;
  const tagRe = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>/g;
  let last = 0;
  let m;
  const textOk = (t) => !/[<>]/.test(t) && !/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(t);
  while ((m = tagRe.exec(body))) {
    const between = body.slice(last, m.index);
    if (!textOk(between)) return `bad text before <${m[2]}>: ${JSON.stringify(between.slice(0, 60))}`;
    if (!textOk(m[3].replace(/"/g, ''))) return `bad attribute in <${m[2]}>`;
    last = tagRe.lastIndex;
    if (m[1]) {
      if (stack.pop() !== m[2]) return `unbalanced </${m[2]}>`;
    } else if (!m[4]) {
      if (!stack.length) roots++;
      stack.push(m[2]);
    }
  }
  if (body.slice(last).trim()) return 'text after the root';
  if (stack.length) return `unclosed <${stack.at(-1)}>`;
  return roots === 1 ? true : `${roots} roots`;
}
const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const STAND_A = '2026-10-18T04:08:27.807Z';
const STAND_B = '2026-10-16T22:43:42.249Z';
const entries = [
  { stand: STAND_A, firstFill: false, hinzugefuegt: ['B36 Ausfahrt & Rampe <Nord>'], entfernt: ['Alte "Straße"', 'Zweite'], geaendert: [] },
  { stand: STAND_B, firstFill: false, hinzugefuegt: [], entfernt: [], geaendert: [{ titel: 'Durlacher Allee', changes: ['Ende: 01.10.2026 → 31.10.2026'] }] },
];
const opts = { attribution: 'Datensatz „Baustellen", Stadt Karlsruhe, Lizenz CC-BY 4.0', fallbackUpdated: '2026-10-01T00:00:00.000Z' };
const feed = renderAtomFeed(entries, opts);

// --- the generator ----------------------------------------------------------
check('well-formed XML', wellFormed(feed) === true, String(wellFormed(feed)));
check('Atom namespace and German content', /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom" xml:lang="de">/.test(feed));
check('one <entry> per changelog entry', (feed.match(/<entry>/g) ?? []).length === entries.length);
check(
  'every entry has id, title, updated, link and content',
  feed.split('<entry>').slice(1).every((e) => ['<id>', '<title>', '<updated>', '<link ', '<content type="html">'].every((t) => e.includes(t)))
);
check('entry ids are tag URIs from stand', feed.includes(`<id>tag:ahirrea.github.io,2026:BauWatch-KA/changes/${STAND_A}</id>`));
check('entry updated = stand', feed.includes(`<updated>${STAND_B}</updated>`));
check('feed updated = the newest entry', feed.indexOf(`<updated>${STAND_A}</updated>`) < feed.indexOf('<entry>'));
check('the same input gives the same bytes (no run time anywhere)', renderAtomFeed(entries, opts) === feed);
check('self link is absolute', feed.includes(`<link rel="self" type="application/atom+xml" href="${SITE_URL}${FEED_PATH}"/>`));
check('rights carry the attribution word for word', unescape(feed.match(/<rights>([^<]*)<\/rights>/)?.[1] ?? '') === opts.attribution);
check('entry title: Karlsruhe time and counts', entryTitle(entries[0]) === '18.10.2026, 06:08 — 1 neu, 2 entfernt', entryTitle(entries[0]));
check('entry title for a changed-only run', entryTitle(entries[1]) === '17.10.2026, 00:43 — 1 geändert', entryTitle(entries[1]));
check('first fill collapses to one line', entryTitle({ stand: STAND_A, firstFill: true, total: 166 }).endsWith('Erstbefüllung: 166 Baustellen'));
{
  const content = unescape(feed.match(/<content type="html">([^<]*)<\/content>/)?.[1] ?? '');
  check('titles are escaped inside the HTML content', content.includes('B36 Ausfahrt &amp; Rampe &lt;Nord&gt;') && content.includes('Alte &quot;Straße&quot;'), content);
  check('the HTML mirrors the "Neu" tab (➕ strong, ➖ struck)', content.includes('➕ <strong>') && content.includes('➖ <s>'), content);
}
check(
  'items with a district name it after the title (A-17/E10)',
  entryHtml({ hinzugefuegt: [{ titel: 'Pfinztalstraße', district: 'Durlach' }], entfernt: ['Ohne'], geaendert: [] }) ===
    '<ul><li>➕ <strong>Pfinztalstraße</strong> (Durlach)</li><li>➖ <s>Ohne</s></li></ul>'
);
{
  const empty = renderAtomFeed([], opts);
  check('an empty window is a valid feed without entries', wellFormed(empty) === true && !empty.includes('<entry>'));
  check('an empty window takes updated from the snapshot', empty.includes(`<updated>${opts.fallbackUpdated}</updated>`));
}

// --- the committed feed -------------------------------------------------------
{
  const committed = read(FEED_PATH);
  check('feeds/alle.xml is well-formed', wellFormed(committed) === true, String(wellFormed(committed)));
  check('feeds/alle.xml equals a fresh generation from changelog.json (no drift)', committed === (await regenerateFeed(ROOT)));
  const stands = filterChangelogEntries(JSON.parse(read('data/changelog.json'))).map((e) => e.stand);
  const ids = [...committed.matchAll(/<id>tag:[^<]*\/changes\/([^<]+)<\/id>/g)].map((m) => m[1]);
  check('every feed entry is a changelog.json entry (feed ⊆ changelog.json)', ids.length === stands.length && ids.every((id, i) => id === stands[i]), `${ids.length} vs ${stands.length}`);
}

// --- wiring -------------------------------------------------------------------
{
  const addLines = read('.github/workflows/update-data.yml').split('\n').filter((l) => /^\s*git add /.test(l));
  check("update-data.yml's git add lists feeds/alle.xml (ADR-006's trap)", addLines.some((l) => l.split(/\s+/).includes(FEED_PATH)), addLines.join(' | '));
  const html = read('index.html');
  check(
    'index.html carries the discovery link',
    /<link rel="alternate" type="application\/atom\+xml" title="[^"]+" href="feeds\/alle\.xml" \/>/.test(html)
  );
  check('the menu and the "Neu" tab link the feed', /data-i18n="menuFeed"/.test(html) && /data-i18n="whatsNewSubscribe"/.test(html));
  check('the service worker leaves the feed alone (no shell, no data path)', !read('sw.js').includes('feeds/'));
  check('build-data.mjs writes the feed in the real-change branch', /writeAtomic\(FEED_FILE, renderAtomFeed\(changelogJson/.test(read('scripts/build-data.mjs')));
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll feed tests passed.');
