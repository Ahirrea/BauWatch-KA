# F-3 Als App installierbar & offline nutzbar (PWA)

[← Feature-Backlog](./README.md) · [Refinement-Prozess](../FEATURE-REFINEMENT.md)
· Status siehe [Übersicht](./README.md#übersicht)

**User Story:** Als Nutzer möchte ich „Wo wird gebaut?" wie eine App auf meinem
Startbildschirm haben und auch bei schlechtem oder fehlendem Netz die zuletzt
geladenen Baustellen sehen, um unterwegs verlässlich nachschauen zu können.

**Verfeinert am:** 2026-07-25
**Ziel-Branch:** `claude/app-pwa-deployment-t87mu7`

## Andockpunkte im Code
- **`index.html` nutzt durchgängig relative Pfade** (`vendor/…`, `src/…`) → auf dem
  Projekt-Pages-Sub-Pfad `…/BauWatch-KA/` ohne Umbau precache-fähig. Im `<head>`
  fehlen nur `manifest`- und `theme-color`-Angaben.
- **Der Asset-Satz ist statisch abgeschlossen und klein:** `index.html`,
  `src/styles.css`, `src/app.js`, `src/lib/*.js` (3), `vendor/leaflet/leaflet.{css,js}`
  + Leaflet-Images ≈ **250 KB**. Keine Hash-Dateinamen, kein Frontend-Build →
  eine handgeschriebene Precache-Liste ist tragfähig.
- **`loadData()` in `src/app.js` (≈ Z. 417)** holt die Daten mit
  `fetch(DATA_URL, { cache: 'no-cache' })` und hat schon einen Fehlerzweig
  (`#list-status.is-error`) → genau der Punkt, an dem Offline-Fallback und
  Stand-Kennzeichnung andocken. `setFooter()` schreibt Stand/Attribution bereits.
- **Bestehende `aria-live`-Regionen** `#list-status` und `#search-status` tragen die
  neuen Offline-Hinweise — keine neuen Alert-Konstrukte nötig.
- **Farbvariablen in `src/styles.css`** (`--accent` `#1b4b73` hell / `#6ba7d6` dunkel,
  `--bg` `#f7f7f5` / `#16181c`) sind die Quelle für `theme_color`/`background_color`
  und die Icon-Farbgebung — kein neues Farbsystem.
- **Playwright-Muster steht in `CLAUDE.md`** (lokaler `http.server`, Kacheln
  abfangen) → der Offline-Rauchtest ist eine Erweiterung davon.
- **Fehlendes Asset:** kein `icons/`-Verzeichnis, kein Logo. Muss neu entstehen.

## Spannung zu Nicht-Zielen — und Auflösung
- „**Keine Push-Benachrichtigungen in v1**" (SPEC): Ein Service Worker ist die
  *technische* Voraussetzung für Push — wir implementieren aber **keins**. Das
  Urteil aus [F-2](./F-2-baustellen-abo-feed.md) (echtes Push braucht Application
  Server + Speicherung der Push-Endpoints → verworfen) bleibt unverändert.
  Verbindlich: **kein `push`- und kein `notificationclick`-Handler** im SW; die PWA
  öffnet diese Tür nicht versehentlich.
- „**Keine eigene Datenhaltung** über das committete GeoJSON hinaus": Der Cache
  Storage hält **dieselben ausgelieferten Dateien** technisch auf dem Gerät vor —
  keine neue, keine nutzerbezogene Datenhaltung, nichts wird übertragen oder
  gespeichert, was der Nutzer nicht ohnehin geladen hat; jederzeit über die
  Browser-Einstellungen löschbar. Kein Konto, kein Login.
- **Erfolgskriterium „Die Daten sind nie älter als der letzte Action-Lauf (Stand
  sichtbar)" (SPEC)** — hier lag die einzige echte Kollision: Ein cache-first-SW
  für `data/baustellen.geojson` würde es brechen (die Action committet alle 4 h).
  **Aufgelöst durch network-first für die Daten**: online immer der frische
  Snapshot, offline der gecachte — dann aber **ausdrücklich als „offline, Stand
  von X" gekennzeichnet**. Das Kriterium wird in `SPEC.md` entsprechend präzisiert
  (online unverändert; offline transparent veraltet statt gar nichts).
- **ADR-001 („kein Actions-basiertes Pages-Deployment")** bleibt unberührt:
  Manifest, Icons und SW sind gewöhnliche statische Dateien im Repo-Root, jeder
  Daten-Commit ist weiter sofort live.
- **Fallstrick „keine pro-Lauf-volatilen Werte"** (CLAUDE.md): Die Cache-Version im
  SW wird **von Hand** gepflegt; `build-data.mjs` wird nicht angefasst, es entsteht
  kein Rausch-Commit-Pfad.

## Entscheidungen (mit Begründung)
1. **Ausbaustufe: App-Shell offline, ohne Kachel-Cache.** Shell + zuletzt geladene
   Daten deckt den Nutzen (Liste, Filter, Details, Marker). Verworfen: Caching der
   OSM-Kacheln — Speicherverbrauch, Verfallslogik und die OSM-Nutzungsregeln
   (nur Besuchtes, kein Vorab-Download) kosten mehr als sie bringen; **billig
   nachrüstbar**. Verworfen: „nur Manifest ohne SW" — Chrome bietet ohne
   `fetch`-Handler keinen Installations-Dialog an, der Offline-Nutzen fiele ganz weg.
2. **Daten `network-first` mit Cache-Fallback** (nicht stale-while-revalidate) —
   schützt die Frische-Invariante; ein kurzzeitig alter Snapshot beim Start wäre
   fachlich falsch, weil Nutzer *heutige* Sperrungen prüfen.
3. **Shell `cache-first`** — die Dateinamen sind unversioniert; ein
   revalidierender Mix aus alter und neuer `app.js`/`styles.css` wäre inkonsistent.
   Deshalb: alles-oder-nichts pro Cache-Version.
4. **Update: Hinweis-Banner, kein automatisches `skipWaiting`-Reload.** Ein
   unerwarteter Reload räumt Filter, Suche und Kartenposition mitten in der
   Bedienung weg — für Screenreader- und Motorik-Nutzer besonders teuer. Der
   Nutzer entscheidet, wann neu geladen wird.
5. **Kein eigener Install-Button** (`beforeinstallprompt` bleibt ungenutzt).
   Installation über das Browser-Menü; kein Nag-Banner, kein zusätzlicher
   vertikaler Platz über der Karte (vgl. offene Aufgabe #23), und auf iOS/Safari
   wäre der Pfad ohnehin toter Code.
6. **Alles relativ: `start_url: "./"`, `scope: "./"`, relative Icon- und
   Precache-Pfade; `sw.js` im Repo-Root.** Die Seite liegt unter
   `https://<user>.github.io/BauWatch-KA/` — ein einziger führender `/` würde auf
   den `github.io`-Root zeigen und die installierte App unbenutzbar machen. Der
   SW im Root deckt mit Scope `./` die ganze App ab.
7. **Icons: handgeschriebenes SVG als Quelle, PNGs einmalig daraus gerendert und
   committet.** PNG ist für den Android-Installationsdialog und iOS zwingend, ein
   Frontend-Build ist ausgeschlossen → Rendering per bereits vorhandenem Chromium
   (`playwright-core`), **einmalig lokal, nicht in CI**. Die PNGs sind damit
   normale statische Assets.
8. **Nominatim-Antworten werden nie gecacht.** Geocoding braucht Netz, ein
   gecachtes Ergebnis wäre wertlos — und Adress-Eingaben des Nutzers haben im
   Cache nichts zu suchen. Offline wird die Suche sichtbar deaktiviert.

## Umfang / Nicht-Umfang
- **Rein:** `manifest.webmanifest`, `icons/` (SVG-Quelle + PNGs), `sw.js`
  (Shell-Precache + network-first für die Daten), Registrierung und Update-Banner
  in `app.js`, Offline-Kennzeichnung des Datenstands, Deaktivierung der
  Adresssuche offline, `scripts/test-pwa.mjs` in `npm test`, Playwright-
  Offline-Rauchtest, Doku.
- **Raus:** Kachel-Caching, Push/Notifications, Background- und Periodic Sync,
  Install-Button/-Banner, Manifest-Extras (`shortcuts`, `screenshots`,
  `share_target`), Workbox oder sonstige Build-Toolchain, versionierte
  Dateinamen/Hashing, Offline-Fähigkeit der Adresssuche.

## Spezifikation

**Manifest** (`manifest.webmanifest` im Root):
```json
{
  "name": "Wo wird gebaut? — Baustellen in Karlsruhe",
  "short_name": "Baustellen KA",
  "description": "Karte und Liste der offenen Baustellen in Karlsruhe.",
  "lang": "de",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f7f7f5",
  "theme_color": "#1b4b73",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png",
      "purpose": "maskable" }
  ]
}
```
`short_name` bewusst **„Baustellen KA"** (13 Zeichen): Android kürzt Labels unter
dem Icon bei ~12 Zeichen, „Wo wird gebaut?" würde abgeschnitten.

**Einbindung im `<head>`:** `<link rel="manifest" href="manifest.webmanifest">`,
zwei `<meta name="theme-color">` mit `media="(prefers-color-scheme: …)"`
(`#1b4b73` hell / `#16181c` dunkel — sonst blitzt die Systemleiste im Dunkelmodus
hell), `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`
(iOS ignoriert Manifest-Icons).

**Icons:** `icons/icon.svg` als Quelle (Motiv: Absperrbake in `--accent`, **kein
Text** — bei 48 px unlesbar), daraus `icon-192.png`, `icon-512.png`,
`icon-512-maskable.png` (Motiv innerhalb der ~80-%-Sicherheitszone, vollflächiger
Hintergrund) und `apple-touch-icon.png` (180 px, **ohne Alpha** — iOS rundet selbst
und rendert Transparenz schwarz).

**Service Worker** (`sw.js`, klassisches Skript — `type: 'module'`-SW ist in Safari
noch löchrig):
- `const CACHE_SHELL = 'bauwatch-shell-v1'`, `const CACHE_DATA = 'bauwatch-data-v1'`.
- `install`: Precache der **SHELL-Liste** (relative URLs). **Kein `skipWaiting()`**
  (Entscheidung 4).
- `activate`: Caches mit fremdem Namen löschen, `clients.claim()`.
- `message`: auf `{ type: 'SKIP_WAITING' }` → `skipWaiting()` (nur nutzerausgelöst).
- `fetch` — nur `GET`, alles andere ungefiltert durchlassen:

| Anfrage | Strategie |
|---|---|
| Navigation (`index.html`) | cache-first aus dem Precache; offline = gecachtes `index.html` |
| Shell-Assets (`src/`, `vendor/`, `icons/`, Manifest) | cache-first, bei Miss aus dem Netz und nachlegen |
| `data/baustellen.geojson` | **network-first**: Netzantwort in `CACHE_DATA` kopieren; bei Netzfehler daraus antworten, dabei Header `X-Bauwatch-Cache: hit` setzen; fehlt beides → Fehler durchreichen |
| `tile.openstreetmap.org`, `nominatim.openstreetmap.org` | **nicht abfangen** (kein `respondWith`) |

- **Wartungspflicht:** Ändert sich eine Shell-Datei, muss `CACHE_SHELL` hochgezählt
  werden — sonst behalten installierte Clients die alte Version. Kommentar im SW +
  neuer Fallstrick in `CLAUDE.md`.

**Client (`src/app.js`)**
- Registrierung erst nach dem ersten Rendern (`window.addEventListener('load')`)
  und nur bei `'serviceWorker' in navigator`; Fehler **still** loggen. Nichts in
  der App darf am SW hängen (Progressive Enhancement).
- **Update-Banner:** `registration.addEventListener('updatefound')` → neuer Worker
  erreicht `installed` **und** `navigator.serviceWorker.controller` existiert →
  Banner „Neue Version verfügbar" mit Knopf „Neu laden". Klick →
  `postMessage({ type: 'SKIP_WAITING' })`, dann bei `controllerchange` **einmalig**
  `location.reload()` (Guard-Flag gegen Reload-Schleife).
- **Offline-Kennzeichnung:** `loadData()` liest `res.headers.get('X-Bauwatch-Cache')`
  — bewusst **nicht** `navigator.onLine` (liefert bei Captive Portals `true`).
  Bei Treffer: Footer „Daten zuletzt geändert: <Stand> · offline, aus dem
  Gerätespeicher" plus dezente `.is-stale`-Kennzeichnung.
- **Adresssuche offline:** `online`/`offline`-Events schalten Eingabefeld und
  Knopf `disabled` und schreiben „Adresssuche braucht Internet" in das vorhandene
  `#search-status` (`role="status"`); beim `online`-Event zurücknehmen.

**Randfälle**

| Fall | Verhalten |
|---|---|
| Erster Besuch ohne Netz | kein Cache, kein Netz → bestehende Fehlermeldung in `#list-status`, unverändert |
| Snapshot hat sich geändert, Nutzer offline | gecachte Daten **plus** sichtbarer Offline-Stand |
| Neue Version, Nutzer bleibt auf der Seite | Banner; ohne Klick normal weiterarbeiten, Aktivierung beim nächsten Kaltstart |
| SW nicht verfügbar (Privatmodus, `file://`, alter Browser) | App verhält sich exakt wie heute |
| Karte offline | Kacheln fehlen → Karte grau; Marker (SVG-`circleMarker`), Liste und Filter funktionieren (bekanntes Verhalten aus den Playwright-Checks) |
| Speicher-Quota erschöpft | `cache.put`-Fehler abfangen; die Antwort geht trotzdem aus dem Netz an die Seite |
| Sub-Pfad `/BauWatch-KA/` | alle Pfade relativ; ein absoluter Pfad wäre ein stiller Totalausfall → deshalb Testfall |
| `start_url`/`scope` später ändern | bewusst **nie** — installierte Clients müssten neu installieren |

**Nach dem ersten Deploy einmal prüfen** (nicht lokal testbar): dass GitHub Pages
`.webmanifest` mit brauchbarem `Content-Type` ausliefert — falls nicht, ist
`manifest.json` der Rückfall. Unkritisch dagegen die `max-age`-Header von Pages:
Browser holen das SW-Skript beim Update-Check am HTTP-Cache vorbei.
`.nojekyll` liegt bereits vor, es gibt also keine Jekyll-Filterung der neuen Dateien.

**Barrierefreiheit:** Banner als `role="status"`/`aria-live="polite"`, **kein
Fokus-Raub**, per Tastatur erreichbarer Knopf mit sichtbarem Fokus, Kontrast AA aus
den vorhandenen Variablen, unter `prefers-reduced-motion` ohne Einblend-Animation.
Offline-Hinweise laufen über die bestehenden Live-Regionen. Kein Auto-Reload
(Entscheidung 4 ist primär eine A11y-Entscheidung).

**Testplan**
- **`scripts/test-pwa.mjs`** (neu, in `npm test`, reines Node, **netzfrei**):
  Manifest ist valides JSON; Pflichtfelder vorhanden; **alle Pfade relativ**
  (kein führender `/`, kein `http`); jede Icon-Datei existiert mit passender
  `sizes`-Angabe; mindestens ein `purpose: "maskable"`; jeder Eintrag der
  SHELL-Liste in `sw.js` existiert auf der Platte (ein einziger Fehltreffer lässt
  `install` komplett scheitern); **jede lokal referenzierte Datei aus `index.html`
  steht in der SHELL-Liste** (schließt die klassische Precache-Lücke); Cache-Namen
  tragen eine Version.
- **Playwright-Rauchtest** (Muster aus `CLAUDE.md`, Kacheln abfangen): laden →
  `navigator.serviceWorker.ready` → `#liste li` da; dann `setOffline(true)` →
  Reload → Liste erneut da, Offline-Kennzeichnung sichtbar, Suchfeld deaktiviert.
  **Wichtig:** SW brauchen einen Secure Context — `http://localhost:8080` zählt
  als sicher, `file://` nicht.

**Doku-/Backlog-Auswirkungen:** `SPEC.md` (Funktionsumfang „installierbar/offline
nutzbar"; Erfolgskriterium zur Datenfrische um den Offline-Fall präzisieren),
`README.md` (Abschnitt „Als App installieren"), `CLAUDE.md` (Fallstricke:
`CACHE_SHELL`-Version bei Shell-Änderungen hochzählen; SW nur über `localhost`
testbar), [`BACKLOG.md`](../BACKLOG.md) (Aufgabe anlegen und auf diesen Eintrag
verweisen).

## Definition of Done
- Seite ist auf Android/Chrome installierbar; Manifest und Icons ohne Konsolen-
  Beanstandung; Start aus dem Startbildschirm im Standalone-Modus.
- Offline-Reload zeigt Shell, Liste, Filter und die zuletzt geladenen Daten —
  **mit** sichtbarer Offline-Stand-Kennzeichnung; online immer der frische Snapshot.
- Update-Banner erscheint bei neuer Cache-Version; Reload nur auf Nutzerklick,
  keine Reload-Schleife.
- Ohne Service-Worker-Unterstützung verhält sich die App wie heute.
- `scripts/test-pwa.mjs` grün in `npm test`; Playwright-Offline-Check grün.
- Alle Pfade relativ (Sub-Pfad-tauglich); **kein Push-, Sync- oder
  Notification-Handler**; kein neuer nutzerbezogener Datenspeicher; kein Login.
- A11y berücksichtigt; SPEC/README/CLAUDE/BACKLOG aktualisiert.

## Umsetzungsschritte
1. `icons/icon.svg` entwerfen, PNGs einmalig rendern, committen.
2. `manifest.webmanifest` + `<head>`-Einbindung in `index.html`.
3. `sw.js` mit Shell-Precache und network-first-Datenzweig.
4. Registrierung, Update-Banner und Banner-Styles in `app.js`/`styles.css`.
5. Offline-Kennzeichnung des Stands + Deaktivierung der Adresssuche offline.
6. `scripts/test-pwa.mjs` schreiben und in `npm test` einhängen.
7. Playwright-Offline-Rauchtest fahren.
8. Doku aktualisieren (SPEC, README, CLAUDE, BACKLOG), Status in der
   [Übersicht](./README.md#übersicht) auf 🏁 setzen.
