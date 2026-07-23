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
