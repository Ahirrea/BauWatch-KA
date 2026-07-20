// quality-report.mjs — Datenqualitäts-Report (Backlog #18).
//
// Reine Funktionen (testbar). Untersucht die aufbereiteten Vorgänge auf
// Auffälligkeiten, damit man der Stadt strukturiertes Feedback geben kann:
//   - leere Pflichtfelder (Zeitraum, Lage, Verursacher, Sperrung),
//   - unbekannte art-Kategorien (Fallback statt Klartext),
//   - Datumsauffälligkeiten (Ende vor Beginn, fehlend, bereits abgelaufen),
//   - Koordinaten außerhalb des Karlsruher Rahmens,
//   - Vorgänge ohne Vorgangsnummer (Dedup-Fallback).
//
// Eingabe: normalisierte Records (von build-data.mjs erzeugt) + Zähler-Statistik.

const KA_BBOX = { lonMin: 8.2, lonMax: 8.6, latMin: 48.9, latMax: 49.1 };
const MAX_EXAMPLES = 10;

function label(r) {
  return `${r.vorgang ?? '?'} — ${r.titelRaw || r.titel || '(ohne Lage)'}`;
}

/**
 * Analysiert die Vorgänge und liefert einen strukturierten Report.
 * @param {object[]} records normalisierte Vorgänge (siehe build-data.mjs)
 * @param {{raw:number, ka:number, deduped:number, skipped:number}} stats
 * @param {Date} [now]
 */
export function analyzeQuality(records, stats, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const missing = {
    von: [],
    bis: [],
    lage: [],
    verursacher: [],
    sperrung: [],
  };
  const dateIssues = { endeVorBeginn: [], abgelaufen: [] };
  const coordsOutside = [];
  const ohneVorgangsnummer = [];
  const unknownArt = new Map(); // label -> count
  const sperrungWerte = new Map(); // rohwert -> { count, ampel:Set }

  for (const r of records) {
    if (!r.von) missing.von.push(label(r));
    if (!r.bis) missing.bis.push(label(r));
    if (!r.titelRaw) missing.lage.push(label(r));
    if (!r.verursacher) missing.verursacher.push(label(r));
    if (!r.sperrung) missing.sperrung.push(label(r));

    if (r.von && r.bis && r.bis < r.von) dateIssues.endeVorBeginn.push(`${label(r)} (${r.von} → ${r.bis})`);
    if (r.bis) {
      const end = new Date(r.bis);
      if (!isNaN(end) && end < today) dateIssues.abgelaufen.push(`${label(r)} (bis ${r.bis})`);
    }

    if (
      typeof r.lon !== 'number' || typeof r.lat !== 'number' ||
      r.lon < KA_BBOX.lonMin || r.lon > KA_BBOX.lonMax ||
      r.lat < KA_BBOX.latMin || r.lat > KA_BBOX.latMax
    ) {
      coordsOutside.push(`${label(r)} (${r.lon}, ${r.lat})`);
    }

    if (!r.hasVorgangsnummer) ohneVorgangsnummer.push(label(r));

    if (r.artKnown === false) unknownArt.set(r.art, (unknownArt.get(r.art) || 0) + 1);

    if (r.sperrung) {
      const e = sperrungWerte.get(r.sperrung) || { count: 0, ampel: new Set() };
      e.count++;
      e.ampel.add(r.ampel);
      sperrungWerte.set(r.sperrung, e);
    }
  }

  return {
    stats,
    total: records.length,
    missing,
    dateIssues,
    coordsOutside,
    ohneVorgangsnummer,
    unknownArt: [...unknownArt.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    sperrungWerte: [...sperrungWerte.entries()]
      .map(([wert, e]) => ({ wert, count: e.count, ampel: [...e.ampel].join('/') }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Einzeiler für Log/Job-Summary. */
export function summarizeQuality(report) {
  const m = report.missing;
  const problems =
    m.von.length + m.bis.length + m.lage.length + m.verursacher.length + m.sperrung.length +
    report.dateIssues.endeVorBeginn.length + report.coordsOutside.length;
  return (
    `${report.total} Vorgänge · ${problems} Feld-/Datenauffälligkeiten · ` +
    `${report.unknownArt.length} unbekannte Kategorien · ` +
    `${report.dateIssues.abgelaufen.length} abgelaufen (zum Build-Zeitpunkt)`
  );
}

function block(title, items) {
  if (!items.length) return `- **${title}:** keine\n`;
  const shown = items.slice(0, MAX_EXAMPLES);
  const more = items.length > MAX_EXAMPLES ? `\n  - … und ${items.length - MAX_EXAMPLES} weitere` : '';
  return `- **${title}:** ${items.length}\n` + shown.map((x) => `  - ${x}`).join('\n') + more + '\n';
}

/** Vollständiger Markdown-Report (für data/QUALITY.md und Job-Summary). */
export function renderQualityMarkdown(report, stand) {
  const s = report.stats;
  const L = [];
  L.push('# Datenqualitäts-Report');
  L.push('');
  L.push(`_Automatisch beim Daten-Build erzeugt. Stand: ${stand}._`);
  L.push('');
  L.push('## Pipeline');
  L.push(`- Rohdaten: **${s.raw}** Features`);
  L.push(`- nach Gemeinde-Filter (Karlsruhe): **${s.ka}**`);
  L.push(`- nach Deduplizierung (Vorgangsnummer): **${s.deduped}** Vorgänge`);
  L.push(`- ohne verwertbare Geometrie übersprungen: **${s.skipped}**`);
  L.push('');
  L.push('## Leere Pflichtfelder');
  L.push(block('ohne Zeitraum-Beginn (von)', report.missing.von));
  L.push(block('ohne Zeitraum-Ende (bis)', report.missing.bis));
  L.push(block('ohne Lage', report.missing.lage));
  L.push(block('ohne Verursacher', report.missing.verursacher));
  L.push(block('ohne Sperrung-Angabe', report.missing.sperrung));
  L.push('## Datumsauffälligkeiten');
  L.push(block('Ende vor Beginn', report.dateIssues.endeVorBeginn));
  L.push(block('bereits abgelaufen (bis in der Vergangenheit, zum Build-Zeitpunkt)', report.dateIssues.abgelaufen));
  L.push('## Kategorien & Sperrung');
  if (report.unknownArt.length === 0) {
    L.push('- **unbekannte art-Kategorien:** keine (alle als Klartext erkannt)');
  } else {
    L.push('- **unbekannte art-Kategorien (Fallback statt Klartext):**');
    for (const u of report.unknownArt) L.push(`  - ${u.label} (${u.count}×)`);
  }
  L.push('');
  L.push('- **erkannte Sperrung-Werte → Ampel:**');
  for (const w of report.sperrungWerte) L.push(`  - „${w.wert}" (${w.count}×) → ${w.ampel}`);
  L.push('');
  L.push('## Geometrie & Identität');
  L.push(block('Koordinaten außerhalb des Karlsruher Rahmens', report.coordsOutside));
  L.push(block('Vorgänge ohne Vorgangsnummer (Dedup-Fallback)', report.ohneVorgangsnummer));
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
