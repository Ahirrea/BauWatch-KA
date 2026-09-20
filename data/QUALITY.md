# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 20.09.2026, 06:35._

## Pipeline
- Rohdaten: **748** Features
- nach Gemeinde-Filter (Karlsruhe): **398**
- nach Deduplizierung (Vorgangsnummer): **163** Vorgänge
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
  - „mit Verkehrsbehinderung" (100×) → teil
  - „mit Vollsperrung" (42×) → voll
  - „mit Sperrung in eine Fahrtrichtung" (11×) → teil
  - „keine Verkehrsbehinderung" (10×) → gering

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 163 von 163

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
