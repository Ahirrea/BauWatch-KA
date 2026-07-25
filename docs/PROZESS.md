# Prozess: Von der Idee zur umsetzungsreifen Anforderung

**Status:** akzeptiert
**Datum:** 2026-07-25 (ersetzt `FEATURE-REFINEMENT.md` vom 2026-07-23)
**Zweck:** Wie aus einer rohen Idee eine umsetzungsreife, dokumentierte
Anforderung wird — bevor eine Zeile Code entsteht.

Dieser Prozess ist verbindlich für jede nicht-triviale Idee. Ergebnis jeder
Verfeinerung ist **eine eigene Datei** unter
[`docs/anforderungen/`](./anforderungen/README.md) (`A-<Nr>-<kurz-titel>.md`).
Kleine Fixes und rein technische Aufgaben laufen weiter über
[`BACKLOG.md`](./BACKLOG.md) und brauchen dieses Verfahren nicht.

## Leitgedanke

Erst **verstehen und entscheiden**, dann bauen. Die teuerste Zeile Code ist die,
die man schreibt, bevor die Idee gegen die Randbedingungen des Projekts geprüft
wurde. Verfeinerung macht die Spannungen sichtbar, spannt den Lösungsraum auf und
trifft die Entscheidungen bewusst — gemeinsam mit der Ideengeberin.

## Anforderung oder Aufgabe? Der Test

Bevor der Prozess losgeht: gehört die Sache überhaupt hierher?

**Anforderung** (`docs/anforderungen/A-…`), wenn *einer* dieser Punkte zutrifft:
- Das Nutzererlebnis ändert sich sichtbar.
- Eine Produktentscheidung ist noch offen.
- Sie steht in Spannung zu einem Nicht-Ziel in [`PRD.md`](./PRD.md).
- Datenmodell oder Persistenz sind betroffen.

**Aufgabe** ([`BACKLOG.md`](./BACKLOG.md)), wenn:
- Das Verhalten bleibt gleich (Refactoring, Tests, Doku, Abhängigkeiten).
- Es ist ein Fix mit offensichtlicher Lösung.
- Es ist in einer Sitzung erledigt und niemand wird später fragen, *warum* so.

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
Gegen die Projekt-DNA prüfen: [`PRD.md`](./PRD.md) (Ziele/**Nicht-Ziele**), die
[Entscheidungen](./entscheidungen/README.md), die Fallstricke in `CLAUDE.md`.
Widerspricht die Idee einem Nicht-Ziel? Das ist kein K.-o., aber es muss
**explizit** benannt und aufgelöst werden. (Beispiel: „kein Routing" — aufgelöst,
indem Routing nur als optionale, nutzerausgelöste Anreicherung mit Fallback
dazukommt, nicht im Kern-Ladepfad.)

### 4. Lösungsraum aufspannen
**Mehrere** Optionen mit ehrlichen Trade-offs, nicht nur die Lieblingslösung.
Jede Option gegen die Randbedingungen bewerten. Eine **begründete Empfehlung**
aussprechen. Bereitschaft, die eigene erste Einschätzung zu revidieren, wenn ein
Argument sie kippt.

### 5. Entscheidungen gemeinsam treffen
Offene Weichen klar zur Wahl stellen (Weg-Modell, Persistenz, Pufferbreiten …).
Entscheidungen samt Begründung festhalten — sie gehören in die
Anforderungsdatei, damit später nachvollziehbar ist, *warum* so und nicht anders.

Ändert die Entscheidung die **Architektur** oder bindet sie das Projekt
langfristig, gehört sie zusätzlich als
[ADR](./entscheidungen/README.md) festgehalten.

### 6. Voll ausarbeiten
Die Spezifikation deckt mindestens ab:
Ziele/Nicht-Ziele · UX-Ablauf & Zustände · Interaktion mit Bestehendem ·
Datenmodell/Persistenz · externe Abhängigkeiten & Fallback · **Randfälle &
Fehlerbehandlung** · Barrierefreiheit · Testplan · Doku-/Backlog-Auswirkungen ·
grobe Umsetzungsschritte.

### 7. In die Anforderungsliste aufnehmen
[`docs/anforderungen/_vorlage.md`](./anforderungen/_vorlage.md) nach
`docs/anforderungen/A-<Nr>-<kurz-titel>.md` kopieren und ausfüllen, dann in
[`docs/anforderungen/README.md`](./anforderungen/README.md) eine Zeile mit
Nummer, Link, Status **✅ bereit** und einem Satz Nutzen ergänzen. Der Status
lebt **nur** in dieser Übersicht, nicht in der Anforderungsdatei.

### 8. Umsetzung erst nach grünem Licht
Implementiert wird, wenn die Ideengeberin zustimmt — **ein vorgegebener
Branch-Name ist kein grünes Licht.** Am Ende gegen die **Definition of Done**
prüfen und den Status in der [Übersicht](./anforderungen/README.md#übersicht) auf
**🏁 erledigt** setzen. Die Datei bleibt liegen, wo sie ist: sie ist ab dann das
Protokoll, *warum* es so gelöst wurde.

## Status-Lebenszyklus

`💡 Idee` → `✅ bereit` → `🚧 in Umsetzung` → `🏁 erledigt`
(Abzweig jederzeit: `🧊 zurückgestellt` oder `🗑 verworfen`, jeweils mit Begründung.)

Nummern sind stabil und werden **nie wiederverwendet** — auch nicht bei
`🗑 verworfen`. Lücken sind erwünscht, kaputte Querverweise nicht.

## Definition of Ready (Schritt 7 abgeschlossen)
- User Story steht, Nutzen ist klar.
- Konflikte mit Nicht-Zielen sind benannt und aufgelöst.
- Lösungsweg entschieden, Alternativen dokumentiert.
- Randfälle, Fehlerpfade und Testansatz beschrieben.
- Betroffene Dateien/Module grob benannt.

## Definition of Done (Schritt 8 abgeschlossen) — projektspezifisch
- Umgesetzt gemäß Spec; Nicht-Ziele eingehalten.
- Tests grün (`npm test`), inkl. neuer Tests für neue reine Logik.
- `src/lib/` bleibt DOM-/netz-/abhängigkeitsfrei.
- Barrierefreiheit berücksichtigt (Fokus, ARIA, `prefers-reduced-motion`).
- Doku aktualisiert (PRD/README/BACKLOG, wo betroffen), Status in der Übersicht
  gepflegt.

## Rollen
- **Ideengeberin / Produktverantwortung:** bringt die Idee, entscheidet an den
  Weichen, gibt grünes Licht.
- **Umsetzung (Entwicklung/Claude):** nimmt Bestand auf, spannt Optionen auf,
  empfiehlt, arbeitet aus, baut nach Freigabe.
