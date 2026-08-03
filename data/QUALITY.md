# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 03.08.2026, 13:35._

## Pipeline
- Rohdaten: **717** Features
- nach Gemeinde-Filter (Karlsruhe): **432**
- nach Deduplizierung (Vorgangsnummer): **169** Vorgänge
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
  - „mit Verkehrsbehinderung" (93×) → teil
  - „mit Vollsperrung" (48×) → voll
  - „mit Sperrung in eine Fahrtrichtung" (17×) → teil
  - „keine Verkehrsbehinderung" (11×) → gering

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 169 von 169

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
