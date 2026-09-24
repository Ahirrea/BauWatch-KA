# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 24.09.2026, 15:28._

## Pipeline
- Rohdaten: **864** Features
- nach Gemeinde-Filter (Karlsruhe): **458**
- nach Deduplizierung (Vorgangsnummer): **192** Vorgänge
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
  - „mit Verkehrsbehinderung" (113×) → teil
  - „mit Vollsperrung" (52×) → voll
  - „mit Sperrung in eine Fahrtrichtung" (16×) → teil
  - „keine Verkehrsbehinderung" (11×) → gering

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 192 von 192

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
