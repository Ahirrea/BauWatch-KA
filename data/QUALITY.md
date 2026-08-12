# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 12.08.2026, 11:18._

## Pipeline
- Rohdaten: **754** Features
- nach Gemeinde-Filter (Karlsruhe): **458**
- nach Deduplizierung (Vorgangsnummer): **183** Vorgänge
- ohne verwertbare Geometrie übersprungen: **0**

## Leere Pflichtfelder
- **ohne Zeitraum-Beginn (von):** keine

- **ohne Zeitraum-Ende (bis):** keine

- **ohne Lage:** keine

- **ohne Verursacher:** keine

- **ohne Sperrung-Angabe:** keine

## Datumsauffälligkeiten
- **Ende vor Beginn:** keine

- **bereits abgelaufen (bis in der Vergangenheit, zum Build-Zeitpunkt):** keine

## Kategorien & Sperrung
- **unbekannte art-Kategorien:** keine (alle als Klartext erkannt)

- **erkannte Sperrung-Werte → Ampel:**
  - „mit Verkehrsbehinderung" (106×) → teil
  - „mit Vollsperrung" (46×) → voll
  - „mit Sperrung in eine Fahrtrichtung" (18×) → teil
  - „keine Verkehrsbehinderung" (13×) → gering

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 183 von 183

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
