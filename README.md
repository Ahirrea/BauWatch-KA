# Wo wird gebaut? — Baustellen in Karlsruhe (BauWatch-KA)

Eine bürgernahe Karte plus Liste der offenen Baustellen in Karlsruhe.
Sie beantwortet die Frage, die Karlsruher wirklich haben:
**„Betrifft mich das — auf meinem Weg, mit meinem Verkehrsmittel, in meinem
Zeitraum?"**

- 🗺️ Karte + synchronisierte Liste (Leaflet + OpenStreetMap)
- 🚦 Ampel für den Sperrgrad, Klartext statt Verwaltungscodes, Restdauer
- 🔎 Adress-/Umkreissuche (1,5 km), Filter nach Zeitraum, Sperrgrad, Verkehrsmittel
- ⚙️ Rein statisch auf GitHub Pages — kein Server, keine laufenden Kosten

Ausführliche Produktbeschreibung: [`docs/SPEC.md`](docs/SPEC.md).
Architekturentscheidung (warum statisch + Action): [`docs/ADR-001-statisches-hosting.md`](docs/ADR-001-statisches-hosting.md).
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
  test-transform.mjs       Referenztest der Koordinaten-Transformation
  test-diff.mjs            Tests der Änderungserkennung
data/
  baustellen.geojson       generierter, committeter Snapshot (Startwert: Beispieldaten)
  CHANGELOG.md             automatisch gepflegtes Änderungsprotokoll der Daten
vendor/leaflet/            Leaflet lokal eingebunden (kein CDN)
.github/workflows/
  update-data.yml          Cron + manueller Trigger
docs/                      SPEC, ADR, Backlog
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
node scripts/build-data.mjs
```

Das Skript ruft den Stadt-WFS ab, filtert auf Karlsruhe, dedupliziert
Punkt/Polygon, transformiert die Koordinaten, bereinigt die Felder und schreibt
`data/baustellen.geojson`. Bei einem API-Fehler oder einem verdächtig leeren
Ergebnis bricht es **ab, ohne die vorhandene Datei zu überschreiben**.

> Im Repo liegt zunächst ein kleiner **Beispiel-Datensatz** (`sample: true`,
> im Footer als Beispieldaten markiert). Der erste erfolgreiche Action-Lauf
> ersetzt ihn durch echte Daten.

### Tests

```bash
npm test    # bzw. node scripts/test-transform.mjs
```

Prüft `transform.js` gegen bekannte Referenzkoordinaten (u. a. Marktplatz
Karlsruhe und den Zentralmeridian-Invariant). Die Referenzwerte wurden einmalig
mit `proj4` erzeugt — `proj4` ist **keine Laufzeit-Abhängigkeit**, nur ein
Dev-Werkzeug.

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

Die Übersetzung der Verwaltungscodes lebt in
[`src/lib/classify.js`](src/lib/classify.js) in der Tabelle `ART_MAP`.
Ein neues Mapping ist eine einzige Zeile:

```js
export const ART_MAP = {
  // ...
  neuer_code: 'Verständlicher Klartext',
};
```

Schlüssel werden getrimmt und case-insensitiv verglichen (auch ohne
Leer-/Sonderzeichen). Unbekannte Codes bekommen automatisch einen ehrlichen
Fallback `Baustelle (<code>)`, damit fehlende Mappings sichtbar bleiben.
Nach dem Ergänzen `node scripts/build-data.mjs` laufen lassen (oder die Action
neu auslösen), damit die Änderung in die aufbereiteten Daten einfließt.

### Sperrgrad- und Verkehrsmittel-Erkennung

Diese arbeiten schlüsselwortbasiert über den kombinierten Klartext
(`classifySperrgrad`, `classifyVerkehrsmittel` in `classify.js`), weil der
Rohdatensatz dafür keine sauber getrennten Felder garantiert. Die Muster lassen
sich dort erweitern. Grenze der Methode: Verneinungen im Freitext
(„Radweg frei") werden nicht erkannt — der Originaltext bleibt im Popup aber
immer sichtbar.

## Lizenz

Code: **MIT** (siehe [`LICENSE`](LICENSE)).
Daten: „Baustellen", Stadt Karlsruhe, **CC-BY 4.0** — Namensnennung im Footer.
Ohne Gewähr; verbindlich ist ausschließlich die Beschilderung vor Ort.
