// EINMALIGES Diagnose-Skript (temporär) — druckt die Rohstruktur des WFS, damit
// wir die korrekte Deduplizierungslogik (Punkt+Polygon je Vorgang) entwerfen
// können. Wird nach der Analyse wieder entfernt.

const URL_ =
  'https://mobil.trk.de/geoserver/TBA/ows?service=WFS&version=1.0.0' +
  '&request=GetFeature&typeName=TBA:baustellen_aktuell&outputFormat=application/json';

const res = await fetch(URL_, { headers: { 'User-Agent': 'BauWatch-KA inspect' } });
console.log('HTTP', res.status);
const json = await res.json();
const feats = (json.features || []).filter((f) => {
  const g = f.properties?.gemeinde;
  return typeof g === 'string' && g.toLowerCase() === 'karlsruhe';
});
console.log('KA-Features:', feats.length);

// 1. Alle Property-Schlüssel (Vereinigung).
const keys = new Set();
for (const f of feats) for (const k of Object.keys(f.properties || {})) keys.add(k);
console.log('\nAlle Property-Felder:', [...keys].join(', '));

// 2. Erstes Feature komplett (Rohwerte).
console.log('\n--- Feature[0] ---');
console.log('id:', feats[0].id, '| geom:', feats[0].geometry?.type);
console.log('properties:', JSON.stringify(feats[0].properties, null, 1));

// 3. Bestes „Geschwister" zu Feature[0] finden: das Feature mit den meisten
//    übereinstimmenden Property-Werten (ohne die id) — vermutlich das Polygon
//    zum Punkt. Zeigt, welche Felder geteilt werden und welche sich unterscheiden.
const base = feats[0].properties;
let best = null,
  bestScore = -1;
for (let i = 1; i < feats.length; i++) {
  const p = feats[i].properties;
  let score = 0;
  for (const k of keys) if (k !== 'id' && JSON.stringify(base[k]) === JSON.stringify(p[k])) score++;
  if (score > bestScore) {
    bestScore = score;
    best = { i, f: feats[i] };
  }
}
console.log(`\n--- bestes Geschwister (Index ${best.i}, ${bestScore} gleiche Felder) ---`);
console.log('id:', best.f.id, '| geom:', best.f.geometry?.type);
console.log('properties:', JSON.stringify(best.f.properties, null, 1));

// 4. Welche Felder unterscheiden sich zwischen den beiden?
const diff = [];
for (const k of keys) {
  if (JSON.stringify(base[k]) !== JSON.stringify(best.f.properties[k])) {
    diff.push(`${k}: ${JSON.stringify(base[k])} != ${JSON.stringify(best.f.properties[k])}`);
  }
}
console.log('\nUnterschiede:', diff.length ? '\n  ' + diff.join('\n  ') : 'keine');

// 5. Geometrietypen-Verteilung.
const gt = {};
for (const f of feats) gt[f.geometry?.type] = (gt[f.geometry?.type] || 0) + 1;
console.log('\nGeometrietypen:', JSON.stringify(gt));
