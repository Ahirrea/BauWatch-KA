# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 24.09.2026, 00:52._

## Pipeline
- Rohdaten: **865** Features
- nach Gemeinde-Filter (Karlsruhe): **456**
- nach Deduplizierung (Vorgangsnummer): **190** Vorgänge
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
  - „mit Vollsperrung" (50×) → voll
  - „mit Sperrung in eine Fahrtrichtung" (16×) → teil
  - „keine Verkehrsbehinderung" (11×) → gering

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 190 von 190

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
