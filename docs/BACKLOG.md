# Backlog

Jeder Punkt war ursprünglich als eigenständiges GitHub-Issue gedacht. Titel =
Issue-Titel, darunter Kontext und Definition of Done. Reihenfolge = grobe
Bauabfolge. Labels-Vorschlag: `setup`, `data`, `frontend`, `a11y`, `docs`,
`enhancement`.

> Dieser Backlog sammelt technische Aufgaben und Fixes. **Ausgearbeitete
> Feature-Ideen** stehen im [Feature-Backlog](./FEATURE-BACKLOG.md); sie
> entstehen über den festen [Feature-Refinement-Prozess](./FEATURE-REFINEMENT.md).

**Statuslegende:** ✅ erledigt · 🟡 teilweise / offen · ⬜ offen
**Stand:** 2026-07-24 (nach v1 + Daten-Pipeline gegen echten WFS verifiziert;
Feinschliff-Befunde aus dem Desktop-UI-Review ergänzt, #20–#23).

> Kurzfassung: Milestones 1–3 sind umgesetzt und die Seite ist über GitHub Pages
> live (#5). Von Milestone 4 sind #15 und #18 erledigt; offen bleiben nur noch die
> optionalen Punkte #16 (Abo-Feed) und #17 (.ics-Export).

---

## Milestone 1 — Gerüst & Daten-Pipeline

Ziel: Repo steht, die Action erzeugt sauberes GeoJSON, Seite ist online (leer).

### ✅ #1 Repo-Grundgerüst anlegen
Ordnerstruktur gemäß ADR-001, `index.html`, `src/`, `scripts/`, `data/`,
Lizenzdatei (MIT), `.gitignore`, README mit Kurzbeschreibung + Link zur SPEC.
**DoD:** Struktur existiert, Repo lässt sich klonen und öffnen. — **erledigt.**

### ✅ #2 Geteilte Bibliotheksmodule (`src/lib/`)
`transform.js` (UTM32→WGS84, mit Referenztest gegen proj4-Ground-Truth),
`classify.js` (art→Klartext, Sperrgrad-Ampel, Verkehrsmittel), `format.js`
(Restdauer, HTML-Bereinigung). ES-Module, ohne DOM-Abhängigkeit.
**DoD:** reine Funktionen; `scripts/test-transform.mjs` prüft gegen bekannte
Referenzkoordinaten. — **erledigt** (zusätzlich `scripts/test-diff.mjs`).

### ✅ #3 Build-Skript `scripts/build-data.mjs`
Zieht WFS-GeoJSON, filtert `gemeinde="Karlsruhe"`, dedupliziert Punkt/Polygon,
transformiert Koordinaten, bereinigt Felder, schreibt schlankes
`data/baustellen.geojson`.
**DoD:** valider, verkleinerter Output; Fehlerfall bricht sauber ab ohne die
vorhandene Datei zu zerstören. — **erledigt & gegen echtes WFS-Schema validiert**:
Dedup über `vorgangsnummer` (Punkt+Polygon je Vorgang → 440 auf 186 Vorgänge),
echte Feldnamen (`vorgangszeitraum_von/_bis`, `lage`), Ampel aus dem amtlichen
Feld `sperrung`. Zusätzlich gehärtet: WFS-Varianten-Fallback (1.0.0/typeName …),
CRS-Autoerkennung, Schreiben nur bei echter Änderung.

### ✅ #4 GitHub Action `update-data.yml`
Cron (alle 4 h) + `workflow_dispatch`. Führt Build-Skript aus, committet nur bei
Änderung.
**DoD:** Action läuft grün, committet bei geänderten Daten, überspringt Commit
bei identischen Daten. — **erledigt & verifiziert** (Lauf holte 440 Baustellen).

### ✅ #5 GitHub Pages aktivieren
Deployment aus `main` (root). Domain/Pfad dokumentieren.
**DoD:** `index.html` ist öffentlich erreichbar. — **erledigt**, Pages ist
aktiviert und die Seite live (Deploy aus `main`/root, `.nojekyll` vorhanden).

---

## Milestone 2 — Kern-UI (die Kernschleife)

### ✅ #6 Karte + Marker aus statischem GeoJSON
Leaflet-Karte, farbcodierte Marker (Ampel), Popup mit Klartext, lädt
`data/baustellen.geojson`. **DoD erfüllt.**

### ✅ #7 Synchronisierte Liste
Liste neben/unter der Karte, Klick zentriert Karte und öffnet Popup; Restdauer,
Verursacher, Verkehrsmittel sichtbar. **DoD erfüllt** (Interaktion beidseitig).

### ✅ #8 Filter: Zeitraum, Sperrgrad, Verkehrsmittel
Segment-Buttons, kombinierbar; Kennzahlen-Leiste aktualisiert live.
**DoD erfüllt** (im Browser end-to-end geprüft).

### ✅ #9 Adress-/Umkreissuche
Nominatim-Geocoding (Referer-Identifikation, Suche nur auf Absenden), 1,5-km-
Umkreis, Distanzsortierung, Umkreis-Kreis, Reset-Knopf.
**DoD erfüllt**; Fehlerfall zeigt hilfreiche Meldung.

### ✅ #10 Leerzustände & Ladezustände
Aussagekräftige Texte für Laden / kein Treffer / Datenfehler. **DoD erfüllt.**

---

## Milestone 3 — Qualität & Feinschliff

### ✅ #11 Responsiv & Mobil
Layout stapelt Karte + Liste bis Smartphone. **DoD erfüllt** (Layout bis 360px).

### ✅ #12 Barrierefreiheit
Sichtbarer Tastaturfokus, Kontraste (WCAG-AA-Zielwerte), ARIA für Segment-Buttons
(`aria-pressed`, `role=group`), Skip-Link, `prefers-reduced-motion`.
**DoD im Wesentlichen erfüllt** — ein formales Audit mit Tool (axe/Lighthouse)
steht als Gegenprobe noch aus.

### ✅ #13 Namensnennung, Impressum-Hinweis, Datenstand
CC-BY-Verweis, „Daten zuletzt geändert", Haftungshinweis (verbindlich ist die
Beschilderung vor Ort), Link zum Änderungsverlauf. **DoD erfüllt.**

### ✅ #14 README für Beitragende
Setup, lokaler Build, Funktionsweise der Action, wie man Klartext-Mappings
ergänzt, Abschnitt „Änderungen nachvollziehen". **DoD erfüllt.**

---

## Milestone 4 — Optional / später (bewusst nach v1)

### ✅ #15 art-Code-Mapping vervollständigen
Alle real vorkommenden Codes übersetzen, inkl. Fallback für unbekannte.
**Erkenntnis aus den echten Daten:** Das Feld `art` enthält **keine kryptischen
Codes, sondern bereits Klartext** — 15 Kategorien (Strom bzw. TK-Versorgung,
Bauliche Sondernutzung, Fernwärmeversorgung, Gas bzw. Wasserversorgung,
Straßenbau, Kanalbau, Gleisbau, Brückenbau, Tunnelbau, Haltestellenumbau mit
Straßenumgestaltung, Stützwand, Abbruch/Rückbau, geänderte Verkehrsführung im
Zuge von Baumaßnahmen, Baugrunduntersuchung, Kraneinsatz).
**Erledigt:** `classifyArt` übernimmt bereits lesbare Kategorien direkt
(`known=true`), kryptische Codes behalten den Fallback „Baustelle (…)"; ART_MAP
bleibt als Override-Punkt, `scripts/test-classify.mjs` deckt beides ab. Die 15
Kategorien sind im Modul dokumentiert.

### ⬜ #16 Push-/Abo-Idee evaluieren
Prüfen, ob ein abonnierbarer Feed pro Stadtteil (von der Action vorgeneriert)
ohne Backend machbar ist. — **offen.**

### ⬜ #17 Kalender-Export geplanter Baustellen
`.ics` für „bald geplante" Sperrungen in einem gewählten Umkreis. — **offen.**

### ⬜ #19 ÖPNV-/Transit-Routing für „Mein Arbeitsweg"
Das Feature „Mein Arbeitsweg" (siehe `FEATURE-BACKLOG.md` F-1) deckt zunächst nur
Fuß/Rad/Auto ab, weil Straßen-Routing keine Bus-/Tramlinien kennt. Für ÖPNV eine
transit-taugliche Variante evaluieren (GTFS/Transit-Routing) — deutlich
aufwändiger, daher bewusst später. — **offen.**

### ✅ #18 Datenqualitäts-Report
Auffälligkeiten protokollieren (leere Felder, unbekannte Codes) für strukturiertes
Feedback an die Stadt.
**Erledigt:** `scripts/quality-report.mjs` erzeugt `data/QUALITY.md` — leere
Pflichtfelder (mit Beispielen), unbekannte art-Kategorien, Datumsauffälligkeiten
(Ende vor Beginn, abgelaufen), Koordinaten außerhalb Karlsruhes, Vorgänge ohne
Vorgangsnummer und die Zuordnung der `sperrung`-Werte zur Ampel. Bei jedem Lauf ins
Action-Job-Summary geschrieben, committet nur bei Datenänderung. Der Report deckte
prompt drei Ampel-Fehlklassifizierungen auf (u. a. „keine Verkehrsbehinderung"),
die daraufhin behoben wurden — das amtliche `sperrung`-Feld ist jetzt autoritativ.

---

## Review-Befunde Desktop-UI (2026-07-24)

Feinschliff aus einem Desktop-Review (Karte + Liste, Dark-Mode). Alle post-v1,
nicht blockierend. Der Review-Befund „Marker-Clustering in der Innenstadt" ist
bewusst **nicht** aufgenommen (größeres Vorhaben, ggf. separater Feature-Eintrag).

### ⬜ #20 `role="application"` von der Karte entfernen
`index.html:83` setzt `role="application"` auf `#map`. Das fängt Screenreader in
den Application-Modus, obwohl die Karte einen vollwertigen Listen-Fallback hat —
die interaktive Bedienung läuft ohnehin über Liste und Filter.
**DoD:** `role` entfernt oder auf `role="region"` geändert, `aria-label` bleibt;
kurzer Screenreader-/Tastatur-Gegencheck. (Label: `a11y`)

### ⬜ #21 Kennzahlen-Kacheln: klickbar oder klar als Anzeige
Die Kacheln „Vollsperrungen" / „Behinderungen" (`index.html:74–78`) spiegeln den
Sperrgrad-Filter, sind aber nicht interaktiv — Nutzer erwarten Klick = Filter.
Entweder klickbar machen (setzt den Sperrgrad-Filter) oder visuell klar als reine
Anzeige kennzeichnen. Nebenbefund: Die Baustellen-Zahl erscheint doppelt (Kachel
+ Listenkopf „N Baustellen").
**DoD:** Entscheidung getroffen und umgesetzt; bei Klickbarkeit `aria-pressed` +
Tastaturbedienung analog zu den Segment-Buttons, sonst visuelle Entkopplung;
Doppelzählung aufgelöst oder bewusst behalten. (Label: `frontend`, `enhancement`)

### ⬜ #22 Badge-Kontrast im Dark-Mode
`styles.css:341`: `.badge { background: var(--bg) }`. Im Dark-Mode ist `--bg`
(#16181c) dunkler als die Kartenfläche `--surface` (#1f2329) — der Badge (z. B.
„Auto") wirkt wie ausgestanzt statt als aufliegender Chip.
**DoD:** Badge-Fläche im Dark-Mode nicht dunkler als die Karte (getönte Fläche
oder Akzent-Rand); Light-Mode unverändert; WCAG-AA-Kontrast gewahrt. (Label: `frontend`)

### ⬜ #23 Vertikaler Platz über der Karte (Desktop)
Header + Suche + drei Filtergruppen + Kennzahlen stapeln vertikal; auf
Laptop-Höhe (~1080p) startet die Karte erst bei ~40 % des Viewports. Kompaktere
Anordnung prüfen (Filter/Kennzahlen enger oder einzeilig nebeneinander).
**DoD:** Karte auf 1080p sichtbar höher (Zielwert festlegen); Mobile-Layout und
Fokusreihenfolge unverändert. (Label: `frontend`)

---

## Zusätzlich umgesetzt (nicht im ursprünglichen Backlog)

- **Änderungsübersicht der Daten:** Commit nur bei echter Änderung,
  `data/CHANGELOG.md` (neu/entfernt/geändert mit Feld-Details), Kurzfassung in
  Commit-Message und Action-Job-Summary. Jeder geänderte Vorgang trägt eine
  kurze Notiz, was sich geändert hat — bei Änderungen außerhalb der beobachteten
  Felder ein generischer Hinweis („sonstige Angaben aktualisiert").
- **WFS-Robustheit:** mehrere Anfrage-Varianten mit Fallback; erkennt XML-Fehler
  trotz HTTP 200; CRS-Autoerkennung schützt vor Fehltransformation.
- **Leaflet lokal eingebunden** (`vendor/leaflet/`) statt CDN — keine fragile
  Drittanbieter-Laufzeitabhängigkeit.
