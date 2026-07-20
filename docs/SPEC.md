# Wo wird gebaut? — Baustellen in Karlsruhe

Eine bürgernahe Ansicht der offenen Baustellen-Daten der Stadt Karlsruhe.
Statt eines Datenkatalog-Eintrags für Entwickler: eine Karte plus Liste, die
die Frage beantwortet, die Karlsruher tatsächlich haben — **„Betrifft mich das,
auf meinem Weg, mit meinem Verkehrsmittel, in meinem Zeitraum?"**

## Problem

Der offizielle Datensatz liegt im Transparenzportal als reiner Katalogeintrag
(WFS/GeoJSON, Lizenz, Download-Link). Für einen normalen Menschen ist er
unbrauchbar: kein Filter, keine Suche, kryptische Verwaltungscodes, und der
Datensatz enthält weit mehr als Karlsruhe (Elsass, Bruchsal, Baden-Baden,
Ettlingen, Rheinstetten). Dieses Produkt macht aus den Rohdaten ein Werkzeug
für den Alltag.

## Zielgruppe

Einwohnerinnen und Einwohner von Karlsruhe, die zu Fuß, mit dem Rad, dem Auto
oder dem ÖPNV unterwegs sind und wissen wollen, was ihren Weg oder ihre Straße
betrifft. Kein Fachpublikum, keine Verwaltung.

## Die Kernschleife

1. Nutzer öffnet die Seite → sieht sofort alle heute aktiven Baustellen in
   Karlsruhe auf Karte und in einer Liste.
2. Nutzer gibt eine Adresse ein → Ansicht verengt sich auf den Umkreis,
   sortiert nach Entfernung.
3. Nutzer filtert nach Verkehrsmittel, Sperrungsgrad, Zeitraum → sieht nur
   noch Relevantes, in Klartext, mit Ampel und Restdauer.

Diese Schleife muss schnell, verständlich und ohne Anleitung bedienbar sein.
Alles andere ist nachrangig.

## Funktionsumfang (v1)

- Karte (Leaflet + OpenStreetMap) mit Baustellen als farbcodierten Markern.
- Synchronisierte Liste; Klick auf Listeneintrag zentriert die Karte.
- Filter: Zeitraum (aktiv heute / diese Woche / bald geplant / alle),
  Sperrungsgrad (Ampel), Verkehrsmittel (Fuß / Rad / Auto).
- Adress-/Umkreissuche (Geocoding über Nominatim), Umkreis 1,5 km.
- Klartext-Übersetzung der `art`-Codes, Bereinigung der HTML-Fragmente in
  `zusatzinfo`, Restdauer als „noch X Tage".
- Kennzahlen-Leiste (Anzahl, Vollsperrungen, Behinderungen).
- Responsiv bis Mobil; Tastaturbedienung; „stand"-Datum sichtbar.

## Nicht-Ziele (bewusst ausgeschlossen in v1)

- **Kein Routing / keine Navigation.** Wir zeigen Betroffenheit, nicht Umwege.
- **Keine anderen Gemeinden.** Der Datensatz enthält sie, wir filtern sie raus.
- **Kein Nutzerkonto, kein Login.** Alles anonym und clientseitig.
- **Keine Push-Benachrichtigungen in v1** (steht als Idee im Backlog).
- **Kein Melde-Rückkanal** an die Stadt (evtl. später).
- **Keine eigene Datenhaltung** über das committete GeoJSON hinaus.

## Datenquelle

- WFS-Endpoint der Stadt Karlsruhe (`mobil.trk.de/geoserver`), Layer
  `TBA:baustellen_aktuell`, Format GeoJSON.
- Lizenz: Creative Commons Namensnennung 4.0 (CC-BY 4.0). Quellenverweis wird
  im Footer geführt.
- Koordinaten liegen in EPSG:25832 (UTM Zone 32N) und müssen nach WGS84
  transformiert werden.
- Jeder Vorgang erscheint doppelt (Punkt + Polygon) und wird dedupliziert.
- Feld `gemeinde` filtert auf `"Karlsruhe"` (Elsass-Einträge haben `null`).

## Erfolgskriterien

- Ein Ortsunkundiger findet in unter 30 Sekunden heraus, ob seine Straße
  betroffen ist.
- Die Seite lädt ohne Server, verursacht keine laufenden Kosten.
- Die Daten sind nie älter als der letzte Action-Lauf (Stand sichtbar).

## Lizenz & Namensnennung

Datensatz „Baustellen", Stadt Karlsruhe, veröffentlicht unter CC-BY 4.0.
Der Code dieses Projekts steht unter der MIT-Lizenz (siehe `LICENSE`).
