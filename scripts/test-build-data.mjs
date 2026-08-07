// Testscript für die Dedup- und Flächenlogik in build-data.mjs (Anforderung A-7).
// Ausführen: node scripts/test-build-data.mjs (Exit 0 = ok, 1 = Fehler)
//
// Der WFS-Abruf selbst ist hier nicht testbar (Egress, siehe CLAUDE.md) — und
// muss es auch nicht sein. Geprüft wird die reine Aufbereitung: dass Punkt und
// Polygon eines Vorgangs zu EINEM Feature zusammenfallen, dass dabei die
// Polygon-Geometrie als properties.area erhalten bleibt statt verworfen zu
// werden, und dass die Randfälle aus A-7 (nur Punkt, nur Polygon, mehrere
// Flächen, Linien statt Flächen, kaputte Koordinaten) sich wie beschrieben
// verhalten.
//
// Die Mengenverhältnisse dahinter stammen aus der einmaligen WFS-Inspektion
// (2026-07-28, 444 Karlsruher Features): 159 Vorgänge mit genau einer Fläche,
// 24 mit zwei bis sechs, und ein Fünftel aller Flächen sind Linien
// (LineString/MultiLineString) statt Polygone.

import { buildFeature, buildArea, dedupeFeatures } from './build-data.mjs';

