// Testscript für diff-data.mjs — prüft die Änderungserkennung.
// Ausführen: node scripts/test-diff.mjs (Exit 0 = ok, 1 = Fehler)

import { diffFeatures, hasChanges, summaryLine } from './diff-data.mjs';

let failed = 0;
function check(name, cond) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}`);
  if (!cond) failed++;
}

const mk = (id, titel, bis, ampel = 'teil') => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [8.4, 49.0] },
  properties: {
    id, titel, bis, von: '2026-07-01', ampel, verursacher: 'X', info: null,
    verkehrsmittel: { fuss: false, rad: false, auto: true, oepnv: false },
  },
});

const prev = [mk('A', 'Kaiserstr', '2026-07-25'), mk('B', 'Sophienstr', '2026-07-24'), mk('C', 'Durlacher', '2026-09-30')];
const next = [mk('A', 'Kaiserstr', '2026-07-25'), mk('C', 'Durlacher', '2026-10-15'), mk('D', 'Haid-Neu', '2026-08-15')];

const d = diffFeatures(prev, next);
check('erkennt Änderungen', hasChanges(d) === true);
check('1 hinzugefügt (D)', d.added.length === 1 && d.added[0].properties.id === 'D');
check('1 entfernt (B)', d.removed.length === 1 && d.removed[0].properties.id === 'B');
check('1 geändert (C)', d.changed.length === 1 && d.changed[0].feature.properties.id === 'C');
check('Feld-Detail nennt Ende', d.changed[0].changes.some((c) => c.includes('Ende')));
check('1 unverändert (A)', d.unchanged === 1);
check('summaryLine korrekt', summaryLine(d, next.length) === '1 neu, 1 entfernt, 1 geändert (gesamt 3)');

// Identische Snapshots -> keine Änderung
const same = diffFeatures(prev, prev.map((f) => ({ ...f, properties: { ...f.properties } })));
check('identische Daten -> keine Änderung', hasChanges(same) === false);
check('reine Reihenfolge egal', hasChanges(diffFeatures(prev, [...next].reverse())) === true); // Inhalt geändert
check('gleiche Menge umsortiert -> keine Änderung', hasChanges(diffFeatures(prev, [...prev].reverse())) === false);

// Nur Ampel geändert -> als Änderung erkannt
const ampelChange = diffFeatures([mk('A', 'X', '2026-07-25', 'teil')], [mk('A', 'X', '2026-07-25', 'voll')]);
check('Ampel-Änderung erkannt', ampelChange.changed.length === 1);

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Diff-Tests bestanden.');
