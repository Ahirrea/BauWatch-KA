# Datenqualitäts-Report

_Automatisch beim Daten-Build erzeugt. Stand: 08.08.2026, 04:04._

## Pipeline
- Rohdaten: **709** Features
- nach Gemeinde-Filter (Karlsruhe): **422**
- nach Deduplizierung (Vorgangsnummer): **166** Vorgänge
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
  - „mit Verkehrsbehinderung" (95×) → teil
  - „mit Vollsperrung" (44×) → voll
  - „mit Sperrung in eine Fahrtrichtung" (17×) → teil
  - „keine Verkehrsbehinderung" (10×) → gering

## Geometrie & Identität
- **Koordinaten außerhalb des Karlsruher Rahmens:** keine

- **Vorgänge ohne Vorgangsnummer (Dedup-Fallback):** keine

- **Vorgänge mit Fläche (properties.area):** 166 von 166

- **Vorgänge ohne Fläche (nur Punkt-Geometrie):** keine