let failed = 0;
function check(name, cond) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}`);
  if (!cond) failed++;
}

// Rohe WFS-Properties, wie sie der echte Dienst liefert (Feldnamen NICHT
// geraten — siehe CLAUDE.md).
const props = (o = {}) => ({
  vorgangsnummer: 'V-1',
  id: 'baustellen_aktuell.1',
  gemeinde: 'Karlsruhe',
  art: 'Straßenbau',
  lage: 'Teststraße 1',
  vorgangszeitraum_von: '2026-07-01',
  vorgangszeitraum_bis: '2026-07-20',
  verursacher: 'TBA',
  sperrung: 'mit Verkehrsbehinderung',
  zusatzinfo: '',
  ...o,
});

// UTM32-Koordinaten (EPSG:25832) rund um den Marktplatz.
const PUNKT = { type: 'Point', coordinates: [456447.518, 5428668.258] };
const RING = [
  [456400, 5428600],
  [456500, 5428600],
  [456500, 5428700],
  [456400, 5428700],
  [456400, 5428600],
];
const POLYGON = { type: 'Polygon', coordinates: [RING] };
const RING2 = [
  [461400, 5427500],
  [461500, 5427500],
  [461500, 5427600],
  [461400, 5427500],
];
const POLYGON2 = { type: 'Polygon', coordinates: [RING2] };

const feat = (geometry, o) => ({ type: 'Feature', properties: props(o), geometry });

// --- Deduplizierung: ein Vorgang, zwei Geometrien ---------------------------

// Reihenfolge Punkt-zuerst und Polygon-zuerst müssen dasselbe Ergebnis liefern:
// die WFS-Reihenfolge ist nicht garantiert.
for (const [name, features] of [
  ['Punkt zuerst', [feat(PUNKT), feat(POLYGON, { id: 'baustellen_aktuell.2' })]],
  ['Polygon zuerst', [feat(POLYGON, { id: 'baustellen_aktuell.2' }), feat(PUNKT)]],
]) {
  const byKey = dedupeFeatures(features);
  check(`${name}: ein Vorgang statt zwei`, byKey.size === 1);
  const entry = [...byKey.values()][0];
  check(`${name}: Punkt bleibt Marker-Geometrie`, entry.feature.geometry.type === 'Point');
  check(`${name}: Polygon als Fläche behalten`, entry.areas.length === 1);
}

// Der Dedup-Schlüssel ist die Vorgangsnummer, nicht die per-Geometrie-id —
// sonst verdoppelt sich der komplette Datensatz (CLAUDE.md).
const zweiVorgaenge = dedupeFeatures([
  feat(PUNKT, { vorgangsnummer: 'V-1' }),
  feat(POLYGON, { vorgangsnummer: 'V-1', id: 'x' }),
  feat(PUNKT, { vorgangsnummer: 'V-2', id: 'y' }),
]);
check('Dedup nach vorgangsnummer, nicht nach id', zweiVorgaenge.size === 2);

// E8 (revidiert nach der WFS-Inspektion): mehrere Nicht-Punkt-Geometrien je
// Vorgang werden ZUSAMMENGEFASST, nicht auf die erste reduziert. 24 der 183
// Vorgänge sind echt mehrteilig — bei „erste gewinnt" fehlten dort Teile der
// Sperrung, und eine unvollständige Fläche wirkt trotzdem verbindlich.
const mehrere = dedupeFeatures([
  feat(PUNKT),
  feat(POLYGON, { id: 'a' }),
  feat(POLYGON2, { id: 'b' }),
]);
check('E8: alle Nicht-Punkt-Geometrien werden behalten', [...mehrere.values()][0].areas.length === 2);

// Nur Punkt -> keine Fläche. Nur Polygon -> Fläche UND abgeleiteter Marker.
const nurPunkt = [...dedupeFeatures([feat(PUNKT)]).values()][0];
check('nur Punkt: keine Fläche', nurPunkt.areas.length === 0);
const nurPolygon = [...dedupeFeatures([feat(POLYGON)]).values()][0];
check('nur Polygon: Fläche vorhanden', nurPolygon.areas.length === 1);

// Ein Feature ohne Geometrie darf den Dedup nicht zum Absturz bringen.
let ohneGeometrieOk = true;
try {
  dedupeFeatures([feat(null), feat(PUNKT)]);
} catch {
  ohneGeometrieOk = false;
}
check('Feature ohne Geometrie stürzt nicht ab', ohneGeometrieOk);

// --- properties.area im gebauten Feature ------------------------------------

const mitFlaeche = buildFeature(props(), PUNKT, [POLYGON]);
check('area gesetzt, wenn zweite Geometrie da ist', mitFlaeche.properties.area?.type === 'Polygon');
check('area ist in WGS84 umgerechnet', mitFlaeche.properties.area.coordinates[0][0][0] === 8.403798);
check(
  'area auf 6 Nachkommastellen gerundet wie die Punkt-Koordinaten',
  mitFlaeche.properties.area.coordinates[0].every(
    ([lon, lat]) => lon === Math.round(lon * 1e6) / 1e6 && lat === Math.round(lat * 1e6) / 1e6
  )
);
check('geometry bleibt der Marker-Punkt (E1)', mitFlaeche.geometry.type === 'Point');
check('Ring bleibt geschlossen', mitFlaeche.properties.area.coordinates[0].length === RING.length);

for (const [name, leer] of [
  ['leeres Array', []],
  ['null', null],
]) {
  const ohneFlaeche = buildFeature(props(), PUNKT, leer);
  check(`area null bei ${name}`, ohneFlaeche.properties.area === null);
  check(`area ist auch bei ${name} als Feld vorhanden`, 'area' in ohneFlaeche.properties);
}

// Ein Vorgang, der nur als Polygon geliefert wird: Marker aus dem Mittelwert
// (bisheriges Verhalten) UND dieselbe Geometrie als Fläche.
const nurPolygonFeature = buildFeature(props(), POLYGON, [POLYGON]);
check(
  'nur Polygon: Marker abgeleitet und Fläche gesetzt',
  nurPolygonFeature.geometry.type === 'Point' && nurPolygonFeature.properties.area?.type === 'Polygon'
);

// --- Datumsnormalisierung (toIso über buildFeature) ---------------------------
// toIso() muss den Kalendertag aus parseDate() unverändert übernehmen,
// unabhängig von der Zeitzone des Läufers. toISOString() täte das nicht:
// parseDate() liefert lokale Mitternacht, und östlich von UTC serialisiert
// toISOString() daraus den VORTAG. Der Action-Läufer (UTC) sieht den
// Unterschied nie — ein lokaler Build in Europa schon.

const datum = buildFeature(
  props({ vorgangszeitraum_von: '07.08.2026', vorgangszeitraum_bis: '2026-08-20' }),
  PUNKT,
  []
);
check('toIso: dd.mm.yyyy behält den Kalendertag (zeitzonenfest)', datum.properties.von === '2026-08-07');
check('toIso: ISO-Datum behält den Kalendertag', datum.properties.bis === '2026-08-20');

// --- buildArea() im Detail --------------------------------------------------

check('buildArea: Punkt ergibt keine Fläche', buildArea([PUNKT]) === null);
check('buildArea: leeres Array ergibt keine Fläche', buildArea([]) === null);
check('buildArea: null ergibt keine Fläche', buildArea(null) === null);
check('buildArea: Liste aus null ergibt keine Fläche', buildArea([null, undefined]) === null);
check('buildArea: leere Koordinaten ergeben keine Fläche', buildArea([{ type: 'Polygon', coordinates: [] }]) === null);
check(
  'buildArea: kaputte Koordinaten stürzen nicht ab',
  buildArea([{ type: 'Polygon', coordinates: [[]] }]) === null
);
check(
  'buildArea: MultiPolygon bleibt MultiPolygon',
  buildArea([{ type: 'MultiPolygon', coordinates: [[RING], [RING2]] }])?.coordinates.length === 2
);
check(
  'buildArea: LineString bleibt LineString (ein Fünftel der echten Flächen)',
  buildArea([{ type: 'LineString', coordinates: RING }])?.type === 'LineString'
);
check(
  'buildArea: eine einzelne Fläche wird NICHT in Multi* verpackt',
  buildArea([POLYGON])?.type === 'Polygon'
);

// Zusammenfassen mehrerer Flächen (E8 revidiert).
const zweiPolygone = buildArea([POLYGON, POLYGON2]);
check('buildArea: zwei Polygone -> MultiPolygon', zweiPolygone.type === 'MultiPolygon');
check('buildArea: beide Polygone sind enthalten', zweiPolygone.coordinates.length === 2);
check(
  'buildArea: kein Teil geht beim Zusammenfassen verloren',
  zweiPolygone.coordinates[0][0].length === RING.length &&
    zweiPolygone.coordinates[1][0].length === RING2.length
);
const polyPlusMulti = buildArea([POLYGON, { type: 'MultiPolygon', coordinates: [[RING2], [RING]] }]);
check(
  'buildArea: Polygon + MultiPolygon werden flach zusammengeführt',
  polyPlusMulti.type === 'MultiPolygon' && polyPlusMulti.coordinates.length === 3
);
const zweiLinien = buildArea([
  { type: 'LineString', coordinates: RING },
  { type: 'MultiLineString', coordinates: [RING2, RING] },
]);
check(
  'buildArea: Linien -> MultiLineString mit allen Teilen',
  zweiLinien.type === 'MultiLineString' && zweiLinien.coordinates.length === 3
);
const gemischt = buildArea([POLYGON, { type: 'LineString', coordinates: RING2 }]);
check('buildArea: Polygon + Linie -> GeometryCollection', gemischt.type === 'GeometryCollection');
check(
  'buildArea: GeometryCollection behält beide Typen',
  gemischt.geometries.map((g) => g.type).join(',') === 'Polygon,LineString'
);
check(
  'buildArea: eine kaputte Geometrie kippt die anderen nicht',
  buildArea([{ type: 'Polygon', coordinates: [[]] }, POLYGON])?.type === 'Polygon'
);

// CRS-Autoerkennung: liefert die Quelle wider Erwarten schon WGS84, darf die
// Fläche NICHT ein zweites Mal transformiert werden (looksLikeUtm32, CLAUDE.md).
const schonWgs84 = buildArea([
  {
    type: 'Polygon',
    coordinates: [[[8.4038, 49.0088], [8.4052, 49.0088], [8.4052, 49.0097], [8.4038, 49.0088]]],
  },
]);
check(
  'buildArea: bereits WGS84 bleibt unverändert',
  schonWgs84.coordinates[0][0][0] === 8.4038 && schonWgs84.coordinates[0][0][1] === 49.0088
);

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Build-Data-Tests bestanden.');
