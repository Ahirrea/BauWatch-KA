# Feature-Backlog

Verfeinerte Feature-Ideen — Ergebnis des
[Feature-Refinement-Prozesses](../FEATURE-REFINEMENT.md). Hier stehen
**ausgearbeitete Features** mit getroffenen Entscheidungen und Definition of Done,
nicht rohe Einfälle. Rein technische Aufgaben und kleine Fixes laufen weiter über
[`BACKLOG.md`](../BACKLOG.md).

**Je Feature eine Datei** in diesem Ordner (`F-<Nr>-<kurz-titel>.md`). Diese
Übersicht ist der Einstieg — und die **einzige Quelle für den Status**: die
Feature-Dateien selbst führen keinen Status, damit nichts auseinanderlaufen kann.

**Statuslegende:** `💡 Idee` · `🔧 in Verfeinerung` · `✅ verfeinert / umsetzungsbereit`
· `🚧 in Umsetzung` · `🏁 erledigt` · `🧊 zurückgestellt` · `🗑 verworfen`

## Übersicht

| Nr. | Feature | Status | Worum es geht |
|---|---|---|---|
| F-1 | [Mein Arbeitsweg](./F-1-mein-arbeitsweg.md) | ✅ verfeinert / umsetzungsbereit | Zeigt beim Öffnen, ob auf dem hinterlegten Weg (Start → Ziel, ein Verkehrsmittel) Baustellen liegen. |
| F-2 | [Baustellen-Abo (statischer Feed)](./F-2-baustellen-abo-feed.md) | ✅ verfeinert / umsetzungsbereit | Änderungen (neu/geändert/entfernt) als statischer Atom-Feed für den Feed-Reader — ohne Backend, ohne echtes Push. |
| F-3 | [Als App installierbar & offline nutzbar (PWA)](./F-3-pwa-installierbar-offline.md) | ✅ verfeinert / umsetzungsbereit | Seite auf den Startbildschirm installierbar; Shell und zuletzt geladene Daten offline nutzbar, mit sichtbarem Stand. |

## Neues Feature aufnehmen

Schritt 7 des [Refinement-Prozesses](../FEATURE-REFINEMENT.md):

1. [`_vorlage.md`](./_vorlage.md) nach `F-<nächste Nr>-<kurz-titel>.md` kopieren
   und ausfüllen (Nummern werden nicht wiederverwendet, auch nicht bei `🗑 verworfen`).
2. In der Tabelle oben eine Zeile ergänzen: Nummer, Link, Status, ein Satz Nutzen.
3. Status ausschließlich hier pflegen — auch später bei `🚧` und `🏁`.
