// sw.js — Service Worker für „Wo wird gebaut?" (Anforderung A-3).
//
// Klassisches Skript, bewusst kein `type: 'module'` (in Safari noch löchrig) und
// bewusst ohne Build-Toolchain (kein Workbox) — die Precache-Liste ist von Hand
// gepflegt, weil der Asset-Satz klein und unversioniert ist.
//
// ALLE Pfade relativ: die Seite liegt unter https://<user>.github.io/BauWatch-KA/.
// Ein einziger führender „/" würde auf den github.io-Root zeigen und die
// installierte App still unbenutzbar machen.
//
// ►► WARTUNGSPFLICHT ◄◄
// Ändert sich EINE Datei aus SHELL (index.html, impressum.html,
// datenschutz.html, styles.css, app.js, lib/*, vendor/leaflet/*, icons/*,
// Manifest), muss CACHE_SHELL hochgezählt werden.
// Sonst behalten bereits installierte Clients unbegrenzt die alte Fassung.
// Die Shell wird absichtlich alles-oder-nichts pro Version ausgetauscht: ein
// revalidierender Mix aus alter app.js und neuer styles.css wäre inkonsistent.
// Dasselbe gilt für JEDE neue HTML-Seite: ohne SHELL-Eintrag und Versions-Bump
// bekommen installierte Clients sie nie zu sehen (siehe ADR-002).
//
// Ausdrücklich NICHT vorhanden und auch nicht nachzurüsten (Nicht-Ziel „kein
// echtes Push", siehe A-2): kein `push`-, kein
// `notificationclick`-, kein `sync`-/`periodicsync`-Handler.

const CACHE_SHELL = 'bauwatch-shell-v23';
const CACHE_DATA = 'bauwatch-data-v1';

// App-Shell. `'./'` ist der Navigations-Einstieg (liefert index.html aus) und
// steht deshalb statt eines zweiten Eintrags „index.html" in der Liste.
// src/lib/classify.js und src/lib/transform.js fehlen hier mit Absicht: sie
// werden nur von den Node-Build-Skripten importiert, der Browser holt sie nie.
// scripts/test-pwa.mjs prüft das gegen die echten Importe in src/app.js.
const SHELL = [
  './',
  // Rechtstexte (A-4). Reine Textseiten ohne JS — sie sind mit drin, weil ein
  // Impressum, das offline verschwindet während die App offline weiterläuft,
  // eine unnötige Inkonsistenz wäre (E7 in A-4).
  'impressum.html',
  'datenschutz.html',
  'src/styles.css',
  'src/app.js',
  'src/lib/changelog.js',
  'src/lib/format.js',
  'src/lib/i18n.js',
  'src/lib/stats.js',
  'vendor/leaflet/leaflet.css',
  'vendor/leaflet/leaflet.js',
  'vendor/leaflet/images/layers.png',
  'vendor/leaflet/images/layers-2x.png',
  'vendor/leaflet/images/marker-icon.png',
  'vendor/leaflet/images/marker-icon-2x.png',
  'vendor/leaflet/images/marker-shadow.png',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png',
];

// Absolute Pfade einmalig aus den relativen Angaben ableiten — self.location ist
// das SW-Skript im Repo-Root, also genau die Scope-Wurzel.
const INDEX_URL = new URL('./', self.location).href;
const DATA_URL = new URL('data/baustellen.geojson', self.location).href;
const DATA_PATH = new URL(DATA_URL).pathname;
// data/changelog.json (A-6) — zweiter Datenpfad, dieselbe network-first-
// Behandlung wie baustellen.geojson (E7 in A-6: die bestehende Regel „Daten:
// network-first, Shell: cache-first" verallgemeinert sich mechanisch auf eine
// kleine, explizite Menge). Bewusst NICHT beim install-Prefetch dabei (siehe
// dort) — ein fehlender/veralteter Feed ist kein Grund, den allerersten
// Seitenaufruf zu verzögern oder scheitern zu lassen.
const CHANGELOG_URL = new URL('data/changelog.json', self.location).href;
const CHANGELOG_PATH = new URL(CHANGELOG_URL).pathname;
const DATA_PATHS = new Set([DATA_PATH, CHANGELOG_PATH]);
const SHELL_PATHS = new Set(SHELL.map((p) => new URL(p, self.location).pathname));

// --- Lebenszyklus ----------------------------------------------------------

