// Mini-Testscript für transform.js — prüft die inverse UTM32->WGS84-Umrechnung
// gegen bekannte Referenzkoordinaten. Die Referenzwerte wurden einmalig mit
// proj4 (EPSG:25832 -> EPSG:4326) erzeugt; proj4 ist KEINE Laufzeit-Abhängigkeit
// des Projekts, sondern diente nur der Ground-Truth-Erzeugung für diesen Test.
//
// Ausführen:  node scripts/test-transform.mjs
// Exit-Code 0 = alle Tests bestanden, 1 = Abweichung zu groß.

import { utm32ToWgs84 } from '../src/lib/transform.js';

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

if (failed > 0) {
  console.error(`\n${failed} Referenz(en) außerhalb der Toleranz (${TOL}°).`);
  process.exit(1);
}
console.log('\nAlle Referenzkoordinaten innerhalb der Toleranz.');
