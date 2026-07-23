# Feature-Refinement — fester Prozess

**Status:** akzeptiert
**Datum:** 2026-07-23
**Zweck:** Wie aus einer rohen Feature-Idee eine umsetzungsreife, dokumentierte
Spezifikation wird — bevor eine Zeile Code entsteht.

Dieser Prozess ist verbindlich für jede nicht-triviale Feature-Idee. Ergebnis
jeder Verfeinerung ist ein Eintrag in [`FEATURE-BACKLOG.md`](./FEATURE-BACKLOG.md).
Kleine Fixes und rein technische Aufgaben laufen weiter über
[`BACKLOG.md`](./BACKLOG.md) und brauchen dieses Verfahren nicht.

## Leitgedanke

Erst **verstehen und entscheiden**, dann bauen. Die teuerste Zeile Code ist die,
die man schreibt, bevor die Idee gegen die Randbedingungen des Projekts geprüft
wurde. Refinement macht die Spannungen sichtbar, spannt den Lösungsraum auf und
trifft die Entscheidungen bewusst — gemeinsam mit der Ideengeberin.

## Die Schritte

### 1. Idee erfassen
User Story in einem Satz: **Als \<Rolle\> möchte ich \<Ziel\>, um \<Nutzen\>.**
Noch keine Lösung, nur das Bedürfnis.

### 2. Bestandsaufnahme im Code
Was existiert schon und dockt an? Welche Module, Felder, Funktionen sind
betroffen? Ehrlich benennen, was wiederverwendbar ist und was fehlt. (Beispiel
Arbeitsweg: Verkehrsmittel-Filter und Nominatim-Suche waren schon da, es fehlte
nur Weg-Geometrie und Persistenz.)

### 3. Spannungen & Randbedingungen sichtbar machen
Gegen die Projekt-DNA prüfen: `SPEC.md` (Ziele/**Nicht-Ziele**), die ADRs, die
Fallstricke in `CLAUDE.md`. Widerspricht die Idee einem Nicht-Ziel? Das ist kein
K.-o., aber es muss **explizit** benannt und aufgelöst werden. (Beispiel: „kein
Routing" — aufgelöst, indem Routing nur als optionale, nutzerausgelöste
Anreicherung mit Fallback dazukommt, nicht im Kern-Ladepfad.)

### 4. Lösungsraum aufspannen
**Mehrere** Optionen mit ehrlichen Trade-offs, nicht nur die Lieblingslösung.
Jede Option gegen die Randbedingungen bewerten. Eine **begründete Empfehlung**
aussprechen. Bereitschaft, die eigene erste Einschätzung zu revidieren, wenn ein
Argument sie kippt.

### 5. Entscheidungen gemeinsam treffen
Offene Weichen klar zur Wahl stellen (Weg-Modell, Persistenz, Pufferbreiten …).
Entscheidungen samt Begründung festhalten — sie gehören in den Backlog-Eintrag,
damit später nachvollziehbar ist, *warum* so und nicht anders.

### 6. Voll ausarbeiten
Die Spezifikation deckt mindestens ab:
Ziele/Nicht-Ziele · UX-Ablauf & Zustände · Interaktion mit Bestehendem ·
Datenmodell/Persistenz · externe Abhängigkeiten & Fallback · **Randfälle &
Fehlerbehandlung** · Barrierefreiheit · Testplan · Doku-/Backlog-Auswirkungen ·
grobe Umsetzungsschritte.

### 7. In den Feature-Backlog aufnehmen
Eintrag in `FEATURE-BACKLOG.md` nach der dortigen Vorlage anlegen, Status auf
**verfeinert / umsetzungsbereit** setzen.

### 8. Umsetzung erst nach grünem Licht
Implementiert wird auf einem Feature-Branch, erst wenn die Ideengeberin zustimmt.
Am Ende gegen die **Definition of Done** prüfen und den Backlog-Status auf
**erledigt** setzen.

## Status-Lebenszyklus eines Eintrags

`💡 Idee` → `🔧 in Verfeinerung` → `✅ verfeinert / umsetzungsbereit`
→ `🚧 in Umsetzung` → `🏁 erledigt`
(Abzweig jederzeit: `🧊 zurückgestellt` oder `🗑 verworfen`, jeweils mit Begründung.)

## Definition of Ready (Schritt 7 abgeschlossen)
- User Story steht, Nutzen ist klar.
- Konflikte mit Nicht-Zielen sind benannt und aufgelöst.
- Lösungsweg entschieden, Alternativen dokumentiert.
- Randfälle, Fehlerpfade und Testansatz beschrieben.
- Betroffene Dateien/Module grob benannt.

## Definition of Done (Schritt 8 abgeschlossen)
- Umgesetzt gemäß Spec; Nicht-Ziele eingehalten.
- Tests grün (`npm test`), inkl. neuer Tests für neue reine Logik.
- `src/lib/` bleibt DOM-/netz-/abhängigkeitsfrei.
- Barrierefreiheit berücksichtigt (Fokus, ARIA, `prefers-reduced-motion`).
- Doku aktualisiert (SPEC/README/BACKLOG, wo betroffen), Backlog-Status gepflegt.

## Rollen
- **Ideengeberin / Produktverantwortung:** bringt die Idee, entscheidet an den
  Weichen, gibt grünes Licht.
- **Umsetzung (Entwicklung/Claude):** nimmt Bestand auf, spannt Optionen auf,
  empfiehlt, arbeitet aus, baut nach Freigabe.
