// Testscript für die PWA-Artefakte (Anforderung A-3): Manifest, Icons, Service Worker.
// Ausführen: node scripts/test-pwa.mjs (Exit 0 = ok, 1 = Fehler)
//
// Reines Node, KEIN Netz, kein Browser. Der Test deckt genau die Fehler ab, die
// sich sonst erst auf dem Handy zeigen und dort still sind:
//   - ein absoluter Pfad (führender „/") → auf dem Sub-Pfad /BauWatch-KA/ tot
//   - ein Tippfehler in der SHELL-Liste → cache.addAll() scheitert komplett,
//     der Service Worker installiert sich nie, es gibt gar kein Offline
//   - eine in index.html verlinkte Datei, die nicht precacht ist → die klassische
//     Precache-Lücke: online alles gut, offline fehlt genau diese eine Datei

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}

const lies = (p) => readFileSync(join(ROOT, p), 'utf8');

// --- Manifest --------------------------------------------------------------

let manifest = null;
try {
  manifest = JSON.parse(lies('manifest.webmanifest'));
  check('manifest.webmanifest ist valides JSON', true);
} catch (err) {
  check('manifest.webmanifest ist valides JSON', false, err.message);
}

if (manifest) {
  for (const feld of [
    'name',
    'short_name',
    'description',
    'lang',
    'start_url',
    'scope',
    'display',
    'background_color',
    'theme_color',
    'icons',
  ]) {
    check(`Manifest hat Pflichtfeld „${feld}"`, manifest[feld] != null && manifest[feld] !== '');
  }

  check('display ist „standalone"', manifest.display === 'standalone');
  // Android kürzt das Label unter dem Icon bei ~12 Zeichen.
  check(
    'short_name ist kurz genug für den Startbildschirm (≤ 14 Zeichen)',
    typeof manifest.short_name === 'string' && manifest.short_name.length <= 14,
    `${manifest.short_name?.length} Zeichen`
  );

  const istRelativ = (p) => typeof p === 'string' && !p.startsWith('/') && !/^[a-z]+:/i.test(p);
  check('start_url ist relativ', istRelativ(manifest.start_url), manifest.start_url);
  check('scope ist relativ', istRelativ(manifest.scope), manifest.scope);

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  check('Manifest listet Icons', icons.length > 0);
  for (const icon of icons) {
    check(`Icon-Pfad ist relativ: ${icon.src}`, istRelativ(icon.src));
    const vorhanden = existsSync(join(ROOT, icon.src));
    check(`Icon-Datei existiert: ${icon.src}`, vorhanden);
    if (vorhanden) {
      const maße = pngMaße(join(ROOT, icon.src));
      check(
        `Icon ${icon.src} hat die angegebene Größe ${icon.sizes}`,
        maße && `${maße.w}x${maße.h}` === icon.sizes,
        maße ? `real ${maße.w}x${maße.h}` : 'kein lesbarer PNG-Header'
      );
    }
  }
  check(
    'mindestens ein Icon mit purpose „maskable"',
    icons.some((i) => String(i.purpose || '').split(/\s+/).includes('maskable'))
  );
  check(
    'Icon-Größen 192 und 512 vorhanden',
    ['192x192', '512x512'].every((s) => icons.some((i) => i.sizes === s))
  );
  check(
    'theme_color/background_color stammen aus den Farbvariablen',
    manifest.theme_color === '#1b4b73' && manifest.background_color === '#f7f7f5',
    `${manifest.theme_color} / ${manifest.background_color}`
  );
}

