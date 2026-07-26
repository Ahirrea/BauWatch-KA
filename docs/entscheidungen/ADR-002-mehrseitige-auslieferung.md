# ADR-002: Mehrseitige Auslieferung und pfadbewusste Service-Worker-Navigation

**Status:** akzeptiert
**Datum:** 2026-07-26
**Kontext:** Die App bekommt mit [A-4](../anforderungen/A-4-impressum-datenschutz.md)
erstmals weitere HTML-Seiten neben `index.html`. Der Service Worker war auf
Einseitigkeit gebaut.

## Problem

Bis heute bestand die ausgelieferte Anwendung aus **genau einer** HTML-Seite.
Der Service Worker (A-3) hat diese Annahme fest verdrahtet:

```js
async function navigationAntwort(request) {
  const treffer = await caches.match(INDEX_URL);   // ← jede Navigation
  if (treffer) return treffer;
  return fetch(request);
}
```

Jede Navigation — egal auf welchen Pfad — wurde aus dem Cache mit `index.html`
beantwortet. Für eine einseitige App ist das die richtige, robuste Strategie:
sie macht Deep-Links und Tippfehler offline-fest.

Sobald aber `impressum.html` dazukommt, kippt dieselbe Zeile ins Gegenteil:
**installierte** Clients bekämen unter `…/impressum.html` die Kartenseite zu
sehen. Kein Fehler, keine Meldung, keine Konsolenausgabe — einfach die falsche
Seite. Lokal fällt das nie auf, weil dort kein alter Service Worker registriert
ist. Genau diese Klasse von Fehlern ist der Grund, warum die Entscheidung
festgehalten wird und nicht nur der Code sie kennt.

Es gibt eine zweite Kraft: Ein Impressum, das offline verschwindet, während die
App offline weiterläuft, wäre eine unnötige Inkonsistenz — es sind zwei kleine
Textdateien (Entscheidung E7 in A-4).

## Entscheidung

Die Anwendung wird **mehrseitig** ausgeliefert, und `navigationAntwort()` wird
**pfadbewusst**: Sie sucht zuerst den *angefragten* Pfad im Shell-Cache, geht
sonst ins Netz und fällt erst bei Netzfehler auf die gecachte Startseite zurück.

Konkret gilt ab sofort:

1. Jede weitere HTML-Seite steht in `SHELL` und wird mit-precacht.
2. Eine Navigation auf einen Pfad **aus** `SHELL` wird cache-first aus dem
   Shell-Cache beantwortet — die richtige Seite, auch offline.
3. Eine Navigation auf einen Pfad **außerhalb** von `SHELL` geht ins Netz
   (GitHub Pages darf seine 404-Seite ausliefern). Nur wenn das Netz fehlt,
   antwortet die gecachte Startseite, damit die installierte App offline nicht
   in die Browser-Fehlerseite läuft.
4. Neue Seiten sind damit **wartungspflichtig**: `SHELL` ergänzen **und**
   `CACHE_SHELL` hochzählen, sonst sehen installierte Clients sie nie.

## Begründung

Die pfadbewusste Variante ist die kleinste Änderung, die den stillen Fehler
unmöglich macht, und sie behält die Eigenschaft, die an der alten Fassung gut
war: offline landet man nie auf einer Browser-Fehlerseite.

Der Netz-Zweig für unbekannte Pfade ist eine bewusste Verhaltensänderung
gegenüber A-3. Vorher hat der Service Worker jeden Tippfehler in der URL mit der
Kartenseite beantwortet und damit einen echten 404 der Hosting-Plattform
verschluckt. Für eine statisch gehostete Mehrseiten-Anwendung ist die
Hoster-404-Seite die ehrlichere Antwort.

## Verworfene Alternativen

- **`navigationAntwort()` unverändert lassen, Rechtstexte als Ausklapp-Abschnitt
  in `index.html`.** Billigste Lösung, kein Service-Worker-Umbau. Verworfen:
  ein Impressum in einer Ausklapp-Sektion einer Kartenseite ist schwer als
  „leicht erkennbar und unmittelbar erreichbar" zu verteidigen, und die App wäre
  auf Dauer an die Einseitigkeit gefesselt (siehe E1 in A-4).
- **Navigationen gar nicht mehr abfangen** (kein `navigate`-Zweig im
  `fetch`-Handler). Wäre am einfachsten und immer korrekt — kostet aber die
  Offline-Fähigkeit der Startseite, also das Kernversprechen von A-3.
- **Netz zuerst, Cache als Fallback für alle Navigationen.** Immer aktuelle
  Seiten, aber jeder Kaltstart wartet auf das Netz; das widerspricht dem
  „sofort da"-Anspruch der installierten App. Für die *Daten* gilt weiterhin
  network-first, für die *Shell* bleibt es cache-first.
- **Ein Router / eine Single-Page-Anwendung.** Würde JavaScript zur Bedingung
  fürs Impressum machen und einen Build-Schritt nahelegen — beides gegen
  [ADR-001](./ADR-001-statisches-hosting.md) und gegen E6 in A-4.

## Konsequenzen

**Positiv**
- Neue Textseiten sind ohne weitere Sonderbehandlung möglich und offline-fest.
- Der stille „falsche Seite"-Fehler kann nicht mehr auftreten.
- Echte 404 der Hosting-Plattform werden nicht mehr verschluckt.

**Negativ / Kompromisse**
- Die Wartungspflicht wächst: **jede** neue HTML-Seite muss in `SHELL` **und**
  braucht einen `CACHE_SHELL`-Bump. `scripts/test-pwa.mjs` prüft beides und
  scannt dafür jetzt **alle** precacheten HTML-Seiten, nicht mehr nur
  `index.html`.
- Der Offline-Fallback für unbekannte Pfade liefert die Startseite statt einer
  Fehlerseite — bewusst, aber es ist eine Ungenauigkeit.

**Was jetzt nicht mehr passieren darf**
- Eine HTML-Seite ausliefern, die nicht in `SHELL` steht.
- `SHELL` ändern, ohne `CACHE_SHELL` hochzuzählen.
- `navigationAntwort()` wieder auf „immer `INDEX_URL`" zurückdrehen.
