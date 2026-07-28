// Mini-Testscript für transform.js — prüft die inverse UTM32->WGS84-Umrechnung
// gegen bekannte Referenzkoordinaten. Die Referenzwerte wurden einmalig mit
// proj4 (EPSG:25832 -> EPSG:4326) erzeugt; proj4 ist KEINE Laufzeit-Abhängigkeit
// des Projekts, sondern diente nur der Ground-Truth-Erzeugung für diesen Test.
//
// Ausführen:  node scripts/test-transform.mjs
// Exit-Code 0 = alle Tests bestanden, 1 = Abweichung zu groß.

import { utm32ToWgs84, transformGeometry } from '../src/lib/transform.js';

// [Name, easting, northing, erwartet lon, erwartet lat]
const REFERENCES = [
  ['Marktplatz Karlsruhe', 456447.518, 5428668.258, 8.40444, 49.00937],
  ['KIT Schloss', 456888.832, 5428898.273, 8.41045, 49.01147],
  ['Durlach', 461435.87, 5427511.878, 8.47276, 48.9993],
  // Punkt auf dem Zentralmeridian (9°O) am Äquator -> exakt E=500000, N=0.
  ['Zentralmeridian/Äquator', 500000.0, 0.0, 9.0, 0.0],
];

// Toleranz: 1e-5 Grad ~ 1,1 m. Deutlich enger als jede sichtbare Marker-Abweichung.
const TOL = 1e-5;

let failed = 0;
for (const [name, e, n, expLon, expLat] of REFERENCES) {
  const [lon, lat] = utm32ToWgs84(e, n);
  const dLon = Math.abs(lon - expLon);
  const dLat = Math.abs(lat - expLat);
  const ok = dLon <= TOL && dLat <= TOL;
  if (!ok) failed++;
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(
    `[${mark}] ${name}: lon=${lon.toFixed(7)} (Δ${dLon.toExponential(1)}) ` +
      `lat=${lat.toFixed(7)} (Δ${dLat.toExponential(1)})`
  );
}

// --- transformGeometry() ----------------------------------------------------
// Bis A-7 (Baustellenflächen) war diese Funktion geschrieben, aber unbenutzt und
// ungetestet. Seit properties.area daran hängt, braucht sie dieselbe Ground
// Truth wie die Punkt-Umrechnung: Referenzwerte einmalig mit proj4 erzeugt
// (EPSG:25832 -> EPSG:4326), auf 6 Nachkommastellen gerundet wie im Build.

// Quadrat um den Marktplatz, geschlossener Ring (erster Punkt == letzter).
const RING_UTM = [
  [456400, 5428600],
  [456500, 5428600],
  [456500, 5428700],
  [456400, 5428700],
  [456400, 5428600],
];
const RING_WGS = [
  [8.403798, 49.008753],
  [8.405165, 49.00876],
  [8.405154, 49.009659],
  [8.403787, 49.009652],
  [8.403798, 49.008753],
];
// Dreieck bei Durlach — zweiter Teil des MultiPolygons.
const RING2_UTM = [
  [461400, 5427500],
  [461500, 5427500],
  [461500, 5427600],
  [461400, 5427500],
];
const RING2_WGS = [
  [8.472271, 48.999191],
  [8.473638, 48.999197],
  [8.473628, 49.000097],
  [8.472271, 48.999191],
];
// Marktplatz -> KIT Schloss, als LineString (E8/Randfall in A-7: liefert der
// WFS eine Linie statt einer dünnen Fläche, muss sie genauso durchlaufen).
const LINE_UTM = [
  [456447.518, 5428668.258],
  [456888.832, 5428898.273],
];
const LINE_WGS = [
  [8.40444, 49.00937],
  [8.41045, 49.01147],
];

// Vergleicht beliebig tief verschachtelte Koordinaten-Strukturen paarweise.
function coordsMatch(actual, expected) {
  if (typeof expected[0] === 'number') {
    return (
      typeof actual[0] === 'number' &&
      Math.abs(actual[0] - expected[0]) <= TOL &&
      Math.abs(actual[1] - expected[1]) <= TOL
    );
  }
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    expected.every((e, i) => coordsMatch(actual[i], e))
  );
}

function checkGeometry(name, input, expectedType, expectedCoords) {
  const out = transformGeometry(input);
  const ok = out && out.type === expectedType && coordsMatch(out.coordinates, expectedCoords);
  if (!ok) failed++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] transformGeometry: ${name}`);
  return out;
}

checkGeometry('Point', { type: 'Point', coordinates: [456447.518, 5428668.258] }, 'Point', [
  8.40444, 49.00937,
]);
checkGeometry('Polygon (ein Ring)', { type: 'Polygon', coordinates: [RING_UTM] }, 'Polygon', [
  RING_WGS,
]);
checkGeometry(
  'MultiPolygon (zwei Teile)',
  { type: 'MultiPolygon', coordinates: [[RING_UTM], [RING2_UTM]] },
  'MultiPolygon',
  [[RING_WGS], [RING2_WGS]]
);
checkGeometry('LineString', { type: 'LineString', coordinates: LINE_UTM }, 'LineString', LINE_WGS);

// Ein Polygon mit Loch: der zweite Ring darf nicht verloren gehen oder mit dem
// ersten verschmelzen — genau das wäre der Fehler, den eine flache
// Implementierung machen würde.
const mitLoch = transformGeometry({ type: 'Polygon', coordinates: [RING_UTM, RING2_UTM] });
const ringeErhalten =
  mitLoch.coordinates.length === 2 &&
  mitLoch.coordinates[0].length === RING_UTM.length &&
  mitLoch.coordinates[1].length === RING2_UTM.length;
if (!ringeErhalten) failed++;
console.log(`[${ringeErhalten ? 'PASS' : 'FAIL'}] transformGeometry: Polygon mit Loch behält beide Ringe`);

// Reinheit: die Eingabe-Geometrie bleibt unverändert (der Build gibt dieselbe
// Rohgeometrie auch an representativePoint() weiter).
const eingabe = { type: 'Polygon', coordinates: [RING_UTM.map((c) => [...c])] };
const vorher = JSON.stringify(eingabe);
transformGeometry(eingabe);
const unveraendert = JSON.stringify(eingabe) === vorher;
if (!unveraendert) failed++;
console.log(`[${unveraendert ? 'PASS' : 'FAIL'}] transformGeometry: Eingabe wird nicht verändert`);

// Geometrie ohne Koordinaten wird unverändert zurückgegeben, statt zu werfen.
const leer = transformGeometry(null);
const nullDurchgereicht = leer === null && transformGeometry({ type: 'Polygon' }).coordinates === undefined;
if (!nullDurchgereicht) failed++;
console.log(`[${nullDurchgereicht ? 'PASS' : 'FAIL'}] transformGeometry: null/koordinatenlos ohne Fehler`);

if (failed > 0) {
  console.error(`\n${failed} Prüfung(en) fehlgeschlagen (Toleranz ${TOL}°).`);
  process.exit(1);
}
console.log('\nAlle Referenzkoordinaten und Geometrie-Prüfungen bestanden.');
