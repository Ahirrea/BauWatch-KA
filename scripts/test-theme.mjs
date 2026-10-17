// Test script for the colour-scheme switch (requirement A-8).
// Run: node scripts/test-theme.mjs (exit 0 = ok, 1 = failure)
//
// Pure Node, no network, no browser.
//
// Why its own test: the switch is spread across four files that each hold a
// copy of the same fact, and every copy goes stale silently — the page keeps
// looking fine in whichever scheme the person checking happens to use. Same
// drift logic as test-attribution.mjs and test-rechtstexte.mjs, applied to
// colours:
//
//   1. The dark palette exists TWICE in styles.css — once behind the
//      prefers-color-scheme media query (nobody picked anything), once behind
//      [data-theme="dark"] (somebody did). CSS can't share one declaration
//      block between the two, so they're compared here instead. A token
//      added to one and forgotten in the other means the explicit choice and
//      the system default drift into two different dark modes.
//   2. The no-flash inline script in index.html reads the same localStorage
//      key that app.js writes. Two different keys = the choice appears to be
//      forgotten on every reload, and only for a real visitor.
//   3. app.js's THEME_COLOR must match index.html's <meta name="theme-color">
//      pair, or the system bar ends up a different colour than the page.
//   4. The three toggle buttons must line up with the three values app.js
//      accepts, and every one of them must carry an accessible name — the
//      buttons are icon-only, a missing aria-label leaves a screen-reader
//      user with "◐".
//
// Token-vs-token WCAG contrast IS checked here (section 8) — two hex values
// need no layout engine, and the amber dot shipped at 2.35:1 in light mode for
// weeks because that math was left to eyeballs (BACKLOG #32). What stays a
// Playwright job is the question this file cannot answer: which palette
// actually WON on a rendered page (system setting vs. explicit toggle) — see
// the --amber pitfall in CLAUDE.md.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRINGS, LANGS } from '../src/lib/i18n.js';
import { clientModules } from './client-modules.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}

const lies = (p) => readFileSync(join(ROOT, p), 'utf8');
const css = lies('src/styles.css');
const index = lies('index.html');
// The constants (THEME_KEY, THEMES, THEME_COLOR) may live in any client module
// since A-14/E11 — read the whole graph, not just the entry file.
const app = clientModules().modules.map((m) => m.source).join('\n');
const datenschutz = lies('datenschutz.html');

// --- 1. The two dark palettes must stay identical ---------------------------

// Grabs the declaration block belonging to a selector. The blocks here hold no
// nested braces, so a non-greedy match up to the first '}' is enough.
function block(source, selector) {
  const i = source.indexOf(selector);
  if (i === -1) return null;
  const open = source.indexOf('{', i);
  const close = source.indexOf('}', open);
  if (open === -1 || close === -1) return null;
  return source.slice(open + 1, close);
}

// Custom properties only — ordinary declarations (color-scheme) live in their
// own rules on purpose, so this comparison sees nothing but colour values.
// Comments are stripped first: a comment naming a token ("statt --bg: …")
// would otherwise swallow the declaration that follows it — the light block's
// --chip went missing exactly that way when section 8 first read it.
function tokens(declarations) {
  const map = new Map();
  const ohneKommentare = declarations.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of ohneKommentare.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(m[1], m[2].trim().replace(/\s+/g, ' '));
  }
  return map;
}

const hellBlock = block(css, ':root {');
check('styles.css: heller :root-Block gefunden', Boolean(hellBlock));

const dunkelSystem = block(css, ':root:not([data-theme="light"])');
check(
  'styles.css: dunkle Palette hinter prefers-color-scheme gefunden',
  Boolean(dunkelSystem),
  ':root:not([data-theme="light"]) fehlt — ohne sie verliert jeder das Dunkelschema, der nie etwas gewählt hat'
);
const dunkelWahl = block(css, ':root[data-theme="dark"] {');
check(
  'styles.css: dunkle Palette hinter [data-theme="dark"] gefunden',
  Boolean(dunkelWahl),
  'ohne sie greift die ausdrückliche Wahl „dunkel" nicht'
);

// Der Media-Query-Block muss wirklich in einer prefers-color-scheme-Abfrage
// stecken — sonst gälte die dunkle Palette unbedingt.
check(
  'styles.css: die System-Palette steht in @media (prefers-color-scheme: dark)',
  /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\)/.test(css)
);

