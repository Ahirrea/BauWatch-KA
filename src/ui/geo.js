// geo.js — map constants and the little geometry the client needs (A-14/E11).

export const KA_CENTER = [49.0094, 8.4044]; // Marktplatz
export const RADIUS_KM = 1.5;

// Eindeutiger Schlüssel je Feature (id kann fehlen -> Index-Fallback).
export function featureKey(f, i) {
  return f.properties.id != null ? `id:${f.properties.id}` : `idx:${i}`;
}

export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// GeoJSON-Koordinaten sind [lon, lat]; Leaflet erwartet [lat, lon].
export function latLngOf(f) {
  const [lon, lat] = f.geometry.coordinates;
  return [lat, lon];
}
