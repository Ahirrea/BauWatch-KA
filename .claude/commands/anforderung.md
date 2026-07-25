---
description: Eine Idee nach docs/PROZESS.md zu einer umsetzungsreifen Anforderung verfeinern
argument-hint: [die Idee in einem Satz]
---

Verfeinere die folgende Idee zu einer umsetzungsreifen Anforderung — **strikt nach
`docs/PROZESS.md`**. Lies den Prozess zuerst, er ist verbindlich.

**Idee:** $ARGUMENTS

## Ablauf

1. **Anforderung oder Aufgabe?** Wende den Test aus `docs/PROZESS.md` an. Ist es
   eine Aufgabe (Verhalten bleibt gleich, Lösung offensichtlich, keine offene
   Produktentscheidung), sag das und schlage einen Eintrag in `docs/BACKLOG.md`
   vor — dann ist hier Schluss.
2. **User Story** in einem Satz: Als \<Rolle\> möchte ich \<Ziel\>, um \<Nutzen\>.
3. **Bestandsaufnahme im Code.** Was dockt an, was ist wiederverwendbar, was
   fehlt? Konkrete Module, Funktionen und Felder benennen — nicht raten, nachsehen.
4. **Spannungen sichtbar machen.** Gegen `docs/PRD.md` (Ziele/**Nicht-Ziele**),
   die ADRs in `docs/entscheidungen/` und die Fallstricke in `CLAUDE.md` prüfen.
   Jeden Konflikt explizit benennen und einen Auflösungsvorschlag machen.
5. **Lösungsraum aufspannen.** Mehrere Optionen mit ehrlichen Trade-offs, jede
   gegen die Randbedingungen bewertet, dazu eine **begründete Empfehlung**.
6. **Weichen zur Entscheidung stellen.** Nutze dafür `AskUserQuestion` — offene
   Punkte, die das Ergebnis materiell verändern, entscheidet die Ideengeberin,
   nicht du.
7. **Ausarbeiten** in `docs/anforderungen/A-<nächste freie Nr>-<kurz-titel>.md`,
   kopiert aus `docs/anforderungen/_vorlage.md`. Nummern nie wiederverwenden —
   auch nicht die von verworfenen Anforderungen.
8. **Zeile ergänzen** in `docs/anforderungen/README.md`: Nummer, Link,
   Status `✅ bereit`, ein Satz Nutzen. Der Status lebt **nur** dort.

## Harte Regeln

- **Keine Umsetzung.** Dieser Command endet mit der Spezifikation. Code entsteht
  erst auf ausdrückliches grünes Licht in einer späteren Nachricht — ein
  vorgegebener Branch-Name ist keins.
- **Kein Status in der Anforderungsdatei.** Einzige Statusquelle ist die Tabelle
  in `docs/anforderungen/README.md`.
- **Ist die Entscheidung architektonisch** oder bindet sie das Projekt
  langfristig, schlage zusätzlich einen ADR in `docs/entscheidungen/` vor
  (append-only: bestehende ADRs werden nie umgeschrieben).
- Sprache: Deutsch.