if (hellBlock && dunkelSystem && dunkelWahl) {
  const hell = tokens(hellBlock);
  const a = tokens(dunkelSystem);
  const b = tokens(dunkelWahl);

  check('dunkle Paletten enthalten Tokens (Absicherung greift)', a.size > 0 && b.size > 0);

  const nurA = [...a.keys()].filter((k) => !b.has(k));
  const nurB = [...b.keys()].filter((k) => !a.has(k));
  check(
    'beide dunklen Paletten definieren dieselben Tokens',
    nurA.length === 0 && nurB.length === 0,
    [
      nurA.length ? `nur in der System-Palette: ${nurA.join(', ')}` : '',
      nurB.length ? `nur in der Wahl-Palette: ${nurB.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  );

  const abweichend = [...a.keys()].filter((k) => b.has(k) && a.get(k) !== b.get(k));
  check(
    'beide dunklen Paletten setzen dieselben Werte',
    abweichend.length === 0,
    abweichend.map((k) => `${k}: ${a.get(k)} ≠ ${b.get(k)}`).join(' · ')
  );

  // Gegenprobe: die dunkle Palette überschreibt die hellen Tokens auch wirklich
  // (ein leerer oder zusammengestrichener Block würde oben sonst durchgehen).
  const ueberschrieben = [...a.keys()].filter((k) => hell.has(k) && hell.get(k) !== a.get(k));
  check(
    'die dunkle Palette überschreibt helle Tokens (Absicherung greift)',
    ueberschrieben.length >= 5,
    `${ueberschrieben.length} abweichende Tokens`
  );
}

// --- 2. color-scheme: die ausdrückliche Wahl muss das Schema festnageln -----
// Ohne das rendert der Browser sein eigenes Beiwerk (Eingabefeld, Scrollbalken)
// weiter nach der Systemvorgabe — hell gewählt, dunkles Feld.
check('styles.css: :root folgt per color-scheme der Systemvorgabe', /color-scheme:\s*light dark/.test(css));
for (const wahl of ['light', 'dark']) {
  check(
    `styles.css: [data-theme="${wahl}"] nagelt color-scheme auf ${wahl} fest`,
    new RegExp(`:root\\[data-theme="${wahl}"\\]\\s*\\{[^}]*color-scheme:\\s*${wahl}\\s*;`).test(css)
  );
}

// --- 3. Inline-Skript und app.js müssen denselben Schlüssel benutzen --------

const themeKeyApp = app.match(/const THEME_KEY = '([^']+)'/);
check('the client defines THEME_KEY', Boolean(themeKeyApp), 'const THEME_KEY = \'…\' nicht gefunden');

const inlineSkript = index.match(/<script>([\s\S]*?)<\/script>/);
check(
  'index.html hat das Inline-Skript für die Farbschema-Wahl',
  Boolean(inlineSkript) && /localStorage\.getItem/.test(inlineSkript[1]),
  'ohne es blitzt die helle Fassung auf, bevor app.js läuft'
);

if (themeKeyApp && inlineSkript) {
  const keysInline = [...inlineSkript[1].matchAll(/localStorage\.getItem\('([^']+)'\)/g)].map((m) => m[1]);
  check(
    'das Inline-Skript liest denselben Schlüssel, den der Client schreibt',
    keysInline.length === 1 && keysInline[0] === themeKeyApp[1],
    `index.html: ${keysInline.join(', ') || '—'} ≠ app.js: ${themeKeyApp[1]}`
  );
}

// Das Inline-Skript steht vor dem Stylesheet — danach käme es zu spät.
const posSkript = index.indexOf('<script>');
const posStyles = index.indexOf('href="src/styles.css"');
check(
  'das Inline-Skript steht vor src/styles.css',
  posSkript > -1 && posStyles > -1 && posSkript < posStyles
);

// Und es fasst nur das Attribut an — kein Nachladen, kein Schreiben.
if (inlineSkript) {
  check(
    'das Inline-Skript schreibt nichts in den Speicher',
    !/localStorage\.(setItem|removeItem)/.test(inlineSkript[1]),
    'die Wahl gehört in app.js, nicht in den Kopf der Seite'
  );
  check(
    'das Inline-Skript fängt einen blockierten Speicher ab',
    /try\s*\{/.test(inlineSkript[1]) && /catch/.test(inlineSkript[1]),
    'ein Wurf hier stoppt den Aufbau der Seite'
  );
}

// --- 4. theme-color: Systemleiste und Seite müssen dieselbe Farbe haben ----

const metas = [...index.matchAll(/<meta name="theme-color"[^>]*>/g)].map((m) => m[0]);
check('index.html hat zwei theme-color-Angaben', metas.length === 2, `${metas.length} gefunden`);

const metaFarben = new Map();
for (const meta of metas) {
  const scheme = meta.match(/data-scheme="(\w+)"/);
  const content = meta.match(/content="([^"]+)"/);
  check('jede theme-color-Angabe trägt data-scheme (app.js braucht es)', Boolean(scheme), meta);
  if (scheme && content) metaFarben.set(scheme[1], content[1]);
}

const themeColorBlock = app.match(/const THEME_COLOR = \{([^}]+)\}/);
check('the client defines THEME_COLOR', Boolean(themeColorBlock));
if (themeColorBlock) {
  const appFarben = new Map(
    [...themeColorBlock[1].matchAll(/(\w+):\s*'([^']+)'/g)].map((m) => [m[1], m[2]])
  );
  for (const scheme of ['light', 'dark']) {
    check(
      `THEME_COLOR.${scheme} deckt sich mit der theme-color-Angabe in index.html`,
      metaFarben.get(scheme) === appFarben.get(scheme),
      `index.html: ${metaFarben.get(scheme)} ≠ app.js: ${appFarben.get(scheme)}`
    );
  }
}

// --- 5. Die Knöpfe: Werte, Zustand, Namen ----------------------------------

const themesApp = app.match(/const THEMES = \[([^\]]+)\]/);
check('the client defines THEMES', Boolean(themesApp));
const erlaubt = themesApp ? [...themesApp[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

// Structure-agnostic since A-14: the toggle moved into the menu and its
// buttons got visible labels (E6), so the old match on a fixed nesting
// (`div[data-theme-toggle] > div > three icon buttons`) would have failed on
// layout rather than on meaning. What is checked is what the switch promises:
// one named group, the same values as THEMES, `system` first and preselected,
// and a translated accessible name on every button.
const gruppen = [...index.matchAll(/<(\w+)\s[^>]*data-theme-toggle[^>]*>/g)];
check('index.html hat genau eine Umschalter-Gruppe (data-theme-toggle)', gruppen.length === 1, `${gruppen.length}`);
const gruppe = gruppen[0];

if (gruppe && erlaubt.length) {
  check(
    'die Umschalter-Gruppe ist eine role="group" mit Namen',
    /role="group"/.test(gruppe[0]) && /aria-label(?:ledby)?="[^"]+"/.test(gruppe[0])
  );

  const knoepfe = [...index.matchAll(/<button\b[^>]*data-theme-value="[^"]+"[^>]*>[\s\S]*?<\/button>/g)];
  check('drei Knöpfe gefunden (Absicherung greift)', knoepfe.length === 3, `${knoepfe.length}`);
  check(
    'alle Knöpfe stehen nach dem Gruppen-Anfang',
    knoepfe.every((k) => k.index > gruppe.index)
  );

  const knopfWerte = knoepfe.map((k) => k[0].match(/data-theme-value="([^"]+)"/)[1]);
  check(
    'die Knöpfe deckeln sich mit THEMES im Client',
    knopfWerte.length === erlaubt.length && knopfWerte.every((w) => erlaubt.includes(w)),
    `index.html: ${knopfWerte.join(', ')} ≠ client: ${erlaubt.join(', ')}`
  );
  check('„Systemvorgabe folgen" steht als Erstes', knopfWerte[0] === 'system', knopfWerte[0]);

  const offeneTags = knoepfe.map((k) => k[0].slice(0, k[0].indexOf('>') + 1));
  const aktiv = offeneTags.filter((b) => /class="[^"]*is-active/.test(b));
  check('genau ein Knopf ist vorausgewählt', aktiv.length === 1, `${aktiv.length}`);
  check(
    'der vorausgewählte Knopf ist „system" (Voreinstellung ohne Wahl)',
    aktiv.length === 1 && /data-theme-value="system"/.test(aktiv[0])
  );
  check(
    'aria-pressed passt zur Vorauswahl',
    offeneTags.every((b) => /aria-pressed="(true|false)"/.test(b)) &&
      offeneTags.filter((b) => /aria-pressed="true"/.test(b)).length === 1
  );

  // Every button needs a name a screen reader can read out, in both
  // languages: either an aria-label translated via data-i18n-attr (the
  // icon-only form, glyph hidden), or visible text translated via data-i18n.
  for (const [i, k] of knoepfe.entries()) {
    const wert = knopfWerte[i];
    const tag = offeneTags[i];
    const sichtbar = k[0]
      .replace(/<[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\w+>/g, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    const perLabel = /aria-label="[^"]+"/.test(tag) && /data-i18n-attr="[^"]*aria-label:\w+/.test(tag);
    const perText = sichtbar.length > 0 && /data-i18n="\w+"/.test(k[0]);
    check(
      `Knopf „${wert}" hat einen übersetzten zugänglichen Namen`,
      perLabel || perText,
      'aria-label + data-i18n-attr, oder sichtbarer Text + data-i18n'
    );
  }
}