// PNG-Kopf lesen: 8 Byte Signatur, 4 Byte Länge, „IHDR", dann Breite/Höhe.
function pngMaße(pfad) {
  const buf = readFileSync(pfad);
  if (buf.length < 24 || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// --- Service Worker --------------------------------------------------------

const sw = lies('sw.js');

// Prüfungen sollen auf echten Code schauen, nicht auf die Kommentare, die ihn
// erklären (die nennen z. B. absichtlich das, was NICHT passieren darf).
const ohneKommentare = (s) => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

const cacheNamen = [...sw.matchAll(/const (CACHE_\w+) = '([^']+)'/g)];
check('sw.js definiert CACHE_SHELL und CACHE_DATA', cacheNamen.length === 2);
for (const [, konstante, wert] of cacheNamen) {
  check(`${konstante} trägt eine Version (…-vN)`, /-v\d+$/.test(wert), wert);
}

// Nicht-Ziele hart absichern: kein Push, keine Notifications, kein Sync.
for (const verboten of ['push', 'notificationclick', 'notificationclose', 'sync', 'periodicsync']) {
  check(
    `sw.js hat keinen „${verboten}"-Handler (Nicht-Ziel)`,
    !new RegExp(`addEventListener\\(\\s*['"\`]${verboten}['"\`]`).test(sw)
  );
}
check('sw.js ruft skipWaiting() nur nutzerausgelöst auf', !/^\s*self\.skipWaiting\(\)/m.test(sw));

// SHELL-Liste aus dem Quelltext lesen (der SW selbst ist nicht importierbar —
// klassisches Skript, das self/caches erwartet).
const shellBlock = sw.match(/const SHELL = \[([\s\S]*?)\];/);
check('sw.js enthält eine SHELL-Liste', !!shellBlock);
const SHELL = shellBlock ? [...shellBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
check('SHELL-Liste ist nicht leer', SHELL.length > 0);

// „./" ist der Navigations-Einstieg und liefert index.html aus.
const aufDatei = (eintrag) => (eintrag === './' ? 'index.html' : eintrag);

for (const eintrag of SHELL) {
  check(`SHELL-Eintrag ist relativ: ${eintrag}`, !eintrag.startsWith('/') && !/^[a-z]+:/i.test(eintrag));
  check(`SHELL-Eintrag existiert auf der Platte: ${eintrag}`, existsSync(join(ROOT, aufDatei(eintrag))));
}
check('SHELL-Liste hat keine Doppelten', new Set(SHELL).size === SHELL.length);
check('SHELL enthält den Navigations-Einstieg „./"', SHELL.includes('./'));

// --- Navigation ist pfadbewusst (ADR-002) ----------------------------------
// Bis A-4 war die App einseitig und navigationAntwort() beantwortete JEDE
// Navigation mit INDEX_URL. Mit einer zweiten HTML-Seite wird daraus ein
// stiller Fehler: installierte Clients bekämen unter …/impressum.html die
// Kartenseite zu sehen. Lokal fällt das nie auf (kein alter Cache), im Browser
// gibt es keine Meldung — deshalb hier statisch abgesichert.

const navFn = sw.match(/async function navigationAntwort\(request\)\s*\{([\s\S]*?)\n\}/);
check('sw.js hat eine navigationAntwort()', Boolean(navFn));
if (navFn) {
  const rumpf = ohneKommentare(navFn[1]);
  check(
    'navigationAntwort() schaut auf den angefragten Pfad (ADR-002)',
    /SHELL_PATHS/.test(rumpf) && /pathname/.test(rumpf)
  );
  const posShell = rumpf.indexOf('SHELL_PATHS');
  const posIndex = rumpf.indexOf('INDEX_URL');
  check(
    'navigationAntwort() prüft den Pfad VOR dem Rückfall auf INDEX_URL',
    posShell !== -1 && (posIndex === -1 || posShell < posIndex),
    'INDEX_URL zuerst = jede Navigation bekäme wieder index.html'
  );
}

// --- Precachete HTML-Seiten gegen die SHELL-Liste --------------------------
// Früher wurde hier nur index.html gescannt. Seit A-4 gibt es weitere Seiten;
// eine von ihnen referenzierte, nicht precachete Datei wäre genau dieselbe
// Precache-Lücke — online alles gut, offline fehlt sie.

const shellSet = new Set(SHELL.map(aufDatei));
const htmlSeiten = [...shellSet].filter((p) => p.endsWith('.html'));
check('SHELL enthält mindestens eine HTML-Seite', htmlSeiten.length > 0);
check('SHELL enthält die Rechtstexte (A-4)',
  ['impressum.html', 'datenschutz.html'].every((p) => shellSet.has(p)),
  [...shellSet].join(', '));

for (const seite of htmlSeiten) {
  if (!existsSync(join(ROOT, seite))) continue; // Existenz meldet schon die SHELL-Prüfung
  const html = lies(seite);

  // Alle lokalen href/src — Anker, externe Links und Daten-URLs raus.
  const referenzen = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => !p.startsWith('#') && !/^[a-z]+:/i.test(p) && !p.startsWith('//'));

  check(
    `${seite} referenziert nur relative lokale Pfade`,
    referenzen.every((p) => !p.startsWith('/')),
    referenzen.filter((p) => p.startsWith('/')).join(', ')
  );

  for (const ref of referenzen) {
    check(`aus ${seite} referenzierte Datei existiert: ${ref}`, existsSync(join(ROOT, ref)));
    // manifest.webmanifest, styles.css, app.js, leaflet, apple-touch-icon,
    // die Querverweise der Rechtstexte untereinander …
    check(`aus ${seite} referenzierte Datei ist precacht: ${ref}`, shellSet.has(ref));
  }

  check(`${seite} verlinkt das Manifest`, /<link[^>]+rel="manifest"[^>]+href="manifest\.webmanifest"/.test(html));
  check(
    `${seite} setzt theme-color für hell und dunkel`,
    /name="theme-color"[^>]*prefers-color-scheme: light/.test(html) &&
      /name="theme-color"[^>]*prefers-color-scheme: dark/.test(html)
  );
  check(`${seite} verlinkt ein apple-touch-icon`, /rel="apple-touch-icon"/.test(html));
}

// --- src/app.js gegen die SHELL-Liste --------------------------------------
// Die HTML-Prüfung oben findet keine ES-Modul-Importe. Ohne diese Prüfung könnte
// ein neuer Import in app.js offline stumm fehlen.

const app = lies('src/app.js');
const importe = [...app.matchAll(/from\s+'(\.\.?\/[^']+)'/g)].map((m) => m[1]);
check('src/app.js hat relative Importe (Absicherung greift)', importe.length > 0);
for (const spez of importe) {
  const pfad = posix.normalize(posix.join('src', spez));
  check(`Import aus app.js ist precacht: ${spez}`, shellSet.has(pfad), pfad);
}

// --- Registrierung ---------------------------------------------------------

// --- Zweiter Datenpfad: data/changelog.json (A-6, E7) ----------------------
// Die Regel „Daten: network-first, Shell: cache-first" verallgemeinert sich
// mechanisch auf eine kleine, explizite Menge — hier abgesichert, dass der
// Feed genau wie baustellen.geojson behandelt wird und NICHT als Shell-Datei
// (precacht, cache-first) endet, was ihn dauerhaft veraltet servieren würde.

check(
  'sw.js kennt data/changelog.json als zweiten Datenpfad (E7)',
  /new URL\('data\/changelog\.json', self\.location\)/.test(sw)
);
check(
  'data/changelog.json ist NICHT Teil der SHELL-Liste (es ist Daten, kein Shell-Asset)',
  !SHELL.includes('data/changelog.json')
);
{
  const fetchHandlerMatch = sw.match(/self\.addEventListener\('fetch'[\s\S]*$/);
  check('sw.js hat einen fetch-Handler (Absicherung greift)', Boolean(fetchHandlerMatch));
  const fetchHandler = fetchHandlerMatch ? ohneKommentare(fetchHandlerMatch[0]) : '';
  check(
    'beide Datenpfade (DATA_PATH, CHANGELOG_PATH) laufen über dieselbe network-first-Behandlung',
    /DATA_PATHS/.test(fetchHandler) && /datenAntwort\(request\)/.test(fetchHandler)
  );
  check(
    'DATA_PATHS enthält sowohl DATA_PATH als auch CHANGELOG_PATH',
    /new Set\(\[DATA_PATH, CHANGELOG_PATH\]\)/.test(sw)
  );
}

check("app.js registriert 'sw.js' relativ", /register\('sw\.js'\)/.test(app));
check('app.js registriert erst nach dem load-Event', /addEventListener\('load'/.test(app));
check("app.js prüft 'serviceWorker' in navigator", /'serviceWorker' in navigator/.test(app));
check('app.js liest den Offline-Header X-Bauwatch-Cache', /X-Bauwatch-Cache/.test(app));
check('sw.js setzt den Offline-Header X-Bauwatch-Cache', /X-Bauwatch-Cache/.test(sw));
// navigator.onLine ist für das Bedien-Angebot der Adresssuche richtig, für die
// Frische der Daten falsch (Captive Portals melden fälschlich „online"). Die
// Prüfung schaut nur auf echten Code, nicht auf die Kommentare, die das erklären.
check(
  'loadData() nutzt navigator.onLine nicht (Captive-Portal-Falle)',
  !/navigator\.onLine/.test(
    ohneKommentare(app.slice(app.indexOf('async function loadData'), app.indexOf('// --- Service Worker')))
  )
);

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle PWA-Tests bestanden.');
