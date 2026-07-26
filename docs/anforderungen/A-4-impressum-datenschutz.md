# A-4 Impressum & Datenschutzhinweis

[← Anforderungen](./README.md) · [Prozess](../PROZESS.md)
· Status siehe [Übersicht](./README.md#übersicht)

**User Story:** Als Besucherin von BauWatch-KA möchte ich nachlesen können, wer
die Seite betreibt und welche Daten beim Benutzen an Dritte gehen, um
einschätzen zu können, wem ich das Angebot anvertraue.

**Verfeinert am:** 2026-07-26
**Bedient PRD:** „Rahmenbedingungen" (Geocoding über Nominatim als einziger
Live-Aufruf; Lizenzen) — und ist Voraussetzung für die Listung im
Transparenzportal, siehe [`../showcase-einreichung.md`](../showcase-einreichung.md)
**Eingeschränkt durch:** [ADR-001](../entscheidungen/ADR-001-statisches-hosting.md)
(statisches Hosting, kein Backend, kein Build-Schritt fürs Frontend)
**Ziel-Branch:** —

**Auslöser:** Vorprüfung der Open-Data-Redaktion (2026-07-26): „Bei einer von der
Stadt verlinkten Seite mit Drittdienst-Einbindung (Nominatim) fragt unser
Justiziariat erfahrungsgemäß danach." Die Redaktion hat das ausdrücklich **nicht**
zur Bedingung für den Showcase-Eintrag gemacht (das sind nur Namensnennung und die
Feldwerte) — es ist eine begründete Vorwarnung.

## Andockpunkte im Code

**Nachgesehen, nicht vermutet.** Ausgangslage im Client:

