# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BauWatch-KA („Wo wird gebaut?") ist eine rein statische Karten-/Listen-Ansicht der
offenen Baustellen in Karlsruhe. Kein Server, kein Backend, keine laufenden Kosten
(GitHub Pages). Sprache im Repo: Deutsch (Code-Kommentare, Commits, Docs).

## Befehle

- `npm test` — führt alle Testskripte nacheinander aus (transform, diff, classify, quality, pwa).
- Einzelnen Test laufen lassen: `node scripts/test-transform.mjs` (analog `test-diff`, `test-classify`, `test-quality`, `test-pwa`).
- `node scripts/render-icons.mjs` — rendert `icons/*.png` aus `icons/icon.svg` (braucht `node_modules`, nutzt das vorhandene Chromium). **Manuell, bewusst nicht in `npm test` und nicht in der Action** — die PNGs sind committete Assets, kein Build-Artefakt.
- `npm run build:data` (= `node scripts/build-data.mjs`) — zieht die Live-Daten und baut `data/baustellen.geojson`. **Braucht Netzugriff auf `mobil.trk.de`**; in manchen Umgebungen per Egress-Policy geblockt (die GitHub-Action-Runner erreichen es). Flag `--allow-empty` erzwingt Schreiben auch bei 0 Treffern.
- Lokal ansehen: `python3 -m http.server 8080`, dann `http://localhost:8080`. **Kein Build-Schritt fürs Frontend** — reine statische Dateien. Wegen ES-Modulen (`type="module"`) muss über HTTP geöffnet werden, nicht per `file://`.
- Node ≥ 18 nötig (globales `fetch`). `devDependencies` (proj4, leaflet, playwright-core) sind reine Dev-Werkzeuge; `node_modules` wird nicht ausgeliefert.

## Architektur — das große Bild

**Statisches Hosting mit periodischem Daten-Snapshot** (siehe `docs/ADR-001-statisches-hosting.md`). Der WFS-Endpoint der Stadt sendet kein CORS und ist zu groß für den Direktabruf. Deshalb übernimmt eine **GitHub Action** die Rolle des Servers:

```
Stadt-WFS ─(Action: scripts/build-data.mjs, alle 4 h)→ data/baustellen.geojson (committet)
                                                              │ Browser lädt statische Datei (same origin)
                                              index.html + src/app.js → Karte + Liste
```

**Geteilte Bibliothek `src/lib/` ist das Herzstück.** `transform.js`, `classify.js`, `format.js` sind **reine, DOM-freie, abhängigkeitsfreie ES-Module** und werden von **beiden** Seiten importiert: dem Node-Build-Skript und dem Browser-Client. Diese Eigenschaft ist eine harte Randbedingung — kein `document`/`window`, kein npm-Import in `src/lib/`, sonst bricht entweder Build oder Client.

**Datenpipeline (`scripts/build-data.mjs`):** WFS abrufen (mehrere Versions-Varianten mit Fallback) → auf `gemeinde="Karlsruhe"` filtern → **per `vorgangsnummer` deduplizieren** → Koordinaten EPSG:25832→WGS84 → Felder bereinigen/klassifizieren → schlankes GeoJSON schreiben. Hilfsmodule: `diff-data.mjs` (Änderungsvergleich), `quality-report.mjs` (Datenqualität).

**Client (`src/app.js`):** lädt `data/baustellen.geojson`, rendert Leaflet-Karte + synchronisierte Liste, Filter (Zeitraum/Sperrgrad/Verkehrsmittel), Nominatim-Umkreissuche. Leaflet ist **lokal unter `vendor/leaflet/` eingebunden (kein CDN)** — `vendor/leaflet/` ist die Quelle der Wahrheit fürs Frontend, nicht `node_modules`.

**PWA (A-3):** `manifest.webmanifest`, `icons/` und `sw.js` liegen im Repo-Root und sind gewöhnliche statische Dateien (ADR-001 bleibt unberührt). Der Service Worker hält die App-Shell **cache-first**, den Datenschnappschuss aber **network-first** — nur so bleibt das Erfolgskriterium „nie älter als der letzte Action-Lauf" gültig. Im Netzfehlerfall antwortet er aus dem Cache und setzt dabei den Header `X-Bauwatch-Cache: hit`; `loadData()` liest ihn und kennzeichnet den Stand als offline (bewusst **nicht** `navigator.onLine` — Captive Portals melden fälschlich „online"). Die Registrierung ist Progressive Enhancement: ohne Service Worker verhält sich die Seite exakt wie vorher.

