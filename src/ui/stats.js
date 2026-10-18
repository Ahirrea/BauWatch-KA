// stats.js — the "Statistik" tab (A-15): the current snapshot in numbers.
//
// All of Karlsruhe, not the filtered list (E1) — the filters sit in the Liste
// tab and cannot be seen from here. Everything is derived at render time from
// the snapshot the page already loaded (E7 of A-10, kept): no new data, no
// request, nothing stored, and no visitor counted (A-15, tension 1). The
// counting itself lives in src/lib/stats.js, where npm test sees it (E5).
//
// Forms (E3): text first — every value is printed, so there is no tooltip
// layer (E4). One neutral series colour (--bar) for every chart except the
// Sperrgrad split, which alone carries the traffic-light colours.

import { AMPEL_LABEL, VM_LABEL } from '../lib/i18n.js';
import { formatRange } from '../lib/format.js';
import {
  ENDET_BALD_TAGE,
  countBy,
  durationDays,
  endetInnerhalb,
  longest,
  median,
  normalizeLabel,
  restdauerBands,
  summarize,
  topWithRest,
} from '../lib/stats.js';
import { state } from './state.js';
import { el, escapeHtml } from './dom.js';
import { str } from './text.js';
import { renderHistory } from './history.js';
import { districtNames } from './districts.js';

const LOCALE = { de: 'de-DE', en: 'en-GB' };
let gezeichnet = false; // rendered once → re-render on new data / language

const zahl = (n, digits = 0) =>
  n.toLocaleString(LOCALE[state.lang], { maximumFractionDigits: digits, minimumFractionDigits: 0 });

// "Typische Bauzeit" is a median (E8): days below 60, months (one decimal) up
// to two years, years (one decimal) beyond.
function dauerText(days) {
  if (days >= 730) return str('statsYears', { n: zahl(days / 365, 1) });
  if (days >= 60) return str('statsMonths', { n: zahl(days / 30.44, 1) });
  return str('statsDays', { n: zahl(days) });
}

// Bars scale to the largest value, with a visible minimum, so a small count
// next to a large one stays a short bar instead of vanishing.
function barsHtml(entries) {
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return `<div class="stats-bars">${entries
    .map(
      ([label, n]) => `
        <span class="stats-bar-label">${escapeHtml(label)}</span>
        <span class="stats-bar-track">
          <span class="stats-bar" style="width:${Math.max(1.5, (n / max) * 100).toFixed(1)}%"></span>
          <span class="stats-bar-value">${zahl(n)}</span>
        </span>`
    )
    .join('')}</div>`;
}

function section(title, body, note = '') {
  return `<section class="stats-section">
    <h3>${escapeHtml(title)}</h3>
    ${note ? `<p class="stats-note">${escapeHtml(note)}</p>` : ''}
    ${body}
  </section>`;
}

function bandLabel(upTo, i, bands) {
  if (i === 0) return str('statsBandUpTo', { n: upTo });
  if (upTo === null) return str('statsBandYear');
  const from = bands[i - 1].upTo + 1;
  // Bands past a month read in months (31–91 → 1–3, 92–365 → 3–12).
  if (upTo > 31) return str('statsBandMonths', { from: Math.round(from / 30.44) || 1, to: Math.round(upTo / 30.44) });
  return str('statsBandDays', { from, to: upTo });
}

