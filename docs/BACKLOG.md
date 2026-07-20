# Backlog

Jeder Punkt ist als eigenständiges GitHub-Issue gedacht. Titel = Issue-Titel,
darunter Kontext und Definition of Done. Reihenfolge = grobe Bauabfolge.
Labels-Vorschlag: `setup`, `data`, `frontend`, `a11y`, `docs`, `enhancement`.

---

## Milestone 1 — Gerüst & Daten-Pipeline

Ziel: Repo steht, die Action erzeugt sauberes GeoJSON, Seite ist online (leer).

### #1 Repo-Grundgerüst anlegen
Ordnerstruktur gemäß ADR-001, leeres `index.html`, `src/`, `scripts/`, `data/`,
Lizenzdatei (MIT o. ä.), `.gitignore`, README mit Kurzbeschreibung + Link zur SPEC.
**DoD:** Struktur existiert, Repo lässt sich klonen und öffnen.

### #2 Geteilte Bibliotheksmodule (`src/lib/`)
`transform.js` (UTM32→WGS84, aus Prototyp portiert, mit Referenztest),
`classify.js` (art→Klartext, Sperrgrad-Ampel, Verkehrsmittel-Betroffenheit),
`format.js` (Restdauer, HTML-Bereinigung). ES-Module, ohne DOM-Abhängigkeit,
damit Build-Skript und Client sie teilen.
**DoD:** Module exportieren reine Funktionen; ein Mini-Testscript prüft
`transform` gegen bekannte Referenzkoordinaten.

### #3 Build-Skript `scripts/build-data.mjs`
Zieht WFS-GeoJSON, filtert `gemeinde="Karlsruhe"`, dedupliziert Punkt/Polygon,
transformiert Koordinaten, bereinigt Felder, schreibt schlankes
`data/baustellen.geojson` (nur benötigte Properties + `stand`).
**DoD:** Lokaler Lauf erzeugt valide, verkleinerte Datei; Fehlerfall (API down)
bricht sauber ab, ohne die vorhandene Datei zu zerstören.

### #4 GitHub Action `update-data.yml`
Cron (Vorschlag alle 3–6 h) + `workflow_dispatch`. Führt Build-Skript aus,
committet `data/baustellen.geojson` nur bei Änderung.
**DoD:** Action läuft grün, committet bei geänderten Daten, überspringt Commit
bei identischen Daten.

### #5 GitHub Pages aktivieren
Deployment aus `main` (bzw. `gh-pages`). Domain/Pfad dokumentieren.
**DoD:** `index.html` ist öffentlich erreichbar.

---

## Milestone 2 — Kern-UI (die Kernschleife)

Ziel: Karte + Liste + Filter aus dem Prototyp, jetzt auf echten Daten.

### #6 Karte + Marker aus statischem GeoJSON
Leaflet-Karte, Baustellen als farbcodierte Marker (Ampel), Popup mit Klartext.
Lädt `data/baustellen.geojson`.
**DoD:** Alle KA-Baustellen erscheinen korrekt verortet.

### #7 Synchronisierte Liste
Liste neben/unter der Karte, Klick zentriert Karte und öffnet Popup.
Restdauer, Verursacher, Verkehrsmittel-Betroffenheit sichtbar.
**DoD:** Liste und Karte zeigen dieselbe gefilterte Menge; Interaktion beidseitig.

### #8 Filter: Zeitraum, Sperrgrad, Verkehrsmittel
Segment-Buttons wie im Prototyp; Filter kombinierbar; Kennzahlen-Leiste
aktualisiert sich live.
**DoD:** Jede Filterkombination liefert konsistente Liste + Karte + Zahlen.

### #9 Adress-/Umkreissuche
Nominatim-Geocoding (mit korrektem `User-Agent`/Referer und Rate-Limit-Respekt),
1,5-km-Umkreis, Distanzsortierung, Umkreis-Kreis auf Karte, Reset-Knopf.
**DoD:** Adresse in KA führt zu Umkreisansicht; Fehlerfall zeigt hilfreiche
Meldung, App bleibt bedienbar.

### #10 Leerzustände & Ladezustände
Aussagekräftige Texte statt leerer Fläche (kein Treffer, Laden, Datenfehler).
**DoD:** Jeder Zustand hat eine handlungsleitende Meldung.

---

## Milestone 3 — Qualität & Feinschliff

### #11 Responsiv & Mobil
Layout bis Smartphone; Karte und Liste sinnvoll gestapelt.
**DoD:** Auf 360px-Breite voll bedienbar.

### #12 Barrierefreiheit
Sichtbarer Tastaturfokus, Kontraste, ARIA für Segment-Buttons,
`prefers-reduced-motion` respektiert.
**DoD:** Per Tastatur vollständig bedienbar; Kontraste bestehen WCAG-AA.

### #13 Namensnennung, Impressum-Hinweis, Datenstand
CC-BY-Verweis, „Stand"-Anzeige, Haftungshinweis (verbindlich ist Beschilderung
vor Ort).
**DoD:** Rechtlich sauberer Footer; Stand sichtbar.

### #14 README für Beitragende
Setup, lokaler Build, wie die Action funktioniert, wie man Klartext-Mappings
ergänzt.
**DoD:** Fremde Person kann Projekt lokal starten und ein art-Mapping ergänzen.

---

## Milestone 4 — Optional / später (bewusst nach v1)

### #15 art-Code-Mapping vervollständigen
Alle im Datensatz real vorkommenden Codes durchgehen und übersetzen,
inkl. Fallback-Strategie für unbekannte.

### #16 Push-/Abo-Idee evaluieren
Da rein statisch: prüfen, ob z. B. ein abonnierbarer Feed pro Stadtteil
(vorgeneriert von der Action) machbar ist — ohne Backend.

### #17 Kalender-Export geplanter Baustellen
`.ics` für „bald geplante" Sperrungen in einem gewählten Umkreis.

### #18 Datenqualitäts-Report
Die Action protokolliert Auffälligkeiten (leere Felder, unbekannte Codes),
damit man der Stadt strukturiertes Feedback geben kann.