## Nicht offensichtliche Fallstricke (wichtig)

- **Anforderungen laufen über `docs/PROZESS.md`, nicht direkt in Code.** Eine nicht-triviale Idee — auch als Frage formuliert („Können wir X?") — wird erst verfeinert: Bestandsaufnahme, Spannungen zu den Nicht-Zielen in `docs/PRD.md`, Optionen mit Empfehlung, Weichen von der Ideengeberin entscheiden lassen, **eigene Datei** `docs/anforderungen/A-<Nr>-<kurz-titel>.md` (aus `docs/anforderungen/_vorlage.md`) + Zeile in `docs/anforderungen/README.md` (dort und **nur** dort lebt der Status). **Umsetzung erst auf ausdrückliches grünes Licht** — ein vorgegebener Feature-Branch-Name ist keins. Kleine Fixes und technische Aufgaben laufen weiter direkt über `docs/BACKLOG.md`; die Trennlinie steht im Prozess („Anforderung oder Aufgabe? Der Test"). Architekturentscheidungen kommen zusätzlich als ADR nach `docs/entscheidungen/` — dieser Ordner ist **append-only**, ein ADR wird nie umgeschrieben.
- **Deduplizierung muss über `vorgangsnummer` laufen, nicht über `id`.** Jeder Vorgang liefert Punkt + Polygon als zwei Features mit *unterschiedlicher* per-Geometrie-`id`, aber gleicher `vorgangsnummer`. Über `id` zu deduplizieren verdoppelt alle Einträge (440 statt 186).
- **Echte WFS-Feldnamen** (nicht raten): `vorgangsnummer`, `vorgangszeitraum_von`/`_bis`, `lage`, `art`, `verursacher`, `zusatzinfo`, `sperrung`, `gemeinde`. `art` enthält bereits **Klartext** (keine kryptischen Codes); `classifyArt` übernimmt lesbare Werte direkt. Das amtliche Feld **`sperrung` ist autoritativ für die Ampel** — Freitext darf es nicht überstimmen.
- **Commit nur bei echter Datenänderung.** `build-data.mjs` vergleicht mit dem vorherigen Snapshot und schreibt/committet nur, wenn sich Features ändern. `stand` = Zeitpunkt der letzten *Änderung*, nicht des letzten Laufs. Konsequenz: Die Git-Historie von `data/baustellen.geojson` = echte Änderungen; viele Action-Läufe + wenige Commits = seltene Änderungen. **Keine pro-Lauf-volatilen Werte in die Datei schreiben** (das erzeugt Rausch-Commits und zerstört diese Invariante).
- **Koordinaten-Reihenfolge:** GeoJSON ist `[lon, lat]`, Leaflet erwartet `[lat, lng]`. Der Build hat eine CRS-Autoerkennung (`looksLikeUtm32`) und transformiert nur, wenn Werte nach UTM-Metern aussehen.
- **`transform.js`-Referenztest** prüft gegen mit `proj4` erzeugte Ground-Truth. `proj4` ist **keine Laufzeit-Abhängigkeit**, nur ein Dev-Werkzeug zur Erzeugung der Referenzwerte.
- **GitHub Pages** deployt aus `main`/root — jeder Daten-Commit ist sofort live. **Nicht** auf ein Actions-basiertes Pages-Deployment umstellen (das würde Snapshots ausliefern → veraltete Daten). Ausgeliefert wird unter dem **Sub-Pfad** `…github.io/BauWatch-KA/`, nicht auf einer Domain-Wurzel: Pfade in HTML/CSS/JS und in neuen Assets müssen **relativ** bleiben (`vendor/…`, nicht `/vendor/…`) — ein führender `/` zeigt auf den `github.io`-Root und bricht still.
- **Shell-Datei geändert → `CACHE_SHELL` in `sw.js` hochzählen.** Der Service Worker precacht die App-Shell (`index.html`, `src/*`, `vendor/leaflet/*`, `icons/*`, Manifest) **cache-first und alles-oder-nichts pro Version**. Wer eine dieser Dateien anfasst und die Version nicht erhöht, liefert installierten Clients unbegrenzt die alte Fassung aus — lokal fällt das nie auf. Die Liste `SHELL` in `sw.js` ist handgepflegt; ein einziger Tippfehler darin lässt `cache.addAll` komplett scheitern, dann installiert sich der SW nie. `scripts/test-pwa.mjs` prüft beides (Existenz jedes Eintrags, Version im Cache-Namen) plus die klassische Precache-Lücke: jede von `index.html` **und** jeder relative Import aus `src/app.js` muss in `SHELL` stehen.
- **Service Worker nur über `localhost` testbar** (Secure Context) — `file://` registriert nicht. Playwright-Muster: `context.setOffline(true)` erreicht `fetch`-Aufrufe **aus dem Service Worker nicht** (eigener Netzkontext); für einen echten Offline-Test same-origin per `context.route(…, r => r.abort())` abschneiden. Der Update-Banner-Pfad lässt sich end-to-end fahren, indem man das Projekt ins Scratchpad kopiert, von dort serviert und `CACHE_SHELL` in der Kopie hochzählt.
- **Der erste Seitenaufruf läuft am Service Worker vorbei** (noch kein `controller`) — deshalb lädt der `install`-Handler `data/baustellen.geojson` selbst einmal in den Daten-Cache. Ohne diesen Schritt stünde nach einem einzigen Besuch offline die Shell, aber keine einzige Baustelle bereit.
- **Kein `push`-/`notificationclick`-/`sync`-Handler im SW.** Der SW ist die technische Voraussetzung für Push — das Nicht-Ziel „kein echtes Push" (`docs/PRD.md`, Urteil in `A-2`) gilt weiter, `scripts/test-pwa.mjs` prüft die Abwesenheit dieser Handler.
- **Beispieldaten-Startwert:** `data/baustellen.geojson` kann `sample: true` tragen; der erste echte Action-Lauf ersetzt es (Logik `firstFill`).
- **Die Daten-Action committet selbst auf `main`.** Nach einem manuell ausgelösten Lauf (oder bei parallelem Arbeiten) ist der lokale Stand schnell veraltet — vor dem nächsten Push `git pull --rebase origin main`, sonst wird der Push mit „fetch first" abgelehnt.
- **Reale WFS-Struktur nur über einen Action-Lauf prüfbar** (lokaler Abruf ist per Egress geblockt). Muster bei Schema-/Feldnamen-Fragen: kleines Inspektions-Skript per temporärem `workflow_dispatch`-Workflow laufen lassen, Job-Logs auslesen, danach wieder entfernen.

