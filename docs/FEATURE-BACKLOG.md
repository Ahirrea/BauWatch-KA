# Feature-Backlog

Verfeinerte Feature-Ideen — Ergebnis des [Feature-Refinement-Prozesses](./FEATURE-REFINEMENT.md).
Hier stehen **ausgearbeitete Features** mit getroffenen Entscheidungen und
Definition of Done, nicht rohe Einfälle. Rein technische Aufgaben und kleine
Fixes laufen weiter über [`BACKLOG.md`](./BACKLOG.md).

**Status:** `💡 Idee` · `🔧 in Verfeinerung` · `✅ verfeinert / umsetzungsbereit`
· `🚧 in Umsetzung` · `🏁 erledigt` · `🧊 zurückgestellt` · `🗑 verworfen`

---

## Eintragsvorlage

```
## F-<Nr> <Titel>  <Status-Emoji>
**User Story:** Als <Rolle> möchte ich <Ziel>, um <Nutzen>.
**Verfeinert am:** <Datum>
**Andockpunkte im Code:** <Module/Funktionen>
**Spannung zu Nicht-Zielen:** <benannt + wie aufgelöst>
**Entscheidungen:** <getroffene Weichen mit Kurzbegründung>
**Umfang / Nicht-Umfang:** <was rein, was bewusst raus>
**Spezifikation:** <UX, Datenmodell, Randfälle, Tests …>
**Definition of Done:** <prüfbare Kriterien>
```

---

## F-1 Mein Arbeitsweg  ✅ verfeinert / umsetzungsbereit

**User Story:** Als Nutzer möchte ich meinen täglichen Arbeitsweg (Start → Ziel)
mit meinem gewählten Verkehrsmittel hinterlegen und beim Öffnen sofort sehen, ob
**auf genau diesem Weg** Beeinträchtigungen bestehen.

**Verfeinert am:** 2026-07-23
**Ziel-Branch:** `claude/commute-transport-disruptions-g852lq`

### Andockpunkte im Code
- Verkehrsmittel-Klassifizierung/-Filter existiert (`src/lib/classify.js`,
  `matchesVerkehrsmittel` in `src/app.js`) → „mein Verkehrsmittel" ist fachlich da,
  es fehlt die **Persistenz** der Wahl.
- Adress-Geocoding + Umkreissuche existiert (`geocode`, `haversineKm`,
  Radius-Zweig in `currentFiltered`) → kennt aber nur **einen Punkt**, nicht einen **Weg**.

### Spannung zu Nicht-Zielen — und Auflösung
`SPEC.md` schließt „**Kein Routing / keine Navigation**" aus. Aufgelöst: Das
Nicht-Ziel gilt für den **Kern-Ladepfad** (deshalb ist Leaflet lokal statt CDN).
„Mein Arbeitsweg" nutzt Routing nur als **optionale, nutzerausgelöste**
Anreicherung mit Fallback — dieselbe Kategorie wie die bereits vorhandene
Nominatim-Adresssuche. Keine Navigation/Turn-by-turn; wir zeigen weiterhin nur
Betroffenheit. SPEC wird bei Umsetzung entsprechend präzisiert.

### Entscheidungen (mit Begründung)
- **Weg-Modell: Routing-Dienst zur Laufzeit + Luftlinie-Fallback.** Eingabe nur
  Start + Ziel (bequem); echte Route statt Luftlinie; bei Ausfall transparenter
  Rückfall auf gepufferte Gerade. Verworfen: manuelle Wegpunkte (zu mühsam bei
  langen Strecken), reine Luftlinie (Rhein/Bahn/Alb verzerren zu stark).
- **Routing keyless über FOSSGIS-OSRM** (`routing.openstreetmap.de`), Profile
  `routed-foot`/`routed-bike`/`routed-car`. Kein API-Key im statischen Frontend.
  Selbes OSM-Ökosystem wie Nominatim.
- **Genau ein Verkehrsmittel je Weg** (die Route hängt am Profil); der bestehende
  Mehrfach-Filter wird im Weg-Modus an das Profil gekoppelt.