function render() {
  const box = el('stats');
  if (!box) return;
  if (state.loadError) {
    box.innerHTML = `<p class="stats-error">${escapeHtml(str('listStatusLoadError'))}</p>`;
    gezeichnet = true;
    return;
  }
  if (!state.geladen) {
    box.innerHTML = `<p>${escapeHtml(str('listStatusLoading'))}</p>`;
    gezeichnet = true;
    return;
  }
  const features = state.features;
  if (features.length === 0) {
    box.innerHTML = `<p>${escapeHtml(str('statsEmpty'))}</p>`;
    return;
  }
  const now = new Date();
  const k = summarize(features);
  const dauern = features.map((f) => durationDays(f.properties));
  const ohneDaten = dauern.filter((d) => d === null).length;
  const typisch = median(dauern);
  const bald = features.filter((f) => endetInnerhalb(f.properties, ENDET_BALD_TAGE, now)).length;
  const ampel = AMPEL_LABEL[state.lang];
  const kurz = { voll: str('filterVoll'), teil: str('filterTeil'), gering: str('filterGering') };
  const anteil = (n) => ((n / k.total) * 100).toFixed(2);

  const kpis = `<div class="stats-kpis">
    <div class="stats-kpi"><span class="stats-kpi-value">${zahl(k.total)}</span><span class="stats-kpi-label">${escapeHtml(str('statsKpiTotal'))}</span></div>
    <div class="stats-kpi"><span class="stats-kpi-value">${zahl(k.voll)}</span><span class="stats-kpi-label">${escapeHtml(str('statsKpiVoll'))}</span></div>
    <div class="stats-kpi"><span class="stats-kpi-value">${typisch === null ? '–' : escapeHtml(dauerText(typisch))}</span><span class="stats-kpi-label">${escapeHtml(str('statsKpiMedian'))}</span></div>
    <div class="stats-kpi"><span class="stats-kpi-value">${zahl(bald)}</span><span class="stats-kpi-label">${escapeHtml(str('statsKpiBald', { n: ENDET_BALD_TAGE }))}</span></div>
  </div>`;

  // The one place the traffic-light colours appear here, always with word and
  // number beside them: amber/green separate by only ΔE 7.4 under protanopia
  // in light mode (A-15, tension 4), which is legal with labels only.
  const stufen = ['voll', 'teil', 'gering'];
  const punkt = { voll: 'red', teil: 'amber', gering: 'green' };
  const stack = `<div class="stats-stack" role="img" aria-label="${escapeHtml(str('statsStackAria', { voll: k.voll, teil: k.teil, gering: k.gering }))}">
      ${stufen.map((s) => (k[s] ? `<span class="stats-stack-seg dot-${punkt[s]}" style="width:${anteil(k[s])}%" title="${escapeHtml(ampel[s])}"></span>` : '')).join('')}
    </div>
    <ul class="stats-legend">
      ${stufen.map((s) => `<li><span class="dot dot-${punkt[s]}" aria-hidden="true"></span>${escapeHtml(kurz[s])} <strong>${zahl(k[s])}</strong></li>`).join('')}
    </ul>`;

  const art = topWithRest(countBy(features, (f) => f.properties.art || str('statsUnknown')), 6, str('statsOther'));
  const wer = topWithRest(
    countBy(features, (f) => normalizeLabel(f.properties.verursacher) || str('statsUnknown')),
    5,
    str('statsOther')
  );
  // A-17/E8: every district with at least one site, by count — all printed,
  // like every chart here. "ohne Stadtteil" appears only when a site has none;
  // the districts without a site are named in one note line.
  const perDistrict = countBy(features, (f) => f.properties.district || str('statsDistrictUnknown'));
  const withSite = new Set(perDistrict.map(([name]) => name));
  const noSite = districtNames().filter((name) => !withSite.has(name));
  const vm = Object.entries(VM_LABEL[state.lang])
    .map(([key, label]) => [label, features.filter((f) => f.properties.verkehrsmittel?.[key] === true).length])
    .sort((a, b) => b[1] - a[1]);
  const rd = restdauerBands(features, now);
  const rdNote = [
    rd.open ? str('statsRestOpen', { n: rd.open }) : '',
    rd.expired ? str('statsRestExpired', { n: rd.expired }) : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const top = longest(features, 3);

  box.innerHTML = `
    <p class="stats-scope">${escapeHtml(str('statsScope', { n: zahl(k.total) }))}</p>
    ${kpis}
    ${section(str('filterAmpelLabel'), stack)}
    <section class="stats-section stats-history" id="stats-history"></section>
    ${section(str('statsArt'), barsHtml(art))}
    ${section(str('statsVerursacher'), barsHtml(wer))}
    ${section(
      str('statsDistricts'),
      barsHtml(perDistrict) +
        (noSite.length ? `<p class="stats-note">${escapeHtml(str('statsDistrictsNone', { names: noSite.join(', ') }))}</p>` : '')
    )}
    ${section(str('statsBetroffen'), barsHtml(vm), str('statsBetroffenNote'))}
    ${section(
      str('statsRestdauer'),
      barsHtml(rd.bands.map((b, i, all) => [bandLabel(b.upTo, i, all), b.count])) +
        (rdNote ? `<p class="stats-note">${escapeHtml(rdNote)}</p>` : '')
    )}
    ${section(
      str('statsLongest'),
      `<ol class="stats-longest">${top
        .map(
          ({ feature: f, days }) => `<li>
            <span class="stats-longest-dur">${escapeHtml(dauerText(days))}</span>
            <span class="stats-longest-title">${escapeHtml(f.properties.titel)}</span>
            <span class="stats-longest-meta">${escapeHtml(formatRange(f.properties.von, f.properties.bis, state.lang))} · ${escapeHtml(f.properties.art || '')}</span>
          </li>`
        )
        .join('')}</ol>` + (ohneDaten ? `<p class="stats-note">${escapeHtml(str('statsNoDates', { n: ohneDaten }))}</p>` : '')
    )}
  `;
  // A-16: the history takes the slot A-15/E2 reserved after the Sperrgrad
  // split. It keeps its own data and state across these re-renders.
  renderHistory(el('stats-history'));
  gezeichnet = true;
}

/** First opening of the tab (E9). */
export function showStats() {
  render();
}

/** New data or a new language: redraw, but only once the tab has been drawn. */
export function refreshStats() {
  if (gezeichnet) render();
}