// --- 6. Die i18n-Schlüssel liegen in beiden Sprachen vor -------------------
// test-i18n.mjs prüft die Schlüssel aus index.html generisch; hier stehen sie
// namentlich, damit ein Umbenennen im Markup nicht unbemerkt beide Seiten
// verliert.
for (const key of ['themeToggleAriaLabel', 'themeSystem', 'themeLight', 'themeDark']) {
  for (const lang of LANGS) {
    check(`STRINGS.${lang}.${key} ist gesetzt`, typeof STRINGS[lang][key] === 'string' && STRINGS[lang][key].length > 0);
  }
}

// --- 7. Der Datenschutzhinweis nennt die möglichen Werte ------------------
// Dass der Schlüssel überhaupt genannt ist, prüft test-rechtstexte.mjs. Hier
// geht es um die Werte und um die Aussage, dass „system" nichts speichert —
// beides Behauptungen über den Code aus schreibeGespeichertesFarbschema().
const speicherAbschnitt =
  (datenschutz.match(/<h2>Speicherung auf Ihrem Gerät<\/h2>([\s\S]*?)(?=<h2>|$)/) || [])[1] || '';
check('Abschnitt „Speicherung auf Ihrem Gerät" gefunden (Absicherung greift)', speicherAbschnitt.length > 0);
for (const wert of ['light', 'dark', 'system']) {
  check(
    `datenschutz.html nennt den möglichen Wert „${wert}"`,
    speicherAbschnitt.includes(`<code>${wert}</code>`)
  );
}
check(
  'der Client speichert bei „system" wirklich nichts (deckt sich mit dem Hinweis)',
  /if \(theme === DEFAULT_THEME\) localStorage\.removeItem\(THEME_KEY\)/.test(app),
  'der Hinweis behauptet, ohne ausdrückliche Wahl werde nichts abgelegt'
);

