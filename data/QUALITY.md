# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 30.07.2026, 16:21._

## Pipeline
- Rohdaten: **814** Features
- nach Gemeinde-Filter (Karlsruhe): **482**
- nach Deduplizierung (Vorgangsnummer): **198** Vorgänge
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
  - „mit Verkehrsbehinderung" (118×) → teil
  - „mit Vollsperrung" (47×) → voll
  - „mit Sperrung in eine Fahrtrichtung" (20×) → teil
  - „keine Verkehrsbehinderung" (13×) → gering

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 198 von 198

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
