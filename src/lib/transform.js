// transform.js — Koordinaten-Transformation UTM Zone 32N (EPSG:25832) -> WGS84.
//
// Reine Funktionen, keine DOM-Abhängigkeit. Wird sowohl vom Build-Skript
// (Node) als auch vom Client (Browser) über `src/lib/` geteilt (siehe ADR-001).
//
// EPSG:25832 = ETRS89 / UTM Zone 32N, Ellipsoid GRS80. Für die Umrechnung
// nach WGS84 sind GRS80 und WGS84 praktisch identisch (Abweichung im
// Millimeterbereich, für Baustellen-Darstellung irrelevant). Umgesetzt ist
// die klassische inverse transversale Mercator-Projektion (Snyder).

// GRS80-Ellipsoid
const A = 6378137.0; // große Halbachse [m]
const F = 1 / 298.257222101; // Abplattung
const K0 = 0.9996; // Maßstabsfaktor UTM
const E0 = 500000.0; // False Easting
const N0 = 0.0; // False Northing (Nordhalbkugel)
const LON0 = 9.0; // Zentralmeridian Zone 32 = -183 + 6*32

const E2 = F * (2 - F); // erste Exzentrizität²
const EP2 = E2 / (1 - E2); // zweite Exzentrizität²
const DEG = 180 / Math.PI;

/**
 * Rechnet ein Punktepaar aus UTM Zone 32N (EPSG:25832) nach WGS84 um.
 * @param {number} easting  Ostwert [m]
 * @param {number} northing Nordwert [m]
 * @returns {[number, number]} [lon, lat] in Dezimalgrad (GeoJSON-Reihenfolge)
 */
export function utm32ToWgs84(easting, northing) {
  const x = easting - E0;
  const y = northing - N0;

  const m = y / K0;
  const mu =
    m /
    (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 * E2 * E2) / 256));

  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const e1_2 = e1 * e1;
  const e1_3 = e1_2 * e1;
  const e1_4 = e1_3 * e1;

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1_3) / 32) * Math.sin(2 * mu) +
    ((21 * e1_2) / 16 - (55 * e1_4) / 32) * Math.sin(4 * mu) +
    ((151 * e1_3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1_4) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const c1 = EP2 * cosPhi1 * cosPhi1;
  const t1 = tanPhi1 * tanPhi1;
  const n1 = A / Math.sqrt(1 - E2 * sinPhi1 * sinPhi1);
  const r1 = (A * (1 - E2)) / Math.pow(1 - E2 * sinPhi1 * sinPhi1, 1.5);
  const d = x / (n1 * K0);

  const d2 = d * d;
  const d3 = d2 * d;
  const d4 = d3 * d;
  const d5 = d4 * d;
  const d6 = d5 * d;

  const lat =
    phi1 -
    ((n1 * tanPhi1) / r1) *
      (d2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * EP2) * d4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * EP2 - 3 * c1 * c1) *
          d6) /
          720);

  const lon =
    LON0 / DEG +
    (d -
      ((1 + 2 * t1 + c1) * d3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * EP2 + 24 * t1 * t1) * d5) /
        120) /
      cosPhi1;

  return [lon * DEG, lat * DEG];
}

/**
 * Transformiert eine GeoJSON-Geometrie (Point/Polygon/MultiPolygon/LineString)
 * rekursiv von EPSG:25832 nach WGS84. Gibt eine neue Geometrie zurück.
 * @param {object} geometry GeoJSON-Geometrie mit Koordinaten in EPSG:25832
 * @returns {object} neue Geometrie mit WGS84-Koordinaten
 */
export function transformGeometry(geometry) {
  if (!geometry || !geometry.coordinates) return geometry;
  const walk = (coords) => {
    // Ein Koordinatenpaar erkennt man daran, dass das erste Element eine Zahl ist.
    if (typeof coords[0] === 'number') {
      return utm32ToWgs84(coords[0], coords[1]);
    }
    return coords.map(walk);
  };
  return { ...geometry, coordinates: walk(geometry.coordinates) };
}
