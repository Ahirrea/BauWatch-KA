# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 05.08.2026, 16:25._

## Pipeline
- Rohdaten: **751** Features
- nach Gemeinde-Filter (Karlsruhe): **448**
- nach Deduplizierung (Vorgangsnummer): **176** Vorgänge
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
  - „mit Verkehrsbehinderung" (99×) → teil
  - „mit Vollsperrung" (49×) → voll
  - „mit Sperrung in eine Fahrtrichtung" (17×) → teil
  - „keine Verkehrsbehinderung" (11×) → gering

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 176 von 176

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
