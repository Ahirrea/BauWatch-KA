# PRD — Wo wird gebaut? (BauWatch-KA)

Produktdefinition: Problem, Zielnutzer:in, Ziele, **Nicht-Ziele**, Kernschleife,
Erfolgskriterien, Rahmenbedingungen. Ändert sich selten — Anforderungen und
Aufgaben leiten sich hieraus ab, nicht umgekehrt.

Verfeinerte Anforderungen: [`anforderungen/README.md`](./anforderungen/README.md) ·
Architekturentscheidungen: [`entscheidungen/README.md`](./entscheidungen/README.md) ·
Technische Aufgaben: [`BACKLOG.md`](./BACKLOG.md)

> Hieß bis 2026-07-25 `docs/SPEC.md`. Inhaltlich unverändert, nur nach den sieben
> PRD-Abschnitten neu geordnet und um einen expliziten „Ziele"-Abschnitt ergänzt.

## 1. Problem

Der offizielle Datensatz liegt im Transparenzportal als reiner Katalogeintrag
(WFS/GeoJSON, Lizenz, Download-Link). Für einen normalen Menschen ist er
unbrauchbar: kein Filter, keine Suche, kryptische Verwaltungscodes, und der
Datensatz enthält weit mehr als Karlsruhe (Elsass, Bruchsal, Baden-Baden,
Ettlingen, Rheinstetten).

Dieses Produkt macht aus den Rohdaten ein Werkzeug für den Alltag: statt eines
Datenkatalog-Eintrags für Entwickler eine Karte plus Liste, die die Frage
beantwortet, die Karlsruher tatsächlich haben — **„Betrifft mich das, auf meinem
Weg, mit meinem Verkehrsmittel, in meinem Zeitraum?"**

## 2. Zielnutzer:in

Eine Einwohnerin von Karlsruhe, die zu Fuß, mit dem Rad, dem Auto oder dem ÖPNV
unterwegs ist und wissen will, was ihren Weg oder ihre Straße betrifft. Sie
öffnet die Seite auf dem Handy, hat 30 Sekunden Zeit und will keine Anleitung
lesen. Kein Fachpublikum, keine Verwaltung.

## 3. Ziele

- Alle heute aktiven Baustellen in Karlsruhe sind ohne Interaktion sofort
  sichtbar — auf einer Karte und in einer synchronisierten Liste.
- Betroffenheit ist in Klartext ablesbar: Ampel für den Sperrgrad, verständliche
  Art-Bezeichnung, Restdauer als „noch X Tage".
- Die Ansicht lässt sich auf das Relevante verengen: Umkreis um eine Adresse
  (1,5 km), Zeitraum, Sperrungsgrad, Verkehrsmittel.
- Bedienbar auf dem Handy, per Tastatur und mit Screenreader.
- Der Datenstand ist jederzeit sichtbar.

### Funktionsumfang (v1)

- Karte (Leaflet + OpenStreetMap) mit Baustellen als farbcodierten Markern.
- Synchronisierte Liste; Klick auf Listeneintrag zentriert die Karte.
- Filter: Zeitraum (aktiv heute / diese Woche / bald geplant / alle),
  Sperrungsgrad (Ampel), Verkehrsmittel (Fuß / Rad / Auto).
- Adress-/Umkreissuche (Geocoding über Nominatim), Umkreis 1,5 km.
- Klartext-Übersetzung der `art`-Codes, Bereinigung der HTML-Fragmente in
  `zusatzinfo`, Restdauer als „noch X Tage".
- Kennzahlen-Leiste (Anzahl, Vollsperrungen, Behinderungen).
- Responsiv bis Mobil; Tastaturbedienung; „stand"-Datum sichtbar.
- **Auf den Startbildschirm installierbar und offline nutzbar** (PWA): App-Shell
  und der zuletzt geladene Datenstand liegen auf dem Gerät, offline sichtbar
  gekennzeichnet. Siehe
  [A-3](./anforderungen/A-3-pwa-installierbar-offline.md).

## 4. Nicht-Ziele (bewusst ausgeschlossen)

- **Kein Routing / keine Navigation.** Wir zeigen Betroffenheit, nicht Umwege.
  (Aufgelöst für [A-1](./anforderungen/A-1-mein-arbeitsweg.md): Routing nur als
  optionale, nutzerausgelöste Anreicherung mit Fallback.)