self.addEventListener('install', (event) => {
  // Kein skipWaiting(): der Austausch passiert erst, wenn die Nutzerin im
  // Update-Banner „Neu laden" drückt (Entscheidung 4 in A-3 — primär A11y:
  // ein unerwarteter Reload räumt Filter, Suche und Kartenposition weg).
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SHELL);
      await cache.addAll(SHELL);

      // Den Datenstand einmal mitnehmen. Der allererste Seitenaufruf läuft noch
      // unkontrolliert am Service Worker vorbei — ohne diesen Schritt stünde
      // nach einem einzigen Besuch offline zwar die Shell, aber keine einzige
      // Baustelle bereit. Bewusst NICHT fatal: schlägt es fehl (Netz weg,
      // Quota), bleibt die Shell trotzdem installiert.
      try {
        const antwort = await fetch(new Request(DATA_URL, { cache: 'reload' }));
        if (antwort.ok) await ablegen(CACHE_DATA, new Request(DATA_URL), antwort.clone());
      } catch (err) {
        console.warn('[sw] Datenstand nicht vorgeladen:', err);
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const namen = await caches.keys();
      await Promise.all(
        namen
          .filter((n) => n !== CACHE_SHELL && n !== CACHE_DATA)
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

// Nur nutzerausgelöst (Klick im Update-Banner), nie von selbst.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// --- Strategien ------------------------------------------------------------

// Schreiben darf nie den Antwortpfad kippen: ist die Quota erschöpft, bekommt
// die Seite trotzdem ihre Netzantwort.
async function ablegen(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch (err) {
    console.warn('[sw] konnte nicht cachen:', request.url, err);
  }
}

// Navigation: cache-first aus dem Precache — aber PFADBEWUSST (ADR-002).
//
// Bis A-4 gab es genau eine Seite, und diese Funktion beantwortete jede
// Navigation mit INDEX_URL. Mit einer zweiten HTML-Seite wird daraus ein
// stiller Fehler: installierte Clients bekämen unter …/impressum.html die
// Kartenseite. Kein Fehler, keine Meldung — die falsche Seite. Deshalb zuerst
// der ANGEFRAGTE Pfad, INDEX_URL nur noch als Offline-Rückfall.
async function navigationAntwort(request) {
  const url = new URL(request.url);

  // Eigene precachete Seite? Dann die — unabhängig von einem Query-String,
  // der an einer statischen Seite ohnehin nichts ändert.
  if (SHELL_PATHS.has(url.pathname)) {
    const seite = await caches.match(new URL(url.pathname, self.location).href, { ignoreVary: true });
    if (seite) return seite;
  }

  // Unbekannter Pfad: ins Netz, damit GitHub Pages seine echte 404-Seite
  // ausliefern darf, statt dass wir sie mit der Karte überdecken.
  try {
    return await fetch(request);
  } catch (netzfehler) {
    // Offline und keine passende Seite im Cache — die Startseite ist die
    // brauchbarere Antwort als die Browser-Fehlerseite.
    const start = await caches.match(INDEX_URL);
    if (start) return start;
    throw netzfehler;
  }
}

// Shell-Assets: cache-first, bei Miss aus dem Netz und nachlegen.
async function shellAntwort(request) {
  const treffer = await caches.match(request, { ignoreVary: true });
  if (treffer) return treffer;
  const antwort = await fetch(request);
  if (antwort && antwort.ok) await ablegen(CACHE_SHELL, request, antwort.clone());
  return antwort;
}

// Daten: network-first — schützt das Erfolgskriterium „nie älter als der letzte
// Action-Lauf". Nur im Netzfehlerfall aus dem Cache, dann aber
// gekennzeichnet, damit die Seite „offline, Stand von X" anzeigen kann.
async function datenAntwort(request) {
  try {
    const antwort = await fetch(request);
    if (antwort && antwort.ok) await ablegen(CACHE_DATA, request, antwort.clone());
    return antwort;
  } catch (netzfehler) {
    const treffer = await caches.match(request, { ignoreVary: true });
    if (!treffer) throw netzfehler; // erster Besuch ohne Netz → Fehler durchreichen
    const headers = new Headers(treffer.headers);
    headers.set('X-Bauwatch-Cache', 'hit');
    return new Response(await treffer.blob(), {
      status: 200,
      statusText: 'OK',
      headers,
    });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // alles andere ungefiltert durchlassen

  const url = new URL(request.url);
  // Fremde Origins bewusst NICHT abfangen: OSM-Kacheln (nur Besuchtes cachen ist
  // deren Nutzungsregel) und Nominatim (Adress-Eingaben gehören nicht in einen
  // Cache, ein gecachtes Geocoding-Ergebnis wäre ohnehin wertlos).
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationAntwort(request));
    return;
  }
  if (DATA_PATHS.has(url.pathname)) {
    event.respondWith(datenAntwort(request));
    return;
  }
  if (SHELL_PATHS.has(url.pathname)) {
    event.respondWith(shellAntwort(request));
  }
});