// --- 8. Ampel-Punkte: 3:1 gegen die Flächen, auf denen sie liegen ----------
// Reine Token-Mathematik (BACKLOG #32): der Punkt (.dot) liegt in Listenkarte,
// Popup und Sperrgrad-Knopf auf --surface, in Badges auf --chip. 3:1 ist die
// Grenze aus WCAG 1.4.11 für grafische Objekte — der Punkt ist zwar aria-hidden
// und dupliziert nur das Wort daneben, aber unter 3:1 ist er im hellen Schema
// schlicht kaum zu sehen (amber lag bei 2,35:1, und im dunklen Schema fällt
// genau das nie auf). Absichtlich NUR die Punktfarben: --amber & Co. sind keine
// Textfarben (dafür bräuchte es 4,5:1), und das bleibt so.
function relativeLuminanz(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
function kontrast(a, b) {
  const [hellW, dunkelW] = [relativeLuminanz(a), relativeLuminanz(b)].sort((x, y) => y - x);
  return (hellW + 0.05) / (dunkelW + 0.05);
}

if (hellBlock && dunkelSystem) {
  const paletten = [
    ['hell', tokens(hellBlock)],
    ['dunkel', tokens(dunkelSystem)],
  ];
  for (const [schema, palette] of paletten) {
    for (const punkt of ['--red', '--amber', '--green']) {
      for (const flaeche of ['--surface', '--chip']) {
        const farbe = palette.get(punkt);
        const grund = palette.get(flaeche);
        const messbar = /^#[0-9a-f]{6}$/i.test(farbe || '') && /^#[0-9a-f]{6}$/i.test(grund || '');
        check(
          `${schema}: ${punkt} auf ${flaeche} ist als Hex-Paar messbar`,
          messbar,
          `${punkt}=${farbe} ${flaeche}=${grund} — kein 6-stelliges Hex, Kontrastprüfung liefe ins Leere`
        );
        if (!messbar) continue;
        const wert = kontrast(farbe, grund);
        check(
          `${schema}: ${punkt} (${farbe}) erreicht 3:1 auf ${flaeche} (${grund})`,
          wert >= 3,
          `${wert.toFixed(2)}:1 — als Punktfarbe zu schwach (WCAG 1.4.11-Grenze)`
        );
      }
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll colour-scheme tests passed.');
