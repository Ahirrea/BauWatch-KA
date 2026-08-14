# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 14.08.2026, 04:29._

## Pipeline
- Rohdaten: **742** Features
- nach Gemeinde-Filter (Karlsruhe): **444**
- nach Deduplizierung (Vorgangsnummer): **177** Vorgänge
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
  - „mit Verkehrsbehinderung" (102×) → teil
  - „mit Vollsperrung" (45×) → voll
  - „mit Sperrung in eine Fahrtrichtung" (16×) → teil
  - „keine Verkehrsbehinderung" (14×) → gering

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 177 von 177

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
