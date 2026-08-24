# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 24.08.2026, 10:56._

## Pipeline
- Rohdaten: **735** Features
- nach Gemeinde-Filter (Karlsruhe): **464**
- nach Deduplizierung (Vorgangsnummer): **186** Vorgänge
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
  - „mit Verkehrsbehinderung" (107×) → teil
  - „mit Vollsperrung" (47×) → voll
  - „keine Verkehrsbehinderung" (17×) → gering
  - „mit Sperrung in eine Fahrtrichtung" (15×) → teil

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 186 von 186

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
