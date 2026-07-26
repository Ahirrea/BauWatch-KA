# Entscheidungen (ADRs)

Architektur- und Grundsatzentscheidungen, je Entscheidung eine Datei
(`ADR-<Nr>-<kurz-titel>.md`). Dieser Ordner ist **append-only**: ein ADR wird
nie umgeschrieben. Kehrt eine Entscheidung sich um, entsteht ein **neuer** ADR
und der alte bekommt `Status: ersetzt durch ADR-<Nr>`. So bleibt nachvollziehbar,
was wann warum galt.

Ein ADR entsteht, wenn eine Entscheidung die Architektur ändert oder das Projekt
langfristig bindet (Schritt 5 des [Prozesses](../PROZESS.md)). Weichen innerhalb
einer einzelnen Anforderung bleiben in der Anforderungsdatei.

## Übersicht

| Nr. | Entscheidung | Status | Kern |
|---|---|---|---|
| [ADR-001](./ADR-001-statisches-hosting.md) | Statisches Hosting mit periodischem Daten-Snapshot | akzeptiert | Eine GitHub Action übernimmt die Server-Rolle: sie ruft den WFS ab und committet fertiges GeoJSON ins Repo. Kein Backend, keine Kosten, kein CORS-Problem. |
| [ADR-002](./ADR-002-mehrseitige-auslieferung.md) | Mehrseitige Auslieferung und pfadbewusste Service-Worker-Navigation | akzeptiert | Die App ist nicht mehr einseitig. `navigationAntwort()` liefert den angefragten Pfad aus dem Shell-Cache statt jeder Navigation `index.html`; jede neue HTML-Seite ist `SHELL`- und `CACHE_SHELL`-pflichtig. |

## Neuen ADR anlegen

1. Nächste freie Nummer nehmen (dreistellig, `ADR-002`, …). Nummern werden nie
   wiederverwendet.
2. Datei nach dem Muster unten anlegen.
3. Zeile in der Tabelle oben ergänzen.
4. Kehrt der ADR eine frühere Entscheidung um: im alten ADR `Status:` auf
   `ersetzt durch ADR-<Nr>` setzen — das ist die **einzige** erlaubte Änderung an
   einem bestehenden ADR.

## Aufbau

```markdown
# ADR-<Nr>: <Titel>

**Status:** vorgeschlagen | akzeptiert | ersetzt durch ADR-<Nr>
**Datum:** <Datum>

## Kontext
<Welche Kräfte wirken? Was war die Ausgangslage?>

## Entscheidung
<Was wird getan — im Aktiv, ein Satz.>

## Begründung
<Warum diese und nicht die Alternativen.>

## Verworfene Alternativen
<je Alternative ein Satz, warum nicht.>

## Konsequenzen
<Was folgt daraus, auch das Unangenehme. Was darf jetzt nicht mehr passieren?>
```

> `ADR-001` lag bis 2026-07-25 direkt unter `docs/`. Die Nummer bleibt
> dreistellig, weil Code-Kommentare in `src/app.js`, `src/lib/transform.js`,
> `scripts/build-data.mjs` und der Workflow auf „ADR-001" verweisen.
>
> Der Abschnitt „Repo-Struktur (daraus abgeleitet)" in ADR-001 zeigt den Stand vom
> **2026-07-20** und nennt `docs/SPEC.md` — heute `docs/PRD.md`. Das ist Absicht:
> ADRs werden nicht nachträglich geglättet, sonst verliert man, was damals
> tatsächlich beschlossen wurde.
