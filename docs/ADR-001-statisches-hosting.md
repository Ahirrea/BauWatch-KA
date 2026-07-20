# ADR-001: Statisches Hosting mit periodischem Daten-Snapshot

**Status:** akzeptiert
**Datum:** 2026-07-20
**Kontext:** Wie kommen die Live-Daten der Stadt in eine rein statische Seite?

## Problem

Der WFS-Endpoint der Stadt (`mobil.trk.de`) sendet keine CORS-Header, die einen
direkten `fetch` aus dem Browser einer fremden Domain erlauben. Ein Zugriff
direkt aus dem clientseitigen Code schlägt daher fehl. Gleichzeitig soll das
Produkt statisch auf GitHub Pages laufen — ohne Server, ohne laufende Kosten.

Zusätzliche Randbedingungen aus den Daten:
- Rohdaten enthalten die ganze Region; nur `gemeinde = "Karlsruhe"` ist relevant.
- Koordinaten in EPSG:25832, müssen nach WGS84 transformiert werden.
- Punkt + Polygon je Vorgang → Deduplizierung nötig.
- Der Rohdatensatz ist groß; der Client soll ihn nicht bei jedem Aufruf ziehen.

## Entscheidung

Eine **GitHub Action** übernimmt periodisch die Rolle, die sonst ein Server
hätte. Sie läuft zeitgesteuert (Cron) und bei manuellem Auslösen:

1. Ruft den WFS-Endpoint serverseitig ab (kein CORS im Action-Runner).
2. Filtert auf `gemeinde = "Karlsruhe"`, dedupliziert Punkt/Polygon.
3. Transformiert Koordinaten nach WGS84.
4. Bereinigt Felder (HTML aus `zusatzinfo`, Klartext-Mapping der `art`-Codes).
5. Schreibt ein schlankes, fertig aufbereitetes `data/baustellen.geojson`
   ins Repo (Commit nur bei tatsächlicher Änderung).

Der clientseitige Code lädt ausschließlich diese statische Datei aus demselben
Origin. Kein CORS-Problem, keine Laufzeit-Abhängigkeit von der Stadt-API,
schnelle Ladezeit, Datenstand im Commit-Verlauf nachvollziehbar.

## Konsequenzen

**Positiv**
- Null laufende Kosten, kein Server, kein Secret-Handling.
- Daten-Aufbereitung an einer Stelle (Build), Client bleibt simpel.
- Ausfall der Stadt-API bricht die Seite nicht — letzter Snapshot bleibt.
- Änderungshistorie der Baustellen ergibt sich gratis aus Git.

**Negativ / Kompromisse**
- Daten sind nur so frisch wie das Cron-Intervall (Vorschlag: alle 3–6 h).
  Für Baustellendaten, die tageweise gelten, völlig ausreichend.
- Aufbereitungslogik lebt in zwei Sprachen, wenn das Build-Skript nicht JS ist.
  → **Festlegung:** Build-Skript in Node.js, damit Transformations- und
  Mapping-Logik mit dem Frontend geteilt werden kann (`src/lib/` als gemeinsame
  Module, importiert von Build-Skript und Client).
- Adress-Geocoding (Nominatim) bleibt ein Live-Call aus dem Browser; Nominatim
  erlaubt CORS. Nutzungsrichtlinie beachten (Rate-Limit, `User-Agent`/Referer).

## Repo-Struktur (daraus abgeleitet)

```
/
├─ index.html              # Einstieg, lädt src/app.js + Leaflet
├─ src/
│  ├─ app.js               # UI, Karte, Filter, Rendering
│  ├─ styles.css
│  └─ lib/
│     ├─ transform.js      # UTM32 -> WGS84 (geteilt)
│     ├─ classify.js       # art-Codes, Sperrgrad, Verkehrsmittel (geteilt)
│     └─ format.js         # Restdauer, Textbereinigung (geteilt)
├─ scripts/
│  ├─ build-data.mjs       # von der Action ausgeführt
│  └─ test-transform.mjs   # Referenztest der Koordinaten-Transformation
├─ data/
│  └─ baustellen.geojson   # generiert, committet
├─ vendor/
│  └─ leaflet/             # lokal eingebundene Kartenbibliothek (kein CDN)
├─ .github/workflows/
│  └─ update-data.yml      # Cron + manueller Trigger
└─ docs/
   ├─ SPEC.md
   └─ ADR-001-statisches-hosting.md
```

> Hinweis zur Umsetzung: Leaflet wird lokal unter `vendor/leaflet/` eingebunden
> statt über ein CDN. Das entspricht dem Grundgedanken „keine fragile
> Drittanbieter-Laufzeitabhängigkeit" und macht die Seite auch bei CDN-Ausfall
> voll funktionsfähig (die Kartenkacheln von OpenStreetMap bleiben ein
> Live-Aufruf — das ist bei jeder Karte unvermeidbar).

## Verworfene Alternativen

- **Serverless-Proxy (Vercel/Netlify):** würde Live-Abruf erlauben, bringt aber
  eine Laufzeitabhängigkeit, ein weiteres Hosting-Konto und potenziell Kosten/
  Cold-Starts. Für tageweise gültige Daten unnötig.
- **Direkter Browser-Fetch mit öffentlichem CORS-Proxy:** fragil, langsam,
  Datenschutz- und Verfügbarkeitsrisiko durch Dritt-Proxy. Abgelehnt.
- **Daten manuell committen:** nicht wartbar, veraltet sofort.
