# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 31.08.2026, 07:08._

## Pipeline
- Rohdaten: **728** Features
- nach Gemeinde-Filter (Karlsruhe): **454**
- nach Deduplizierung (Vorgangsnummer): **182** Vorgänge
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
  - „mit Verkehrsbehinderung" (105×) → teil
  - „mit Vollsperrung" (49×) → voll
  - „keine Verkehrsbehinderung" (16×) → gering
  - „mit Sperrung in eine Fahrtrichtung" (12×) → teil

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 182 von 182

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
