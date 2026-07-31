# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 31.07.2026, 05:37._

## Pipeline
- Rohdaten: **796** Features
- nach Gemeinde-Filter (Karlsruhe): **478**
- nach Deduplizierung (Vorgangsnummer): **196** Vorgänge
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
  - „mit Verkehrsbehinderung" (114×) → teil
  - „mit Vollsperrung" (50×) → voll
  - „mit Sperrung in eine Fahrtrichtung" (19×) → teil
  - „keine Verkehrsbehinderung" (13×) → gering

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 196 von 196

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