| Was | Wo | Bedeutung für diese Anforderung |
|---|---|---|
| Footer-Links | `index.html`, `<p class="credits">` | Hier kommen die zwei neuen Links hinein. **`#attribution` und `#attribution-hinweis` nicht anfassen** — `scripts/test-attribution.mjs` bewacht sie. |
| Kartenkacheln | `src/app.js`, `initMap()` → `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Drittdienst, lädt **automatisch** beim Seitenaufruf. |
| Geocoding | `src/app.js`, `geocode()` → `nominatim.openstreetmap.org` | Drittdienst, **nur beim Absenden** der Suche (keine Autovervollständigung). Überträgt die eingegebene Adresse. |
| Kein Client-Speicher | `src/`, `index.html`, `sw.js` | `localStorage`, `sessionStorage`, `document.cookie`, `indexedDB`, `navigator.geolocation`: **keine Treffer.** Der Hinweis kann „keine Cookies, kein Tracking" also ehrlich behaupten. |
| Service-Worker-Cache | `sw.js`, `CACHE_SHELL` / `CACHE_DATA` | Gerätespeicher, hält nur ausgelieferte Dateien. Keine Übertragung, jederzeit löschbar. |
| Shell-Precache | `sw.js`, `SHELL` (handgepflegt), `SHELL_PATHS` | Neue Seiten müssen hier eingetragen werden, sonst sind sie offline weg, während die App läuft. |
| **Navigations-Antwort** | `sw.js:117`, `navigationAntwort()` | **Der wichtigste Befund:** beantwortet **jede** Navigation mit dem gecachten `INDEX_URL` (`'./'`). Eine zweite HTML-Seite würde bei installierten Clients still von `index.html` überdeckt. |
| Precache-Test | `scripts/test-pwa.mjs` | Scannt heute **nur** die Referenzen aus `index.html`. Neue Seiten fallen durch das Raster. |
| Textseiten-Optik | `src/styles.css`, `.app-footer`, `.app-footer a` | Es gibt noch **keine** Klasse für eine reine Textseite; die muss dazu. `--amber` bleibt als Textfarbe verboten. |

**Wiederverwendbar:** Farbvariablen und Typografie aus `styles.css`, die
Footer-Struktur, das Muster „manuelles Skript + Test" aus A-3.
**Fehlt:** die beiden Seiten selbst, eine Textseiten-Klasse, pfadbewusste
Navigation im Service Worker, ein Test für die Rechtstexte.

## Spannung zu Nicht-Zielen — und Auflösung

1. **„Kein Backend, kein Build-Schritt fürs Frontend" (ADR-001).**
   → Aufgelöst: zwei gewöhnliche statische HTML-Dateien, **kein Kontaktformular**
   (das bräuchte einen Server). Kontakt per `mailto:`. ADR-001 bleibt unberührt.

2. **„Keine eigene Datenhaltung."** Das Impressum enthält personenbezogene Daten —
   aber die **der Betreiberin**, nicht der Nutzerinnen. Das Nicht-Ziel richtet sich
   gegen das Speichern von Nutzerdaten; kein Widerspruch. Explizit benannt, damit
   später niemand darüber stolpert.

3. **Die App ist bisher einseitig — der Service Worker verlässt sich darauf.**
   `navigationAntwort()` liefert für jede Navigation `index.html`. Ohne Anpassung
   bekämen **installierte** Clients unter `/impressum.html` die Kartenseite zu
   sehen: kein Fehler, keine Meldung, einfach die falsche Seite. Lokal fällt das
   nie auf (dort gibt es keinen alten Cache).
   → Aufgelöst: `navigationAntwort()` wird pfadbewusst — Treffer im Shell-Cache für
   den **angefragten** Pfad zuerst, `INDEX_URL` nur noch als Fallback für die
   Wurzel. Weil das die Navigationsstrategie der App dauerhaft festlegt, gehört es
   zusätzlich als **ADR-002** nach `../entscheidungen/` (siehe Umsetzungsschritte).

4. **PWA-Fallstricke** (`CLAUDE.md`): Shell-Datei geändert → `CACHE_SHELL` von `v2`
   auf `v3`, sonst sehen installierte Clients die neuen Seiten unbegrenzt nicht.
   `SHELL` ist alles-oder-nichts pro Version: ein Tippfehler lässt `cache.addAll`
   scheitern und der SW installiert sich nie. → Beides vom erweiterten
   `test-pwa.mjs` abgedeckt.

5. **GitHub Pages liefert vom Sub-Pfad** `…github.io/BauWatch-KA/`. → Alle Pfade in
   den neuen Seiten **relativ** (`src/styles.css`, nicht `/src/styles.css`), sonst
   brechen sie still.

6. **Namensnennung.** Der Footer-Umbau darf die statische CC-BY-Zeile nicht
   berühren. → `scripts/test-attribution.mjs` läuft in `npm test` und schlägt an,
   falls doch.

7. **Vorgriff auf [A-1](./A-1-mein-arbeitsweg.md) (`✅ bereit`).** A-1 bringt
   `localStorage` (Schlüssel `bauwatch.arbeitsweg`) **und einen weiteren
   Drittdienst** (FOSSGIS-OSRM, `routing.openstreetmap.de`). Sobald A-1 umgesetzt
   wird, wäre ein heute geschriebener Datenschutzhinweis unvollständig — also
   falsch.
   → Aufgelöst auf zwei Wegen: (a) die Definition of Done von A-1 wird um „Datenschutz­hinweis
   mitgepflegt" ergänzt, und (b) der neue Test prüft **maschinell**, dass jeder im
   Frontend-Code vorkommende externe Host auch im Hinweis genannt ist. Damit
   scheitert `npm test`, wenn jemand einen Drittdienst einbaut und den Text
   vergisst — dieselbe Drift-Absicherung wie bei der Namensnennung.

## Entscheidungen (mit Begründung)

**E1 — Zwei getrennte Seiten** (`impressum.html`, `datenschutz.html`).
Konventionellste Form, eigene stabile URLs, gut erweiterbar. *Verworfen:* eine
Seite mit den Ankern `#impressum`/`#datenschutz` (weniger Aufwand, aber
unüblicher); ein Ausklapp-Abschnitt in `index.html` (am billigsten — kein
SW-Umbau —, aber ein Impressum in einer Ausklapp-Sektion einer Kartenseite ist
schwer als „leicht erkennbar und unmittelbar erreichbar" zu verteidigen).

**E2 — Name + projekteigene E-Mail-Adresse, ohne Postanschrift.** Begründung:
rein privates, ehrenamtliches Angebot ohne Einnahmen, Werbung oder
Geschäftsmäßigkeit; die Anschriftspflicht wird für solche Seiten überwiegend als
nicht anwendbar angesehen. Die Redaktion hat selbst von einem Hinweis gesprochen,
nicht von einer Bedingung. *Verworfen:* volle Wohnanschrift (nimmt jede
Diskussion vorweg, veröffentlicht aber die Privatadresse dauerhaft auf einer von
der Stadt verlinkten Seite); Postfach/c/o (formal sauber, kostet Einrichtung —
bleibt der Rückfallplan, falls das Justiziariat auf einer zustellfähigen Adresse
besteht).
**Vorbehalt, ausdrücklich:** Das ist eine Produktentscheidung auf Basis einer
Laieneinschätzung, **keine Rechtsberatung.** Von allen Punkten dieser Anforderung
ist das der, bei dem ein juristischer Blick am meisten wert ist.

**E3 — Klartext plus Pflichtangaben.** Die vier realen Datenflüsse konkret
beschrieben, dazu Verantwortlicher, Rechtsgrundlage, Betroffenenrechte und
Aufsichtsbehörde. *Verworfen:* nur die Datenflüsse (formale Angaben fehlen →
Rückfrage wahrscheinlich); Muster-Erklärung aus einem Generator (behauptet
typischerweise Cookies, Analyse und Newsletter — hier sachlich falsch, und
Unwahrheiten im Datenschutzhinweis sind schlimmer als Lücken).

**E4 — Kein Kontaktformular, `mailto:`.** Folgt zwingend aus ADR-001.

**E5 — Dieselbe E-Mail-Adresse wie im Showcase-Eintrag.** Ein Kontaktweg, nicht
zwei; sonst driften Portal-Eintrag und Impressum auseinander.

**E6 — Die neuen Seiten kommen ohne JavaScript und ohne Leaflet aus.** Reine
Textseiten. Sie funktionieren damit auch ohne JS und sind schnell — und sie
brauchen `app.js` nicht im Precache-Pfad.

**E7 — Beide Seiten in die `SHELL`.** Sie sind offline erreichbar. Eine App, die
offline läuft, deren Impressum aber offline verschwindet, wäre eine unnötige
Inkonsistenz — es sind zwei kleine Textdateien.

**E8 — Kein Cookie-Banner, kein Consent-Dialog.** Es gibt nichts einzuwilligen:
keine Cookies, kein Tracking, keine Reichweitenmessung.

## Umfang / Nicht-Umfang

- **Rein:** `impressum.html` und `datenschutz.html`; zwei Footer-Links in
  `index.html`; Textseiten-Styles in `src/styles.css`; `sw.js`
  (`SHELL`-Einträge, `CACHE_SHELL` → `v3`, pfadbewusste `navigationAntwort()`);
  `scripts/test-pwa.mjs` erweitert; neues `scripts/test-rechtstexte.mjs`;
  ADR-002; Doku-Nachzug.
- **Raus:** Kontaktformular (ADR-001); Cookie-/Consent-Banner (E8);
  Barrierefreiheitserklärung nach BITV (eigenes Thema, gilt für öffentliche
  Stellen — BauWatch-KA ist keine); Mehrsprachigkeit; Rechtsberatung.
- **Raus, aber ausdrücklich benannt:** **Kartenkacheln erst nach Einwilligung
  laden.** Die OSM-Kacheln übertragen die IP-Adresse beim Seitenaufruf an die
  OSMF, ohne dass die Nutzerin etwas getan hat. Eine strenge Lesart verlangt dafür
  eine vorgeschaltete Einwilligung („Karte laden?"). Das würde die Kernschleife des
  PRD („ohne Interaktion sofort sichtbar") direkt beschädigen und ist deshalb eine
  eigene Abwägung — nicht Teil von A-4. Der Datenschutzhinweis benennt den
  Datenfluss dafür umso deutlicher. Falls das Justiziariat darauf zurückkommt:
  eigene Anforderung.

## Spezifikation

### UX-Ablauf & Zustände

Im Footer von `index.html`, im Absatz `.credits`, zwei zusätzliche Links:
`Impressum` und `Datenschutz`. Beide Seiten sind schlanke Textdokumente mit
`<h1>`, gegliederten `<h2>`-Abschnitten, einem Rücksprung „← Zurück zur Karte"
als **erster** Tab-Station und untereinander verlinkt. Kopf- und Fußoptik wie die
Hauptseite, damit sie erkennbar zum Angebot gehören. Zustände gibt es keine —
kein Laden, kein Fehlerfall, kein JS.

### Inhalt `impressum.html`

- **Verantwortlich für den Inhalt:** Name, E-Mail (`mailto:`), keine Anschrift (E2).
- **Einordnung:** privates, ehrenamtliches Bürgerprojekt; **kein** Angebot der
  Stadt Karlsruhe, nicht in ihrem Auftrag. (Deckt sich mit der Einordnung im
  Anschreiben.)
- **Haftung für Inhalte und Links:** Baustellendaten stammen von der Stadt und
  werden unverändert übernommen; verbindlich ist die Beschilderung vor Ort.
- **Urheberrecht / Lizenzen:** Code MIT; Daten CC-BY 4.0 (Stadt Karlsruhe);
  Kartendaten OpenStreetMap (ODbL) — jeweils verlinkt.
- **Quellcode:** Link aufs Repository.

### Inhalt `datenschutz.html`

1. **Verantwortliche Stelle** — wie im Impressum.
2. **Was diese Seite nicht tut** (an den Anfang, weil es das meiste ist): keine
   Cookies, kein Tracking, keine Reichweitenmessung, kein Nutzerkonto, keine
   Weitergabe von Daten, keine eigene Speicherung von Nutzerdaten. Im Code
   nachprüfbar — der Quellcode ist offen.
3. **Datenflüsse an Dritte** als Tabelle mit Spalten *Dienst · Wann · Übertragene
   Daten · Zweck · Datenschutzhinweis des Dritten*:

   | Dienst | Wann | Übertragene Daten |
   |---|---|---|
   | GitHub Pages (Hosting) | bei jedem Aufruf | IP-Adresse, Zeitpunkt, angeforderte Datei, User-Agent (Server-Logs des Hosters) |
   | `tile.openstreetmap.org` (OSMF) | automatisch beim Laden der Karte | IP-Adresse, Referer, angeforderte Kacheln |
   | `nominatim.openstreetmap.org` (OSMF) | **nur** beim Absenden der Adresssuche | IP-Adresse, Referer, **die eingegebene Adresse** |

4. **Speicherung auf dem eigenen Gerät:** Der Service Worker legt App-Dateien und
   den letzten Datenstand im Browser-Cache ab, damit die Seite offline
   funktioniert. Das bleibt auf dem Gerät, wird nicht übertragen und ist über die
   Browser-Einstellungen jederzeit löschbar.
5. **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am
   technischen Bereitstellen der Seite). Die Adresssuche löst die Nutzerin selbst
   aus.
6. **Betroffenenrechte:** Auskunft, Berichtigung, Löschung, Einschränkung,
   Widerspruch, Beschwerde — mit dem Hinweis, dass hier keine personenbezogenen
   Daten gespeichert werden und Auskunftsansprüche daher an die genannten Dritten
   zu richten sind. Aufsichtsbehörde: Landesbeauftragter für den Datenschutz und
   die Informationsfreiheit Baden-Württemberg.
7. **Stand:** Datum der letzten Änderung, statisch im HTML (nicht per JS —
   dieselbe Lehre wie bei der Namensnennung).

### Interaktion mit Bestehendem

- `sw.js`: `'impressum.html'` und `'datenschutz.html'` in `SHELL`; `CACHE_SHELL`
  auf `'bauwatch-shell-v3'`; `navigationAntwort()` prüft **zuerst** den
  angefragten Pfad im Shell-Cache und fällt erst dann auf `INDEX_URL` zurück.
- `src/styles.css`: neue Klasse (z. B. `.textseite`) mit lesbarer Maximalbreite;
  Farben aus den vorhandenen Variablen, hell und dunkel.
- Namensnennung, Haftungshinweis und Datenstand in `index.html` bleiben
  unverändert.

### Datenmodell / Persistenz

Keins. Zwei statische Dateien, kein neuer Speicher, kein neues Feld im GeoJSON.

### Externe Abhängigkeiten & Fallback

Keine neuen. Die Seiten sind offline aus dem Cache verfügbar (E7); ohne Service
Worker liefert sie der Server wie jede andere statische Datei.

### Randfälle & Fehlerbehandlung

| Fall | Verhalten |
|---|---|
| Kein JavaScript | Seiten voll nutzbar (E6) |
| Offline, PWA installiert | Seiten aus dem Shell-Cache |
| Installierter Client mit alter SW-Version | bekommt die neuen Seiten erst nach dem `CACHE_SHELL`-Bump — **deshalb** ist der Bump Teil der DoD |
| Direkter Aufruf von `…/impressum.html` | pfadbewusste Navigation liefert die richtige Seite, nicht `index.html` |
| Dunkelmodus | wie die Hauptseite; `--amber` nicht als Textfarbe |

### Barrierefreiheit

`lang="de"`; eine `<h1>` pro Seite, danach lückenlose `<h2>`-Hierarchie;
Tabellen mit `<th scope="col">`; Rücksprung als erste Tab-Station; sichtbarer
Fokus und Kontraste wie auf der Hauptseite; keine Ausklapp-Mechanik, die Inhalte
vor Screenreadern verbirgt. Fließtext, keine Layout-Tabellen. Kein Skip-Link
nötig (keine umfangreiche Navigation davor).

### Testplan

**`scripts/test-pwa.mjs` erweitern:** die zwei Seiten stehen in `SHELL`; jede von
**ihnen** referenzierte Datei ist ebenfalls precacht (heute wird nur
`index.html` gescannt); `navigationAntwort()` ist pfadbewusst.

**`scripts/test-rechtstexte.mjs` (neu, in `npm test`):**
1. Beide Dateien existieren und sind aus dem Footer von `index.html` verlinkt.
2. Alle Pfade darin relativ (kein führender `/`) — Sub-Pfad-Falle.
3. Pflichtabschnitte vorhanden (Verantwortlicher, Rechtsgrundlage,
   Betroffenenrechte, Aufsichtsbehörde, Stand).
4. **Drift-Absicherung:** Jeder externe Host, der in `src/*.js` vorkommt, muss im
   Datenschutzhinweis genannt sein. Baut jemand einen Drittdienst ein — etwa
   `routing.openstreetmap.de` bei A-1 — wird `npm test` rot.
5. Gegenprobe wie bei `test-attribution.mjs`: die Regressionen einmal künstlich
   herbeiführen und belegen, dass der Test sie fängt.

**Browser (Playwright):** Links im Footer erreichbar; Seiten offline aus dem
Cache; unter `localhost` ein installierter SW liefert `impressum.html` und
**nicht** `index.html` (genau der Befund aus Spannung 3).

### Doku-/Backlog-Auswirkungen

- **ADR-002** (neu, append-only): pfadbewusste SW-Navigation / die App wird
  mehrseitig.
- `README.md`: Struktur (neue Dateien, neues Testskript), Testabschnitt.
- `CLAUDE.md`: Fallstrick „`navigationAntwort()` überdeckt jede Navigation" und
  der neue Drift-Test.
- [`../showcase-einreichung.md`](../showcase-einreichung.md): Häkchen bei
  Impressum/Datenschutz, offener Punkt schließen.
- [`A-1`](./A-1-mein-arbeitsweg.md): Definition of Done um „Datenschutzhinweis um
  `localStorage` und Routing-Dienst ergänzt" erweitern (Spannung 7).
- `docs/BACKLOG.md`: keine neue Aufgabe — läuft vollständig über diese Anforderung.

## Definition of Done

- `impressum.html` und `datenschutz.html` existieren, sind aus dem Footer
  verlinkt und enthalten die unter „Inhalt" gelisteten Abschnitte.
- Inhalte stimmen mit dem Code überein: genau die drei Drittdienste, keine
  Behauptung über Cookies/Tracking, die nicht zutrifft.
- Beide Seiten ohne JavaScript nutzbar und offline aus dem Cache verfügbar.
- `sw.js`: Seiten in `SHELL`, `CACHE_SHELL` auf `v3`, `navigationAntwort()`
  pfadbewusst; ein installierter Client bekommt unter `/impressum.html` das
  Impressum.
- `npm test` grün, inklusive erweitertem `test-pwa.mjs` und neuem
  `test-rechtstexte.mjs`; die Drift-Absicherung ist per Gegenprobe belegt.
- Namensnennung, Haftungshinweis und Datenstand unverändert
  (`test-attribution.mjs` grün).
- Barrierefreiheit wie oben; Kontraste hell **und** dunkel geprüft.
- ADR-002 abgelegt; README, CLAUDE.md, Showcase-Unterlage und A-1 nachgezogen.
- Status in der [Übersicht](./README.md#übersicht) auf `🏁 erledigt`.

## Umsetzungsschritte

1. **ADR-002** schreiben (mehrseitige Auslieferung + pfadbewusste
   SW-Navigation) — vor dem Code, weil er die Entscheidung festhält.
2. `sw.js`: `navigationAntwort()` pfadbewusst machen, `SHELL` ergänzen,
   `CACHE_SHELL` → `v3`.
3. `impressum.html` und `datenschutz.html` schreiben; Name und E-Mail einsetzen
   (dieselbe Adresse wie im Showcase-Eintrag, E5).
4. Footer-Links in `index.html`; Textseiten-Styles in `src/styles.css`.
5. `scripts/test-rechtstexte.mjs` schreiben, `test-pwa.mjs` erweitern, beides in
   `npm test`; Gegenprobe der Drift-Absicherung.
6. Browser-Check inklusive Offline- und SW-Navigations-Fall.
7. Doku nachziehen (README, CLAUDE.md, Showcase-Unterlage, A-1-DoD), Status auf
   `🏁 erledigt`.

> **Offen und bewusst nicht hier entschieden:** die projekteigene E-Mail-Adresse
> muss existieren, bevor Schritt 3 laufen kann (siehe „Offene Punkte" in der
> [Showcase-Unterlage](../showcase-einreichung.md#offene-punkte)). Und der
> Vorbehalt aus **E2** bleibt: eine juristische Gegenlesung ist bei den Angaben
> zur Person das Geld wert.
