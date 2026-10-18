// districts.mjs — which district (Stadtteil) a construction site lies in
// (A-17/E2). Pure and dependency-free like diff-data.mjs, and build-side only:
// the browser draws a district's outline from the same committed file
// (data/districts.geojson, ADR-007), but never assigns — the answer is the
// same for every visitor, so the build computes it once.
//
// A site is assigned by its POINT, the marker (A-7/E1: `geometry` stays the
// point, and everything that asks "where" reads the point). A site whose area
// straddles a boundary therefore counts once, where its marker is.

const M_PER_DEG = 111320; // metres per degree of latitude (and of longitude at the equator)

/** Distance in metres beyond which the nearest-district fallback gives up. */
export const NEAREST_MAX_M = 100;

// Even-odd ray casting for one ring of [lon, lat] pairs. A point exactly on
// an edge may land on either side — for a site on a boundary street both
// answers are defensible, and the result is deterministic.
function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// A polygon is [outer, ...holes]: inside the outer ring and in none of the holes.
function inPolygon(lon, lat, rings) {
  if (!rings.length || !inRing(lon, lat, rings[0])) return false;
  for (let k = 1; k < rings.length; k++) if (inRing(lon, lat, rings[k])) return false;
  return true;
}

function polygonsOf(geometry) {
  if (geometry?.type === 'Polygon') return [geometry.coordinates];
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

/** Whether a (Multi)Polygon contains the [lon, lat] point. */
export function containsPoint(geometry, [lon, lat]) {
  return polygonsOf(geometry).some((rings) => inPolygon(lon, lat, rings));
}

/**
 * Shortest distance in metres from a [lon, lat] point to the boundary of a
 * (Multi)Polygon — an equirectangular projection around the point, which is
 * exact enough at city scale.
 */
export function distanceToBoundaryM(geometry, [lon, lat]) {
  const kx = M_PER_DEG * Math.cos((lat * Math.PI) / 180);
  let best = Infinity;
  for (const rings of polygonsOf(geometry)) {
    for (const ring of rings) {
      for (let i = 1; i < ring.length; i++) {
        const ax = (ring[i - 1][0] - lon) * kx;
        const ay = (ring[i - 1][1] - lat) * M_PER_DEG;
        const dx = (ring[i][0] - lon) * kx - ax;
        const dy = (ring[i][1] - lat) * M_PER_DEG - ay;
        const len2 = dx * dx + dy * dy;
        const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
        best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
      }
    }
  }
  return best;
}

/**
 * The name of the district that contains the point; otherwise the nearest
 * district within NEAREST_MAX_M (a border road, rounding); otherwise null,
 * which the app shows as "ohne Stadtteil" (A-17/E2).
 * @param {[number, number]} point [lon, lat]
 * @param {{features: Array<{geometry: object, properties: {name: string}}>}} districts
 */
export function assignDistrict(point, districts) {
  if (!Array.isArray(point) || !Array.isArray(districts?.features)) return null;
  for (const d of districts.features) {
    if (containsPoint(d.geometry, point)) return d.properties.name;
  }
  let best = null;
  let bestM = Infinity;
  for (const d of districts.features) {
    const m = distanceToBoundaryM(d.geometry, point);
    if (m < bestM) {
      bestM = m;
      best = d.properties.name;
    }
  }
  return bestM <= NEAREST_MAX_M ? best : null;
}
