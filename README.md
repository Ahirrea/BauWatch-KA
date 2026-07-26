# Wo wird gebaut? — Baustellen in Karlsruhe (BauWatch-KA)

Eine bürgernahe Karte plus Liste der offenen Baustellen in Karlsruhe.
Sie beantwortet die Frage, die Karlsruher wirklich haben:
**„Betrifft mich das — auf meinem Weg, mit meinem Verkehrsmittel, in meinem
Zeitraum?"**

- 🗺️ Karte + synchronisierte Liste (Leaflet + OpenStreetMap)
- 🚦 Ampel für den Sperrgrad, Klartext statt Verwaltungscodes, Restdauer
- 🔎 Adress-/Umkreissuche (1,5 km), Filter nach Zeitraum, Sperrgrad, Verkehrsmittel
- 📲 Als App installierbar und offline nutzbar (siehe [Als App installieren](#als-app-installieren))
- ⚙️ Rein statisch auf GitHub Pages — kein Server, keine laufenden Kosten

Ausführliche Produktbeschreibung: [`docs/PRD.md`](docs/PRD.md).
Verfeinerte Anforderungen: [`docs/anforderungen/`](docs/anforderungen/README.md) —
entstehen über den festen [Refinement-Prozess](docs/PROZESS.md).
Architekturentscheidungen: [`docs/entscheidungen/`](docs/entscheidungen/README.md)
(u. a. [ADR-001](docs/entscheidungen/ADR-001-statisches-hosting.md): warum statisch + Action;
[ADR-002](docs/entscheidungen/ADR-002-mehrseitige-auslieferung.md): mehrseitige Auslieferung).
Aufgaben-Backlog: [`docs/BACKLOG.md`](docs/BACKLOG.md).

## Wie es funktioniert (Kurzfassung)

Der WFS-Endpoint der Stadt sendet kein CORS und ist zu groß für den direkten
Browser-Abruf. Deshalb erledigt eine **GitHub Action** periodisch, was sonst ein
Server täte (siehe ADR-001):

```
Stadt-WFS  ──(GitHub Action, alle 4 h)──►  scripts/build-data.mjs  ──►  data/baustellen.geojson (committet)
                                                                              │
                                                        Browser lädt statische Datei vom selben Origin
                                                                              │
                                                                   index.html + src/app.js  ──►  Karte + Liste
```

Die eigentliche Aufbereitungslogik (Koordinaten, Klartext, Formatierung) liegt
in `src/lib/` und wird **von Build-Skript und Client gemeinsam** genutzt.

## Projektstruktur

```
index.html                 Einstieg, lädt src/app.js + Leaflet (lokal)
impressum.html             Rechtstext, reine Textseite ohne JS (A-4)
datenschutz.html           Rechtstext, reine Textseite ohne JS (A-4)
manifest.webmanifest       PWA-Manifest (Name, Icons, Farben, start_url)
sw.js                      Service Worker: Shell-Precache + Offline-Daten
icons/                     icon.svg (Quelle) + daraus gerenderte PNGs
src/
  app.js                   UI, Karte, Filter, Rendering
  styles.css
  lib/
    transform.js           UTM32 (EPSG:25832) -> WGS84   (geteilt)
    classify.js            art-Codes, Sperrgrad-Ampel, Verkehrsmittel (geteilt)
    format.js              Restdauer, HTML-Bereinigung, Datumsformat (geteilt)
scripts/
  build-data.mjs           von der Action ausgeführt: holt & baut die Daten
  diff-data.mjs            Änderungsvergleich zweier Snapshots (für Changelog)
  quality-report.mjs       erzeugt den Datenqualitäts-Report (data/QUALITY.md)
  render-icons.mjs         rendert icons/*.png aus icons/icon.svg (manuell, nicht in CI)
  screenshot.mjs           erzeugt docs/showcase/*.png (manuell, nicht in CI)
  test-transform.mjs       Referenztest der Koordinaten-Transformation
  test-diff.mjs            Tests der Änderungserkennung
  test-classify.mjs        Tests der Klartext-/Ampel-/Verkehrsmittel-Einordnung
  test-quality.mjs         Tests des Qualitäts-Reports
  test-pwa.mjs             Tests von Manifest, Icons und Service Worker
  test-attribution.mjs     Tests der CC-BY-Namensnennung im ausgelieferten HTML
  test-rechtstexte.mjs     Tests von Impressum/Datenschutzhinweis (inkl. Drift zum Code)
data/
  baustellen.geojson       generierter, committeter Snapshot (Startwert: Beispieldaten)
  CHANGELOG.md             automatisch gepflegtes Änderungsprotokoll der Daten
  QUALITY.md               automatisch erzeugter Datenqualitäts-Report je Build
vendor/leaflet/            Leaflet lokal eingebunden (kein CDN)
.github/workflows/
  update-data.yml          Cron + manueller Trigger
docs/                      PRD, Prozess, Backlog, anforderungen/, entscheidungen/
  showcase/                Screenshots für den Showcase-Eintrag im Transparenzportal
```

## Lokal starten

Es gibt keinen Build-Schritt für das Frontend — reine statische Dateien.
Wegen der ES-Module (`type="module"`) muss über einen kleinen HTTP-Server
geöffnet werden (nicht per `file://`):

```bash
# beliebiger statischer Server, z. B.:
python3 -m http.server 8080
# dann http://localhost:8080 öffnen
```

Node wird nur für das Daten-Build-Skript und die Tests gebraucht (Node ≥ 18,
wegen `fetch`).

### Daten lokal neu bauen

```bash
npm run build:data        # = node scripts/build-data.mjs
```

Das Skript ruft den Stadt-WFS ab, filtert auf Karlsruhe, dedupliziert
Punkt/Polygon, transformiert die Koordinaten, bereinigt die Felder und schreibt
`data/baustellen.geojson` (plus den Qualitäts-Report `data/QUALITY.md`). Bei
einem API-Fehler oder einem verdächtig leeren Ergebnis bricht es **ab, ohne die
vorhandene Datei zu überschreiben** — mit dem Flag `--allow-empty` lässt sich
das Schreiben auch bei 0 Treffern erzwingen.

> **Netzzugriff nötig:** Der Abruf geht an `mobil.trk.de`. In manchen Umgebungen
> ist dieser Host per Egress-Policy geblockt (die GitHub-Action-Runner erreichen
> ihn); lokal schlägt der Build dann fehl.

> Im Repo liegt zunächst ein kleiner **Beispiel-Datensatz** (`sample: true`,
> im Footer als Beispieldaten markiert). Der erste erfolgreiche Action-Lauf
> ersetzt ihn durch echte Daten.

### Tests

```bash
npm test    # führt alle Testskripte nacheinander aus
```

`npm test` läuft `test-transform`, `test-diff`, `test-classify`, `test-quality`,
`test-pwa`, `test-attribution` und `test-rechtstexte` durch; einzeln z. B.
`node scripts/test-transform.mjs`. Geprüft werden u. a.:

- **`transform.js`** gegen bekannte Referenzkoordinaten (u. a. Marktplatz
  Karlsruhe und den Zentralmeridian-Invariant),
- die **Änderungserkennung** (`diff-data.mjs`),
- die **fachliche Einordnung** (Klartext, Sperrgrad-Ampel, Verkehrsmittel),
- der **Qualitäts-Report** (`quality-report.mjs`),
- die **PWA-Artefakte** (`manifest.webmanifest`, Icons, `sw.js`): valides
  Manifest, Icon-Dateien in der angegebenen Größe, **alle Pfade relativ**, jede
  von einer precacheten HTML-Seite bzw. von `src/app.js` referenzierte Datei
  auch precacht, und die Navigation im Service Worker **pfadbewusst**
  ([ADR-002](docs/entscheidungen/ADR-002-mehrseitige-auslieferung.md)),
- die **CC-BY-Namensnennung**: sie steht **statisch im ausgelieferten
  `index.html`** (nicht per JS nachgetragen), ist wortgleich mit `ATTRIBUTION`
  aus `build-data.mjs` und wird von `app.js` nicht überschrieben. Die Nennung ist
  Lizenzbedingung — sie darf nicht am Datenabruf oder an aktivem JavaScript
  hängen,
- die **Rechtstexte** (`impressum.html`, `datenschutz.html`): Pflichtabschnitte
  vorhanden, aus dem Footer verlinkt, alle Pfade relativ, ohne JavaScript
  nutzbar — und in **beide Richtungen driftsicher** gegen den Code: jeder
  externe Host aus `src/*.js` muss im Datenschutzhinweis genannt sein, und
  solange dieser „keine Cookies / keine eigene Speicherung" behauptet, darf im
  Frontend kein `localStorage`, `document.cookie`, `indexedDB` o. Ä. auftauchen.
  Wer einen Drittdienst oder einen Client-Speicher einbaut und den Text
  vergisst, bekommt `npm test` rot.

Die Referenzwerte der Transformation wurden einmalig mit `proj4` erzeugt —
`proj4` ist **keine Laufzeit-Abhängigkeit**, nur ein Dev-Werkzeug.

## GitHub Pages aktivieren (#5)

Die Seite ist eine statische Site im Repo-Wurzelverzeichnis:

1. Repo → **Settings → Pages**
2. **Source:** „Deploy from a branch"
3. **Branch:** `main`, Ordner `/ (root)` → Save

Danach ist die Seite unter `https://<user>.github.io/BauWatch-KA/` erreichbar.
Diese Variante (Deploy aus dem Branch) ist bewusst gewählt: Jeder Commit auf
`main` — auch die Datenaktualisierungen der Action — ist damit sofort live, ohne
zusätzlichen Deploy-Schritt. Die Datei `.nojekyll` sorgt dafür, dass alle
Verzeichnisse unverändert ausgeliefert werden.

## Als App installieren

Die Seite ist eine **Progressive Web App**: Sie lässt sich auf den
Startbildschirm legen und funktioniert danach auch ohne Netz. Ein eigener
„Installieren"-Knopf gibt es bewusst nicht — die Installation läuft über das
Browser-Menü (Details und Begründung in
[A-3](docs/anforderungen/A-3-pwa-installierbar-offline.md)):

- **Android/Chrome:** Menü ⋮ → „App installieren" bzw. „Zum Startbildschirm hinzufügen"
- **iOS/Safari:** Teilen-Symbol → „Zum Home-Bildschirm"
- **Desktop/Chrome, Edge:** Installations-Symbol in der Adressleiste

**Was offline funktioniert:** Karte (ohne Kartenkacheln — die Fläche bleibt grau),
Marker, Liste, alle Filter und die Detailangaben, gerechnet auf dem **zuletzt
geladenen Datenstand**. Der Footer weist das dann ausdrücklich aus:
„Daten zuletzt geändert: … · **offline, aus dem Gerätespeicher**".

**Was offline nicht funktioniert:** die Adress-/Umkreissuche — sie braucht
Nominatim. Eingabefeld und Knopf sind offline deaktiviert und der Suchstatus
sagt es (statt still ins Leere zu laufen).

**Mit Netz gilt immer der frische Stand.** Der Datenabruf ist *network-first*:
Es wird stets zuerst der committete Snapshot geholt, der Cache ist nur der
Rückfall. Ein Kartenkachel-Cache existiert bewusst nicht.

**Neue Version:** Änderungen an der App zeigt ein Hinweis-Banner
(„Neue Version verfügbar" + „Neu laden"). Neu geladen wird **nur auf Klick** —
ein automatischer Reload würde Filter, Suche und Kartenposition mitten in der
Bedienung wegräumen.

> **Für Entwickelnde:** Service Worker brauchen einen *Secure Context*.
> `http://localhost:8080` zählt als sicher, `file://` nicht — offline testen
> lässt sich die Seite also nur über den lokalen HTTP-Server. Und: **wer eine
> Shell-Datei ändert, muss `CACHE_SHELL` in [`sw.js`](sw.js) hochzählen**, sonst
> behalten installierte Clients die alte Fassung. Die App-Icons entstehen aus
> `icons/icon.svg` per `node scripts/render-icons.mjs` (manuell, nicht in CI).

## Die Daten-Action (#4)

`.github/workflows/update-data.yml`:

- läuft per Cron **alle 4 Stunden** (UTC) und lässt sich manuell auslösen
  (**Actions → „Baustellendaten aktualisieren" → Run workflow**),
- führt `scripts/build-data.mjs` aus (kein `npm install` nötig — das Skript
  nutzt nur die abhängigkeitsfreien Module aus `src/lib/`),
- committet `data/baustellen.geojson` **nur bei tatsächlicher Änderung** und
  pusht auf `main`.

Das Cron-Intervall lässt sich oben in der Workflow-Datei anpassen.

## Änderungen nachvollziehen

Das Build-Skript vergleicht den neuen Stand mit dem zuletzt committeten und
**schreibt nur bei einer echten Änderung** (Zeitstempel allein zählen nicht).
Daraus ergibt sich, wo man sieht, *ob* und *was* sich geändert hat:

- **`data/CHANGELOG.md`** — dauerhaftes Protokoll, neueste Änderung zuerst:
  welche Baustellen ➕ neu, ➖ entfernt oder ✏️ geändert wurden (mit Feld-Details
  wie „Ende: … → …"). Auf der Website unten als „Änderungsverlauf" verlinkt.
- **Commit-Verlauf von `data/baustellen.geojson`** — jeder Commit ist eine echte
  Änderung. `git log --follow data/baustellen.geojson` zeigt die Historie; die
  Commit-Message enthält die Kurzfassung („3 neu, 1 entfernt …").
- **Action-Job-Summary** — pro Lauf im Actions-Tab (auch die Läufe *ohne*
  Änderung sind dort mit Zeitstempel gelistet).
- **`data/QUALITY.md`** — beim Build erzeugter Qualitäts-Report (Feature-Zahlen
  je Pipeline-Stufe, leere Pflichtfelder u. Ä.), um Auffälligkeiten in den
  Rohdaten schnell zu erkennen.

### Wie oft ändern sich die Daten wirklich?

Weil ohne Änderung kein Commit entsteht, ist die Antwort direkt ablesbar:

- **Viele Action-Läufe, wenige Daten-Commits = die Daten ändern sich selten.**
  Die Läufe (alle 4 h) stehen im Actions-Tab, die echten Änderungen im
  Commit-Verlauf bzw. im `CHANGELOG.md`.
- Die Abstände zwischen den Commits an `data/baustellen.geojson` sind das
  Änderungsintervall. `git log --follow --format='%ci %s' data/baustellen.geojson`
  listet sie kompakt auf.

Der Footer der Website zeigt „Daten zuletzt geändert" (= `stand`), also den
Zeitpunkt der letzten echten Änderung — nicht den letzten Prüflauf.

## Beitragen

### Ein `art`-Klartext-Mapping ergänzen (#15)

Das amtliche Feld `art` liefert in der Regel **bereits lesbaren Klartext**
(z. B. „Straßenbau") — der wird unverändert übernommen. Für die Fälle, in denen
ein Wert dennoch übersetzt oder vereinheitlicht werden soll, gibt es in
[`src/lib/classify.js`](src/lib/classify.js) die Override-Tabelle `ART_MAP`.
Ein neuer Eintrag ist eine einzige Zeile:

```js
export const ART_MAP = {
  // ...
  neuer_code: 'Verständlicher Klartext',
};
```

Schlüssel werden getrimmt und case-insensitiv verglichen (auch ohne
Leer-/Sonderzeichen). Fehlt ein Override, wird echter Klartext direkt
durchgereicht; ein kryptischer Code ohne Übersetzung bekommt den ehrlichen
Fallback `Baustelle (<code>)`, damit fehlende Mappings sichtbar bleiben.
Nach dem Ergänzen `npm run build:data` laufen lassen (oder die Action neu
auslösen), damit die Änderung in die aufbereiteten Daten einfließt.

### Sperrgrad- und Verkehrsmittel-Erkennung

Diese arbeiten schlüsselwortbasiert über den kombinierten Klartext
(`classifySperrgrad`, `classifyVerkehrsmittel` in `classify.js`), weil der
Rohdatensatz dafür keine sauber getrennten Felder garantiert. Die Muster lassen
sich dort erweitern. Grenze der Methode: Verneinungen im Freitext
(„Radweg frei") werden nicht erkannt — der Originaltext bleibt im Popup aber
immer sichtbar.

## Lizenz

Code: **MIT** (siehe [`LICENSE`](LICENSE)).
Daten: „Baustellen", Stadt Karlsruhe, **CC-BY 4.0** — Namensnennung statisch im
Footer von `index.html`, abgesichert durch `scripts/test-attribution.mjs`.
Ohne Gewähr; verbindlich ist ausschließlich die Beschilderung vor Ort.

Betreiberangaben und Datenflüsse: [`impressum.html`](impressum.html) und
[`datenschutz.html`](datenschutz.html) (Anforderung
[A-4](docs/anforderungen/A-4-impressum-datenschutz.md)) — auf der Live-Seite aus
dem Footer verlinkt.