- **Keine anderen Gemeinden.** Der Datensatz enthält sie, wir filtern sie raus.
- **Kein Nutzerkonto, kein Login.** Alles anonym und clientseitig.
- **Kein echtes Push.** (Abo-Variante ohne Backend siehe
  [A-2](./anforderungen/A-2-baustellen-abo-feed.md).) Der Service Worker aus
  [A-3](./anforderungen/A-3-pwa-installierbar-offline.md) wäre die technische
  Voraussetzung dafür — er hat deshalb **bewusst keinen `push`-,
  `notificationclick`- oder `sync`-Handler**, und `scripts/test-pwa.mjs` prüft das.
- **Kein Melde-Rückkanal** an die Stadt (evtl. später).
- **Keine eigene Datenhaltung** über das committete GeoJSON hinaus. Der
  Offline-Cache aus [A-3](./anforderungen/A-3-pwa-installierbar-offline.md) hält
  nur **dieselben ausgelieferten Dateien** auf dem Gerät vor — nichts
  Nutzerbezogenes, nichts, was nicht ohnehin geladen wurde, jederzeit über die
  Browser-Einstellungen löschbar.
- **Kein Backend, kein Build-Schritt fürs Frontend.** Siehe
  [ADR-001](./entscheidungen/ADR-001-statisches-hosting.md).

## 5. Kernschleife

1. Nutzerin öffnet die Seite → sieht sofort alle heute aktiven Baustellen in
   Karlsruhe auf Karte und in einer Liste.
2. Sie gibt eine Adresse ein → Ansicht verengt sich auf den Umkreis, sortiert
   nach Entfernung.
3. Sie filtert nach Verkehrsmittel, Sperrungsgrad, Zeitraum → sieht nur noch
   Relevantes, in Klartext, mit Ampel und Restdauer.

Diese Schleife muss schnell, verständlich und ohne Anleitung bedienbar sein.
Alles andere ist nachrangig.

## 6. Erfolgskriterien

- Ein Ortsunkundiger findet in unter 30 Sekunden heraus, ob seine Straße
  betroffen ist.
- Die Seite lädt ohne Server und verursacht keine laufenden Kosten.
- Die Daten sind nie älter als der letzte Action-Lauf, und der Stand ist sichtbar.
  **Mit Netz gilt das unverändert** — der Datenabruf ist network-first, ein
  gecachter Snapshot überstimmt den frischen nie. **Ohne Netz** zeigt die Seite
  den zuletzt geladenen Stand, dann aber ausdrücklich als „offline, aus dem
  Gerätespeicher" gekennzeichnet: transparent veraltet statt gar nichts
  (siehe [A-3](./anforderungen/A-3-pwa-installierbar-offline.md)).

## 7. Rahmenbedingungen

- **Datenquelle:** WFS-Endpoint der Stadt Karlsruhe (`mobil.trk.de/geoserver`),
  Layer `TBA:baustellen_aktuell`, Format GeoJSON. Koordinaten in EPSG:25832
  (UTM 32N), müssen nach WGS84 transformiert werden. Jeder Vorgang erscheint
  doppelt (Punkt + Polygon) und wird über `vorgangsnummer` dedupliziert. Feld
  `gemeinde` filtert auf `"Karlsruhe"` (Elsass-Einträge haben `null`).
- **Geocoding:** Nominatim (OpenStreetMap) für die Adress-/Umkreissuche — der
  einzige Live-Aufruf aus dem Browser. Nutzungsrichtlinie beachten (Rate-Limit,
  `User-Agent`/Referer).
- **Lizenz Daten:** Creative Commons Namensnennung 4.0 (CC-BY 4.0). Der
  Quellenverweis „Datensatz ‚Baustellen', Stadt Karlsruhe" wird im Footer geführt.
- **Lizenz Code:** MIT (siehe `LICENSE`).
- **Kosten:** null. Hosting über GitHub Pages, Datenaktualisierung über GitHub
  Actions, alle Datenquellen kostenfrei.
- **Sprache:** Deutsch — Code-Kommentare, Commits, Docs und UI.