## Frontend im Browser testen

`playwright-core` ist installiert; Chromium liegt unter `/opt/pw-browsers/chromium-*/chrome-linux/chrome` (mit `--no-sandbox`). Muster: lokalen `http.server` starten, Seite laden, `#liste li` abwarten. In Umgebungen ohne Egress OSM-Kacheln per `page.route('**://tile.openstreetmap.org/**', r => r.abort())` abfangen — die Karte bleibt dann grau, Marker/Liste/Filter funktionieren trotzdem (Marker sind SVG-`circleMarker`, brauchen keine Kacheln).

## Web-/Mobile-Workflow (Claude Code on the web)

Dieses Repo wird oft aus einer **Cloud-Session** (claude.ai/code, auch vom Handy/Claude-App) heraus bearbeitet. Auf dem kleinen Screen sind Tippen und Diff-Lesen der Flaschenhals, nicht die Rechenzeit — die folgenden Punkte darauf ausgelegt:

- **Verifizieren lassen statt Diffs scrollen.** Auftrag so formulieren, dass Claude selbst `npm test` **und** einen Playwright-Browser-Check fährt und nur das Ergebnis meldet („N/N Checks grün"). Reine, DOM-freie Logik-Änderungen in `src/lib/` sind über `npm test` abgedeckt; UI-/`app.js`-Änderungen zusätzlich im Browser gegenchecken (siehe „Frontend im Browser testen"). Bei **Doku-Umbauten** (Verschieben/Aufteilen von `.md`) sagt `npm test` nichts — dort stattdessen maschinell prüfen: alle relativen Links lösen noch auf, und beim Aufteilen ging kein Text verloren (Satzmengen alt↔neu vergleichen, nur die beabsichtigten Abweichungen melden).
- **`node_modules` wird nicht ausgeliefert** und ist in frischen Sessions leer. Vor Browser-Checks `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` (Chromium ist schon da, nicht neu laden). **Danach `node_modules` wieder entfernen und `package*.json` nicht mit-committen**, falls der Install sie berührt hat — sie gehören nicht in einen Feature-Commit.
- **Temporäre Skripte** (z. B. Verifikations-Runner) ins Scratchpad legen, aber aus dem **Projektverzeichnis** starten (`node`-ESM findet `playwright-core` sonst nicht). Danach aufräumen, nie mit-committen.
- **Egress beachten.** `build:data` braucht `mobil.trk.de`, Umkreissuche `nominatim.openstreetmap.org`, Karte `tile.openstreetmap.org` — je nach Network-Policy der Umgebung geblockt. Kacheln in Tests abfangen (s. o.); für echte Datenläufe die Domain in der Environment-Config unter „Network access → Custom" freigeben oder die GitHub-Action nutzen.
- **Empfohlene Umgebungs-Konfiguration.** Für den Alltag (Code ändern, `npm test`, Playwright-Check mit abgefangenen Kacheln, committen/pushen) reicht **Vertrauenswürdig** — npm, GitHub und `raw.githubusercontent.com` sind in der Standard-Allowlist. Nur wer `build:data` oder Live-Karte/Umkreissuche **direkt in der Web-Session** fährt, braucht **Custom** mit `mobil.trk.de`, `nominatim.openstreetmap.org`, `*.tile.openstreetmap.org` (Häkchen „Defaults einschließen" **an**, sonst bricht `npm install`). Die Custom-Stufe ist nur über die Web-Oberfläche wählbar, nicht im mobilen „Umgebung erstellen"-Dialog.
- **Env-Variablen: keine nötig.** Das Projekt nutzt keine Secrets/API-Keys (WFS/Nominatim/OSM sind öffentlich; die einzige `process.env`-Nutzung ist das eingebaute `GITHUB_STEP_SUMMARY` der Action). Die Playwright-Variablen setzt das Platform-Image bereits.
- **Setup-Script (optional):** `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install || true` installiert die Dev-Deps vor, damit Browser-Checks ohne manuelles Nachinstallieren sofort laufen. **`npm install`, nicht `npm ci`** — die `package-lock.json` ist per `.gitignore` nicht eingecheckt und fehlt in frischen Sessions. Kein Commit-Risiko: `node_modules/` und Lockfile sind gitignored, `npm install` fasst `package.json` nicht an. `npm test` selbst braucht kein `node_modules` (reine Node-Skripte), das Vorinstallieren ist nur für die Browser-Checks relevant.
- **Teleport aufs richtige Gerät.** Am Laptop `claude --teleport` zieht die Handy-Session inkl. Branch und Verlauf ins Terminal — Voraussetzung: gleiches claude.ai-Konto, sauberer Git-Stand und **der Branch ist gepusht** (die VM klont von GitHub). Deshalb: Arbeit vor dem Wechsel committen und pushen.
- **`main` bewegt sich unter dir.** Die Daten-Action committet selbst auf `main`; vor einem Push auf `main` immer erst `git fetch origin main` und den eigenen Commit darauf rebasen/cherry-picken (kein Force-Push nötig, wenn nur echte neue Arbeit dazukommt). **Pull-Requests sind hier unüblich** — fertige Arbeit landet direkt auf `main`. Sauberer Weg auf Zuruf „committe direkt auf main": auf dem Feature-Branch committen, `git fetch origin main`, dann **Fast-Forward** (`git merge --ff-only <branch>`) und pushen — kein Merge-Commit (der eine in der Historie ist ein versehentlicher `git pull`).

## Weiterführend

`README.md` (Setup, Action, „Änderungen nachvollziehen"), `docs/PRD.md` (Produktziel & Nicht-Ziele), `docs/PROZESS.md` (fester Prozess: Idee → umsetzungsreife Anforderung), `docs/anforderungen/` (ausgearbeitete Anforderungen, je Anforderung eine Datei; `README.md` darin = Übersicht + **einzige** Statusquelle), `docs/entscheidungen/` (ADRs, append-only; `README.md` darin = Übersicht), `docs/BACKLOG.md` (Status je technischer Aufgabe).

Die `docs/`-Struktur (`PRD.md` · `PROZESS.md` · `BACKLOG.md` · `anforderungen/` · `entscheidungen/`) ist in allen vier Projekten identisch — Maschinell, PositiveParentingReminders, lieferkarte-karlsruhe, BauWatch-KA. Bis 2026-07-25 hieß sie hier `docs/SPEC.md`, `docs/FEATURE-REFINEMENT.md` und `docs/features/F-<Nr>`.
