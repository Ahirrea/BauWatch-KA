# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 07.09.2026, 00:03._

## Pipeline
- Rohdaten: **708** Features
- nach Gemeinde-Filter (Karlsruhe): **412**
- nach Deduplizierung (Vorgangsnummer): **166** Vorgänge
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

- **beginnt erst später (von in der Zukunft, zum Build-Zeitpunkt):** keine

## Kategorien & Sperrung
- **unbekannte art-Kategorien:** keine (alle als Klartext erkannt)

- **erkannte Sperrung-Werte → Ampel:**
  - „mit Verkehrsbehinderung" (91×) → teil
  - „mit Vollsperrung" (51×) → voll
  - „keine Verkehrsbehinderung" (13×) → gering
  - „mit Sperrung in eine Fahrtrichtung" (11×) → teil

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 166 von 166

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