- **Pufferbreiten:** Fuß **150 m**, Rad **200 m**, Auto **300 m**.
- **Persistenz in `localStorage`** (anonym, clientseitig → verletzt „kein
  Nutzerkonto/Login" nicht). Route wird mitgespeichert → **kein erneutes Routing
  pro Besuch** (schont die öffentliche Instanz).
- **ÖPNV vorerst ausgeklammert** (Straßen-Routing kennt keine Linien) → siehe
  `BACKLOG.md` #19.

### Umfang / Nicht-Umfang
- **Rein:** Start/Ziel-Eingabe, Profilwahl (Fuß/Rad/Auto), Route holen + puffern,
  Baustellen entlang der Route, Zusammenfassungs-Banner, Persistenz + Auto-Laden,
  Luftlinie-Fallback.
- **Raus:** Navigation/Turn-by-turn, ÖPNV, mehrere gespeicherte Wege,
  Umweg-Vorschläge.

### Spezifikation

**UX-Ablauf**
- Neuer **Modus** neben der Umkreissuche (gegenseitig ausschließend, per
  Segment/Tab umschaltbar; Reset → „ganz Karlsruhe").
- Felder **Start** und **Ziel** (Nominatim, Suche nur auf Absenden), **Profilwahl**
  (genau eines), Knopf „Weg anzeigen".
- Nach Absenden: beide Adressen geocodieren → Route im Profil holen → als Linie
  mit Pufferband zeichnen → `fitBounds` → Baustellen entlang der Linie filtern.
- **Banner** (`aria-live="polite"`): „Auf deinem Weg heute: **X Beeinträchtigungen**
  (davon **Y Vollsperrungen**)." — bei X=0 Positiv-Leerzustand „… keine Baustellen …
  Gute Fahrt."
- Treffer **in Fahrtreihenfolge** (Start → Ziel) sortiert.
- Wiederkehr: gespeicherter Weg lädt automatisch, Banner sofort, **ohne** neues
  Routing. Knöpfe „Anderen Weg wählen" / „Weg löschen".

**Interaktion mit bestehenden Filtern**
- Zeitraum + Ampel wirken zusätzlich; Banner zählt im aktiven Zeitraum
  (Default „heute").
- Verkehrsmittel-Filter im Weg-Modus an das Weg-Profil gekoppelt.

**Geometrie — neues reines Modul `src/lib/geo.js`** (DOM-/abhängigkeitsfrei):
`haversineKm` (aus `app.js` hierher geteilt), `pointToPolylineDistanceKm`
(lokale äquirektanguläre Projektion → planarer Punkt-Segment-Abstand),
`withinCorridor(point, polyline, bufferMeters)`, `distanceAlongRouteKm`
(für Fahrtreihenfolge-Sortierung). Luftlinie = Sonderfall Zwei-Punkt-Polylinie.

**Routing**
- `…/route/v1/driving/{lon},{lat};{lon},{lat}?overview=full&geometries=geojson`,
  Profil per Subdomain. Antwortgeometrie = `[lon,lat]`-Stützpunkte.
- Ein Abruf pro Speichern; `fetch` lebt **nur** in `app.js`, nicht in `src/lib/`.
- Fallback bei Timeout/Fehler/kein Ergebnis → Luftlinie-Korridor + Hinweis
  „Route grob geschätzt (Luftlinie)".

**Persistenz (`localStorage`, Schlüssel `bauwatch.arbeitsweg`)**
```json
{ "version": 1,
  "start": { "label": "…", "center": [lat, lon] },
  "ziel":  { "label": "…", "center": [lat, lon] },
  "modus": "rad",
  "route": { "coordinates": [[lon,lat], …], "quelle": "osrm|luftlinie" },
  "gespeichert_am": "<ISO>" }
```
`version` erlaubt Migration; korrupte/veraltete Einträge defensiv verwerfen (nie
Absturz beim Laden). Kein `localStorage` (Privatmodus) → Feature läuft pro
Sitzung, Persistenz still deaktiviert.

**Randfälle**
| Fall | Verhalten |
|---|---|
| Start/Ziel nicht gefunden | feldspezifische Meldung, kein Routing |
| Start ≈ Ziel (< ~150 m) | Hinweis, auf Umkreissuche verweisen |
| Routing-Dienst aus/Timeout | Luftlinie-Fallback + sichtbarer Hinweis |
| Route verlässt Karlsruhe | nur KA-Baustellen erscheinen (kein Fehler) |
| Keine Baustelle auf dem Weg | Positiv-Leerzustand |
| `localStorage` nicht verfügbar | pro Sitzung, Persistenz aus |

**Barrierefreiheit:** Modus-/Profilwahl mit `role=group`/`aria-pressed`,
sichtbarer Fokus; Banner `aria-live`; `prefers-reduced-motion` respektieren
(kein animiertes `fitBounds`); Route/Puffer als SVG-Layer (funktioniert ohne Kacheln).

**Testplan:** `scripts/test-geo.mjs` (in `npm test`): Punkt-Segment-Abstand gegen
Ground-Truth, Korridor-Bool an der Puffergrenze, `distanceAlongRoute`-Monotonie,
Luftlinie-Sonderfall. Browser-Rauchtest (Playwright-Muster, Kacheln abfangen):
Route-Layer + gefilterte Liste + Banner + Fallback-Pfad.

**Doku-/Backlog-Auswirkungen:** SPEC (Nicht-Ziel präzisieren, Funktionsumfang),
README (Abschnitt „Mein Arbeitsweg"), `BACKLOG.md` #19 (ÖPNV-/Transit-Routing).

### Definition of Done
- Start+Ziel+Profil ergeben eine gepufferte Route; Baustellen entlang der Route
  in Fahrtreihenfolge; Banner korrekt (inkl. X=0).
- Luftlinie-Fallback greift bei Routing-Ausfall, mit sichtbarem Hinweis.
- Weg + Profil + Route persistiert; Auto-Laden ohne erneutes Routing.
- `src/lib/geo.js` DOM-/netz-/abhängigkeitsfrei; `scripts/test-geo.mjs` grün in `npm test`.
- A11y berücksichtigt; SPEC/README/BACKLOG aktualisiert.

### Umsetzungsschritte
1. `src/lib/geo.js` + `scripts/test-geo.mjs`, in `npm test` einhängen.
2. Korridor-Zweig in `currentFiltered()`.
3. Arbeitsweg-UI (Modus-Umschalter, Start/Ziel, Profil, Route-Layer, Banner).
4. Routing-Abruf + Luftlinie-Fallback.
5. Persistenz + Auto-Laden.
6. A11y-Feinschliff, Browser-Rauchtest.
7. Doku/Backlog aktualisieren.

---

## F-2 Baustellen-Abo (statischer Feed)  ✅ verfeinert / umsetzungsbereit

**User Story:** Als Karlsruher:in möchte ich Baustellen-Änderungen abonnieren, um
ohne täglichen Seitenbesuch mitzubekommen, wenn in Karlsruhe etwas Neues
aufgemacht, geändert oder aufgehoben wird.

**Verfeinert am:** 2026-07-24 (Evaluierung zu `BACKLOG.md` #16)
**Entscheidung 2026-07-24:** **Stadtteil-Aufteilung wird nicht verfolgt** — kein
Stadtteilgrenzen-Asset, kein Point-in-Polygon. Damit entfällt die einzige
zusätzliche Datenquelle; der Feed speist sich ausschließlich aus dem, was der Build
ohnehin erzeugt. Der geografische „in meiner Nähe"-Bedarf wird **clientseitig**
über die vorhandene Umkreissuche + eine „seit letztem Besuch"-Markierung gedeckt
(siehe unten), nicht über feed-seitige Partitionierung.
**Entscheidung 2026-07-24 (Weichen festgezurrt):** **(1) nur ein globaler Feed**
(keine Facetten-Feeds) und **(2) reiner Änderungsstrom** (neu/geändert/entfernt,
kein Bestands-Feed). Jeweils die einfache Variante, die fast ohne Zusatzaufwand aus
dem vorhandenen Build-Diff fällt; beides ist bei späterem Bedarf nachrüstbar. Damit
sind alle Weichen entschieden → **umsetzungsbereit**.

### „Push" vs. „Abo" — zuerst die Begriffe trennen

Hinter der Idee stecken zwei sehr unterschiedliche Mechanismen:

- **Push** = das System benachrichtigt ungefragt aufs Gerät (Web Push API).
- **Abo** = der Nutzer bzw. sein Feed-Reader holt aktiv (Pull) neue Einträge.

Das ist die entscheidende Weiche, weil nur eine der beiden ohne Backend geht.

### Andockpunkte im Code

- **Der Änderungs-Diff existiert bereits vollständig:** `diffFeatures` in
  `scripts/diff-data.mjs` liefert `added` / `removed` / `changed` (inkl.
  menschenlesbarer Feldnotizen) und speist heute `data/CHANGELOG.md` + Commit-/
  Job-Summary. **Ein Feed ist der maschinenlesbare Zwilling dieses Changelogs** —
  die Item-Liste ist schon berechnet, sie muss nur als Atom/RSS serialisiert werden.
- **Vorgeneriert-und-committen ist das etablierte Muster:** `build-data.mjs`
  schreibt statische Artefakte (GeoJSON, CHANGELOG, QUALITY) atomar und **nur bei
  echter Datenänderung**. Ein Feed reiht sich als weiteres Artefakt genau hier ein.
- **Nichts fehlt für einen globalen Feed:** Diff + Feature-Liste liegen im Build
  bereits vor. (Eine Stadtteil-Aufteilung hätte einen abgeleiteten Stadtteil je
  Vorgang gebraucht — der Datensatz hat **kein** Stadtteil-Feld, nur `titel` +
  Koordinaten. Das ist per Entscheidung vom Tisch, siehe oben.)

### Machbarkeit ohne Backend

- **Echtes Push: NICHT machbar / verworfen.** Web Push braucht (1) einen Service
  Worker (statisch ok), aber zwingend auch (2) einen **Application Server**, der
  die Nachricht via VAPID an den Push-Dienst des Browsers (Google FCM, Mozilla,
  Apple) sendet, und (3) die **persistente Speicherung der Push-Subscription
  (Endpoint-URL je Browser)**. Punkt (2)+(3) verletzen die Nicht-Ziele „Keine
  eigene Datenhaltung" und „Kein Nutzerkonto" — die Endpoints sind
  personenbeziehbar. Die GitHub Action als Sender löst das **nicht** (sie müsste
  die Endpoints trotzdem irgendwo speichern und pflegen). Zusatzhürden: iOS-Safari
  verlangt eine als PWA installierte Seite, Zustellung ist „best effort".
  → **verworfen, solange „kein Backend / keine Datenhaltung" gilt.**
- **Abo per statischem Feed: MACHBAR und architektonisch stimmig.** Ein Atom-Feed
  ist eine statische Datei. Die Action generiert ihn wie das GeoJSON vor, GitHub
  Pages liefert ihn same-origin aus. Der **Feed-Reader des Nutzers pollt selbst** —
  kein Server, keine Endpoint-Speicherung, vollständig anonym. Passt lückenlos zu
  ADR-001.

### Spannung zu Nicht-Zielen — und Auflösung

- „**Keine Push-Benachrichtigungen in v1**" (SPEC): Wir liefern **kein** Push,
  sondern ein **Abo** (Pull). Der Nicht-Ziel-Punkt bleibt für echtes Push gewahrt.
- „**Keine eigene Datenhaltung** über das committete GeoJSON hinaus": Der Feed ist
  ein weiteres **committetes, aus denselben Daten abgeleitetes** Artefakt — keine
  neue, nutzerbezogene Datenhaltung. Kein Speichern von Abonnenten.
- „**Kein Nutzerkonto, kein Login**": Ein Feed-Abo ist anonym; die Beziehung
  „Nutzer ↔ Abo" lebt ausschließlich im Feed-Reader des Nutzers.

### Feed-Zuschnitt — nur was ohne Zusatz-Datenquelle geht

Nach der Entscheidung gegen Stadtteilgrenzen bleiben zwei Zuschnitte, die sich
**allein aus vorhandenen Feldern** speisen:

| Option | Wie | Trade-off |
|---|---|---|
| **(1) Globaler Feed (empfohlen)** | Ein Feed `feeds/alle.xml` mit dem gesamten Änderungsstrom (neu/geändert/entfernt). | Minimal, sofort machbar, deckt den Kernnutzen. Keine Geo-Vorfilterung. |
| (2) + Facetten-Feeds | Zusätzlich ein Feed je vorhandener Dimension, z. B. `feeds/vollsperrungen.xml`, `feeds/rad.xml` (aus `ampel` / `verkehrsmittel`). | Kein neues Asset, aber mehr Dateien + Kombinationsfragen; Nutzen begrenzt, solange die Facetten grob sind. |

**Empfehlung:** **(1) als Kern.** Facetten-Feeds (2) nur, wenn die Ideengeberin
konkreten Bedarf sieht — sie sind billig nachrüstbar, aber nicht der Kern.

### Der geografische „in meiner Nähe"-Bedarf (ohne Stadtteile)

Statt feed-seitiger Geo-Partitionierung deckt eine **clientseitige
Pseudo-Subscription** den „was ist neu bei mir?"-Bedarf ab: letzter gesehener
`stand` + gesehene Vorgangs-IDs in `localStorage`, beim nächsten Besuch als
Banner/Markierung — **kombiniert mit der bereits vorhandenen Umkreissuche** um eine
gespeicherte Adresse. Kein Feed-Reader, kein Push, kein Backend, anonym. Das ist
der eigentliche Ersatz für „pro Stadtteil" und dockt an bestehenden Client-Code an
(`geocode`, Umkreis-Zweig in `currentFiltered`). Wird als **eigener kleiner
Feature-Eintrag** verfeinert (komplementär zu F-2, kein Blocker).

### Weichen (alle entschieden)

1. **Facetten-Feeds:** **nur globaler Feed** — keine Feeds nach
   Ampel/Verkehrsmittel. (Bei konkretem Bedarf billig nachrüstbar.)
2. **Item-Umfang:** **reiner Änderungsstrom** (neu/geändert/entfernt, wie
   CHANGELOG) — kein „Bestands-Feed". Deckt sich 1:1 mit dem Build-Diff.
3. ~~Stadtteil-Zuordnung~~ — **keine** (kein Stadtteilgrenzen-Asset, kein
   Point-in-Polygon).

### Spezifikation (Skizze, sobald Weichen stehen)

**Format:** **Atom 1.0** (saubere `<id>`/`<updated>`, GeoRSS-Punkt optional). Genau
eine Datei `feeds/alle.xml` (Änderungsstrom, keine Facetten-Feeds).

**Erzeugung:** neues reines Modul `src/lib/feed.js` (DOM-/netz-/abhängigkeitsfrei,
harte Randbedingung), das aus dem vorhandenen `diff`-Objekt + Feature-Liste
Atom-XML rendert; aufgerufen aus `build-data.mjs` **im selben „nur bei echter
Änderung"-Zweig** wie GeoJSON/CHANGELOG. Keine zusätzliche Datenquelle, keine
Geometrie-Zuordnung.

**Invarianten-Schutz (Fallstrick aus CLAUDE.md):**
- **Keine pro-Lauf-volatilen Werte** in den Feed. Jeder Eintrag bekommt eine
  **stabile `<id>`** (aus `vorgangsnummer` + Änderungsart) und ein **`<updated>`,
  das die letzte *echte* Änderung** widerspiegelt (nicht die Laufzeit) — sonst
  Rausch-Commits und kaputte Git-Historie. Feed wird nur bei Datenänderung neu
  geschrieben.
- Feed-`<updated>` der Gesamtdatei = `collection.stand`.

**Discovery:** `<link rel="alternate" type="application/atom+xml" …>` im
`index.html` + ein UI-Hinweis „Änderungen abonnieren".

**Randfälle:**
| Fall | Verhalten |
|---|---|
| Erstbefüllung (`firstFill`) | Feed mit Startbestand statt riesiger „alles neu"-Liste, analog CHANGELOG |
| Kein Feed-Reader beim Nutzer | Feed bleibt lesbar im Browser; ergänzend die localStorage-Lösung |
| Leerer Diff (keine Änderung) | kein Feed-Rewrite (Invariante „nur bei echter Änderung") |

**Testplan:** `scripts/test-feed.mjs` (in `npm test`): Atom-Wohlgeformtheit,
stabile `<id>`/`<updated>` (kein volatiler Wert), Diff→Item-Mapping (added/removed/
changed), leerer Diff → kein Feed-Rewrite.

**Doku-/Backlog-Auswirkungen:** SPEC (Nicht-Ziel „Push" präzisieren: Abo ≠ Push),
README (Abschnitt „Abonnieren"), `BACKLOG.md` #16 (erledigt → verweist hierher).

### Definition of Done (bei späterer Umsetzung)
- Globaler Atom-Feed valide, von der Action nur bei echter Änderung geschrieben;
  stabile IDs, `<updated>` = letzte echte Änderung (keine Rausch-Commits).
- `src/lib/feed.js` DOM-/netz-/abhängigkeitsfrei; `scripts/test-feed.mjs` grün in
  `npm test`.
- Feed-Autodiscovery im `index.html`; SPEC/README/BACKLOG aktualisiert.
- Kein neuer nutzerbezogener Datenspeicher, kein Login, kein echtes Push, **keine
  zusätzliche Datenquelle** (keine Stadtteilgrenzen).
