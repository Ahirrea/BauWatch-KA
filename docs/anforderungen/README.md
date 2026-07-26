# Anforderungen

Verfeinerte Ideen — Ergebnis des [Refinement-Prozesses](../PROZESS.md). Hier
stehen **ausgearbeitete Anforderungen** mit getroffenen Entscheidungen und
Definition of Done, nicht rohe Einfälle. Rein technische Aufgaben und kleine
Fixes laufen weiter über [`BACKLOG.md`](../BACKLOG.md) — die Trennlinie steht im
[Prozess](../PROZESS.md#anforderung-oder-aufgabe-der-test).

**Je Anforderung eine Datei** in diesem Ordner (`A-<Nr>-<kurz-titel>.md`). Diese
Übersicht ist der Einstieg — und die **einzige Quelle für den Status**: die
Anforderungsdateien selbst führen keinen Status, damit nichts auseinanderlaufen
kann. Eine erledigte Anforderung **bleibt liegen, wo sie ist**; sie ist ab dann
das Protokoll, *warum* es so gelöst wurde.

**Zeile oder Datei?** Eine rohe Idee bleibt eine Zeile in der Tabelle. Erst bei
der Verfeinerung entsteht `A-<Nr>-<kurz-titel>.md` und die Zeile wird verlinkt —
so füllt sich der Ordner nicht mit leeren Vorlagen.

**Statuslegende:** `💡 Idee` · `✅ bereit` · `🚧 in Umsetzung` · `🏁 erledigt`
· `🧊 zurückgestellt` · `🗑 verworfen`

## Übersicht

| Nr. | Anforderung | Status | Worum es geht |
|---|---|---|---|
| A-1 | [Mein Arbeitsweg](./A-1-mein-arbeitsweg.md) | ✅ bereit | Zeigt beim Öffnen, ob auf dem hinterlegten Weg (Start → Ziel, ein Verkehrsmittel) Baustellen liegen. |
| A-2 | [Baustellen-Abo (statischer Feed)](./A-2-baustellen-abo-feed.md) | ✅ bereit | Änderungen (neu/geändert/entfernt) als statischer Atom-Feed für den Feed-Reader — ohne Backend, ohne echtes Push. |
| A-3 | [Als App installierbar & offline nutzbar (PWA)](./A-3-pwa-installierbar-offline.md) | 🏁 erledigt | Seite auf den Startbildschirm installierbar; Shell und zuletzt geladene Daten offline nutzbar, mit sichtbarem Stand. |
| A-4 | [Impressum & Datenschutzhinweis](./A-4-impressum-datenschutz.md) | 🏁 erledigt | Zwei Textseiten nennen Betreiberin und die drei realen Drittdienst-Datenflüsse — damit nachlesbar ist, wer hinter dem Angebot steht und was an Dritte geht. |

## Neue Anforderung aufnehmen

Schritt 7 des [Refinement-Prozesses](../PROZESS.md):

1. Für eine rohe Idee genügt eine neue Zeile mit Status `💡 Idee`.
2. Zur Verfeinerung [`_vorlage.md`](./_vorlage.md) nach
   `A-<nächste Nr>-<kurz-titel>.md` kopieren und ausfüllen (Nummern werden nicht
   wiederverwendet, auch nicht bei `🗑 verworfen`), dann die Zeile verlinken und
   auf `✅ bereit` setzen.
3. Status ausschließlich hier pflegen — auch später bei `🚧` und `🏁`.

> Hieß bis 2026-07-25 `docs/features/` mit `F-<Nr>`-Nummern; die Umbenennung hat
> an den Inhalten nichts geändert. `F-1`/`F-2`/`F-3` entsprechen `A-1`/`A-2`/`A-3`.
