# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BauWatch-KA („Wo wird gebaut?") ist eine rein statische Karten-/Listen-Ansicht der
offenen Baustellen in Karlsruhe. Kein Server, kein Backend, keine laufenden Kosten
(GitHub Pages). Sprache im Repo: Deutsch (Code-Kommentare, Commits, Docs).

## Befehle

- `npm test` — führt alle Testskripte nacheinander aus (transform, diff, classify, quality).
- Einzelnen Test laufen lassen: `node scripts/test-transform.mjs` (analog `test-diff`, `test-classify`, `test-quality`).
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

## Nicht offensichtliche Fallstricke (wichtig)

- **Deduplizierung muss über `vorgangsnummer` laufen, nicht über `id`.** Jeder Vorgang liefert Punkt + Polygon als zwei Features mit *unterschiedlicher* per-Geometrie-`id`, aber gleicher `vorgangsnummer`. Über `id` zu deduplizieren verdoppelt alle Einträge (440 statt 186).
- **Echte WFS-Feldnamen** (nicht raten): `vorgangsnummer`, `vorgangszeitraum_von`/`_bis`, `lage`, `art`, `verursacher`, `zusatzinfo`, `sperrung`, `gemeinde`. `art` enthält bereits **Klartext** (keine kryptischen Codes); `classifyArt` übernimmt lesbare Werte direkt. Das amtliche Feld **`sperrung` ist autoritativ für die Ampel** — Freitext darf es nicht überstimmen.
- **Commit nur bei echter Datenänderung.** `build-data.mjs` vergleicht mit dem vorherigen Snapshot und schreibt/committet nur, wenn sich Features ändern. `stand` = Zeitpunkt der letzten *Änderung*, nicht des letzten Laufs. Konsequenz: Die Git-Historie von `data/baustellen.geojson` = echte Änderungen; viele Action-Läufe + wenige Commits = seltene Änderungen. **Keine pro-Lauf-volatilen Werte in die Datei schreiben** (das erzeugt Rausch-Commits und zerstört diese Invariante).
- **Koordinaten-Reihenfolge:** GeoJSON ist `[lon, lat]`, Leaflet erwartet `[lat, lng]`. Der Build hat eine CRS-Autoerkennung (`looksLikeUtm32`) und transformiert nur, wenn Werte nach UTM-Metern aussehen.
- **`transform.js`-Referenztest** prüft gegen mit `proj4` erzeugte Ground-Truth. `proj4` ist **keine Laufzeit-Abhängigkeit**, nur ein Dev-Werkzeug zur Erzeugung der Referenzwerte.
- **GitHub Pages** deployt aus `main`/root — jeder Daten-Commit ist sofort live. **Nicht** auf ein Actions-basiertes Pages-Deployment umstellen (das würde Snapshots ausliefern → veraltete Daten).
- **Beispieldaten-Startwert:** `data/baustellen.geojson` kann `sample: true` tragen; der erste echte Action-Lauf ersetzt es (Logik `firstFill`).
- **Die Daten-Action committet selbst auf `main`.** Nach einem manuell ausgelösten Lauf (oder bei parallelem Arbeiten) ist der lokale Stand schnell veraltet — vor dem nächsten Push `git pull --rebase origin main`, sonst wird der Push mit „fetch first" abgelehnt.
- **Reale WFS-Struktur nur über einen Action-Lauf prüfbar** (lokaler Abruf ist per Egress geblockt). Muster bei Schema-/Feldnamen-Fragen: kleines Inspektions-Skript per temporärem `workflow_dispatch`-Workflow laufen lassen, Job-Logs auslesen, danach wieder entfernen.

## Frontend im Browser testen

`playwright-core` ist installiert; Chromium liegt unter `/opt/pw-browsers/chromium-*/chrome-linux/chrome` (mit `--no-sandbox`). Muster: lokalen `http.server` starten, Seite laden, `#liste li` abwarten. In Umgebungen ohne Egress OSM-Kacheln per `page.route('**://tile.openstreetmap.org/**', r => r.abort())` abfangen — die Karte bleibt dann grau, Marker/Liste/Filter funktionieren trotzdem (Marker sind SVG-`circleMarker`, brauchen keine Kacheln).

## Web-/Mobile-Workflow (Claude Code on the web)

Dieses Repo wird oft aus einer **Cloud-Session** (claude.ai/code, auch vom Handy/Claude-App) heraus bearbeitet. Auf dem kleinen Screen sind Tippen und Diff-Lesen der Flaschenhals, nicht die Rechenzeit — die folgenden Punkte darauf ausgelegt:

- **Verifizieren lassen statt Diffs scrollen.** Auftrag so formulieren, dass Claude selbst `npm test` **und** einen Playwright-Browser-Check fährt und nur das Ergebnis meldet („N/N Checks grün"). Reine, DOM-freie Logik-Änderungen in `src/lib/` sind über `npm test` abgedeckt; UI-/`app.js`-Änderungen zusätzlich im Browser gegenchecken (siehe „Frontend im Browser testen").
- **`node_modules` wird nicht ausgeliefert** und ist in frischen Sessions leer. Vor Browser-Checks `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` (Chromium ist schon da, nicht neu laden). **Danach `node_modules` wieder entfernen und `package*.json` nicht mit-committen**, falls der Install sie berührt hat — sie gehören nicht in einen Feature-Commit.
- **Temporäre Skripte** (z. B. Verifikations-Runner) ins Scratchpad legen, aber aus dem **Projektverzeichnis** starten (`node`-ESM findet `playwright-core` sonst nicht). Danach aufräumen, nie mit-committen.
- **Egress beachten.** `build:data` braucht `mobil.trk.de`, Umkreissuche `nominatim.openstreetmap.org`, Karte `tile.openstreetmap.org` — je nach Network-Policy der Umgebung geblockt. Kacheln in Tests abfangen (s. o.); für echte Datenläufe die Domain in der Environment-Config unter „Network access → Custom" freigeben oder die GitHub-Action nutzen.
- **Teleport aufs richtige Gerät.** Am Laptop `claude --teleport` zieht die Handy-Session inkl. Branch und Verlauf ins Terminal — Voraussetzung: gleiches claude.ai-Konto, sauberer Git-Stand und **der Branch ist gepusht** (die VM klont von GitHub). Deshalb: Arbeit vor dem Wechsel committen und pushen.
- **`main` bewegt sich unter dir.** Die Daten-Action committet selbst auf `main`; vor einem Push auf `main` immer erst `git fetch origin main` und den eigenen Commit darauf rebasen/cherry-picken (kein Force-Push nötig, wenn nur echte neue Arbeit dazukommt).

## Weiterführend

`README.md` (Setup, Action, „Änderungen nachvollziehen"), `docs/SPEC.md` (Produktziel & Nicht-Ziele), `docs/ADR-001-statisches-hosting.md` (Architekturentscheidung), `docs/BACKLOG.md` (Status je technischer Aufgabe), `docs/FEATURE-BACKLOG.md` (ausgearbeitete Feature-Ideen), `docs/FEATURE-REFINEMENT.md` (fester Prozess: Idee → umsetzungsreife Spec).
