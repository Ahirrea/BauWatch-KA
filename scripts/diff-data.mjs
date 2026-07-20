// diff-data.mjs — Vergleich zweier Baustellen-Snapshots.
//
// Reine Funktionen, damit sie testbar sind. Der Vergleich ignoriert bewusst
// die volatilen Sammlungs-Metadaten (stand, count, attribution): Nur echte
// Änderungen an den Baustellen sollen einen neuen Commit auslösen — sonst
// würde der wechselnde Zeitstempel bei jedem Lauf einen Rausch-Commit erzeugen
// und die Git-Historie als Änderungsprotokoll wertlos machen.

// Stabiler Schlüssel je Vorgang: bevorzugt die id, sonst eine Kombination.
export function keyOf(feature) {
  const p = feature.properties || {};
  if (p.id != null && p.id !== '') return `id:${p.id}`;
  return `x:${p.titel ?? ''}|${p.von ?? ''}|${p.bis ?? ''}`;
}

// JSON mit sortierten Schlüsseln -> stabile Signatur unabhängig von Reihenfolge.
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

// Signatur eines Features aus Geometrie + Properties (ohne interne _-Felder).
export function signature(feature) {
  const props = {};
  for (const [k, v] of Object.entries(feature.properties || {})) {
    if (!k.startsWith('_')) props[k] = v;
  }
  return stableStringify({ c: feature.geometry?.coordinates, p: props });
}

// Menschlich lesbare Feld-Änderungen für einen geänderten Vorgang.
const WATCH_FIELDS = [
  ['ampel', 'Sperrgrad'],
  ['von', 'Beginn'],
  ['bis', 'Ende'],
  ['titel', 'Bezeichnung'],
  ['verursacher', 'Verursacher'],
  ['info', 'Info'],
];

function fieldChanges(prev, next) {
  const a = prev.properties || {};
  const b = next.properties || {};
  const changes = [];
  for (const [field, label] of WATCH_FIELDS) {
    const av = a[field];
    const bv = b[field];
    if (JSON.stringify(av) === JSON.stringify(bv)) continue;
    if (field === 'info' || field === 'titel') {
      changes.push(`${label} geändert`);
    } else {
      changes.push(`${label}: ${av ?? '–'} → ${bv ?? '–'}`);
    }
  }
  return changes;
}

/**
 * Vergleicht zwei Feature-Listen und liefert added / removed / changed.
 * @param {Array} prevFeatures
 * @param {Array} nextFeatures
 * @returns {{added: object[], removed: object[], changed: object[], unchanged: number}}
 */
export function diffFeatures(prevFeatures = [], nextFeatures = []) {
  const prevMap = new Map(prevFeatures.map((f) => [keyOf(f), f]));
  const nextMap = new Map(nextFeatures.map((f) => [keyOf(f), f]));

  const added = [];
  const removed = [];
  const changed = [];
  let unchanged = 0;

  for (const [key, nf] of nextMap) {
    const pf = prevMap.get(key);
    if (!pf) {
      added.push(nf);
    } else if (signature(pf) !== signature(nf)) {
      changed.push({ feature: nf, changes: fieldChanges(pf, nf) });
    } else {
      unchanged++;
    }
  }
  for (const [key, pf] of prevMap) {
    if (!nextMap.has(key)) removed.push(pf);
  }
  return { added, removed, changed, unchanged };
}

export function hasChanges(diff) {
  return diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0;
}

const titleOf = (f) => (f.properties && f.properties.titel) || '(ohne Bezeichnung)';

/** Einzeilige Zusammenfassung, z. B. für Commit-Message / Log. */
export function summaryLine(diff, total) {
  const parts = [];
  if (diff.added.length) parts.push(`${diff.added.length} neu`);
  if (diff.removed.length) parts.push(`${diff.removed.length} entfernt`);
  if (diff.changed.length) parts.push(`${diff.changed.length} geändert`);
  const what = parts.length ? parts.join(', ') : 'keine Änderung';
  return `${what} (gesamt ${total})`;
}

/** Mehrzeilige Markdown-Übersicht (für CHANGELOG und Job-Summary). */
export function summaryMarkdown(diff, total, timestamp, { firstFill = false } = {}) {
  const lines = [];
  lines.push(`## ${timestamp} — ${summaryLine(diff, total)}`);
  if (firstFill) {
    lines.push('');
    lines.push(`- 🎉 Erstbefüllung mit echten Daten (${total} Baustellen).`);
    return lines.join('\n');
  }
  lines.push('');
  for (const f of diff.added) lines.push(`- ➕ **${titleOf(f)}**`);
  for (const f of diff.removed) lines.push(`- ➖ ~~${titleOf(f)}~~`);
  for (const c of diff.changed) {
    const detail = c.changes.length ? ` — ${c.changes.join('; ')}` : '';
    lines.push(`- ✏️ ${titleOf(c.feature)}${detail}`);
  }
  return lines.join('\n');
}
