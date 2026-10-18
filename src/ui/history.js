// history.js — the "Verlauf" section of the statistics tab (A-16).
//
// Two small line charts: all open sites, and the full closures among them,
// each with its own y-range (A-16/E2). On one shared axis the full closures
// (41–56) would hug the bottom of a scale up to 200; a second y-scale on the
// same plot would be a dual axis, which invents correlations. One series per
// chart, in --bar like every other non-Sperrgrad chart (A-15/E3) — no
// traffic-light red for "Voll".
//
// Text first (A-16/E5): today's value, the change against 30 days ago and the
// extremes are printed. A readout line gives any single day — by pointer,
// finger or arrow keys — and the table holds every day, so no value depends
// on hovering. The y-axis fits the data and does not start at 0 (E6): a zero
// baseline would flatten 155–199 into a line, and the ticks make the scale
// explicit. For the same reason there is no area fill.
//
// Data: data/history.json, fetched on the tab's first opening (E7) and served
// network-first by the service worker (ADR-006).

import { berlinDate, changeOver, fillHistory, historyExtremes } from '../lib/stats.js';
import { state } from './state.js';
import { escapeHtml } from './dom.js';
import { str } from './text.js';

const HISTORY_URL = 'data/history.json';
const LOCALE = { de: 'de-DE', en: 'en-GB' };
const CHANGE_DAYS = 30;
const KEYS = ['total', 'voll'];
// Chart geometry in CSS pixels; the SVG is drawn at the section's width.
const H = 124;
const PAD = { left: 34, right: 42, top: 10, bottom: 22 };

let data = null; // null = not loaded · 'error' · { entries, offline }
let loading = null; // the pending fetch, so the tab never fetches twice at once
let container = null; // the section element of the last render
let index = null; // the day chosen in the readout; null = today
let observer = null;
let lastWidth = 0;
let current = null; // { rows, scales } of the last paint, for the readout

const zahl = (n) => n.toLocaleString(LOCALE[state.lang]);
const signed = (n) => (n > 0 ? `+${zahl(n)}` : n < 0 ? `−${zahl(-n)}` : '±0');
// Noon UTC, formatted in UTC: the calendar day stays the same in every client
// time zone.
const asDate = (d) => new Date(`${d}T12:00:00Z`);
const dayText = (d) =>
  asDate(d).toLocaleDateString(LOCALE[state.lang], { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const monthText = (d) => asDate(d).toLocaleDateString(LOCALE[state.lang], { month: 'short', timeZone: 'UTC' });
const titleText = (key) => (key === 'total' ? str('statsHistoryTotal') : str('statsHistoryVoll'));

/** Clean y-ticks around [min, max]: 3–5 round numbers, the data inside. */
function niceScale(min, max) {
  const raw = Math.max(1, max - min) / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  const lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if (hi === lo) hi = lo + step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}

function chartSvg(rows, key, width, scales) {
  const pw = Math.max(40, width - PAD.left - PAD.right);
  const ph = H - PAD.top - PAD.bottom;
  const values = rows.map((r) => r[key]);
  const { lo, hi, ticks } = niceScale(Math.min(...values), Math.max(...values));
  const x = (i) => PAD.left + (rows.length > 1 ? (i / (rows.length - 1)) * pw : pw);
  const y = (v) => PAD.top + ph - ((v - lo) / (hi - lo)) * ph;
  scales[key] = { x, y, pw };

  const grid = ticks
    .map(
      (v) => `<line class="hist-grid" x1="${PAD.left}" x2="${PAD.left + pw}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>
        <text class="hist-tick" x="${PAD.left - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${zahl(v)}</text>`
    )
    .join('');
  // Month starts on the x-axis; the first, partial month only when its label
  // has room before the next one.
  const starts = rows.map((r, i) => (r.date.endsWith('-01') ? i : -1)).filter((i) => i >= 0);
  if (rows.length && !rows[0].date.endsWith('-01') && (starts.length === 0 || x(starts[0]) - x(0) >= 34)) starts.unshift(0);
  const months = starts
    .map(
      (i) => `<line class="hist-grid" x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${PAD.top + ph}" y2="${PAD.top + ph + 4}"/>
        <text class="hist-tick" x="${x(i).toFixed(1)}" y="${H - 5}">${escapeHtml(monthText(rows[i].date))}</text>`
    )
    .join('');
  const path = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join('');
  const last = rows.length - 1;
  const ext = historyExtremes(rows, key);
  const aria = str('statsHistoryChartAria', {
    title: titleText(key),
    first: zahl(rows[0][key]),
    firstDate: dayText(rows[0].date),
    last: zahl(rows[last][key]),
    lastDate: dayText(rows[last].date),
    max: zahl(ext.max.value),
    min: zahl(ext.min.value),
  });
  return `<svg class="hist-svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" role="img" aria-label="${escapeHtml(aria)}">
      ${grid}${months}
      <path class="hist-line" d="${path}"/>
      <circle class="hist-dot" cx="${x(last).toFixed(1)}" cy="${y(rows[last][key]).toFixed(1)}" r="4"/>
      <text class="hist-end" x="${(x(last) + 8).toFixed(1)}" y="${(y(rows[last][key]) + 4).toFixed(1)}">${zahl(rows[last][key])}</text>
      <g class="hist-cursor" hidden>
        <line x1="0" x2="0" y1="${PAD.top}" y2="${PAD.top + ph}"/>
        <circle r="4" cx="0" cy="0"/>
      </g>
    </svg>`;
}

function figureHtml(rows, key, width, scales) {
  const now = rows.at(-1)[key];
  const change = changeOver(rows, key, CHANGE_DAYS);
  const ext = historyExtremes(rows, key);
  return `<figure class="hist-chart" data-key="${key}">
      <figcaption class="hist-head">
        <span class="hist-title">${escapeHtml(titleText(key))}</span>
        <strong class="hist-now">${zahl(now)}</strong>
        <span class="hist-delta">${escapeHtml(str('statsHistoryDelta', { delta: signed(change.delta), days: change.days }))}</span>
      </figcaption>
      ${chartSvg(rows, key, width, scales)}
      <p class="hist-extremes">${escapeHtml(
        str('statsHistoryExtremes', {
          max: zahl(ext.max.value),
          maxDate: dayText(ext.max.date),
          min: zahl(ext.min.value),
          minDate: dayText(ext.min.date),
        })
      )}</p>
    </figure>`;
}

function tableHtml(rows) {
  const body = rows
    .slice()
    .reverse()
    .map((r) => `<tr><th scope="row">${escapeHtml(dayText(r.date))}</th><td>${zahl(r.total)}</td><td>${zahl(r.voll)}</td></tr>`)
    .join('');
  return `<details class="hist-table">
      <summary>${escapeHtml(str('statsHistoryTable'))}</summary>
      <table>
        <thead><tr><th scope="col">${escapeHtml(str('statsHistoryColDate'))}</th><th scope="col">${escapeHtml(str('statsHistoryColTotal'))}</th><th scope="col">${escapeHtml(str('statsHistoryColVoll'))}</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </details>`;
}

// Moves the readout to day i (null = today) — the cursor on both charts and
// the text line below them. No re-render.
function select(i) {
  if (!current || !container?.isConnected) return;
  const { rows, scales } = current;
  const last = rows.length - 1;
  index = i === null || i === undefined ? null : Math.max(0, Math.min(last, i));
  const at = index ?? last;
  for (const key of KEYS) {
    const cursor = container.querySelector(`.hist-chart[data-key="${key}"] .hist-cursor`);
    if (!cursor) continue;
    // An SVG element has no `hidden` property; the attribute is what CSS sees.
    cursor.toggleAttribute('hidden', index === null || index === last);
    const { x, y } = scales[key];
    const line = cursor.querySelector('line');
    line.setAttribute('x1', x(at).toFixed(1));
    line.setAttribute('x2', x(at).toFixed(1));
    const dot = cursor.querySelector('circle');
    dot.setAttribute('cx', x(at).toFixed(1));
    dot.setAttribute('cy', y(rows[at][key]).toFixed(1));
  }
  const row = rows[at];
  const date = at === last ? `${str('statsHistoryToday')}, ${dayText(row.date)}` : dayText(row.date);
  const readout = container.querySelector('.hist-readout');
  if (readout) readout.textContent = str('statsHistoryReadout', { date, total: zahl(row.total), voll: zahl(row.voll) });
}

function wire(section) {
  const group = section.querySelector('.hist-charts');
  const fromPointer = (svg, e) => {
    const { rows, scales } = current;
    const { pw } = scales.total;
    const left = svg.getBoundingClientRect().left;
    return Math.round(((e.clientX - left - PAD.left) / pw) * (rows.length - 1));
  };
  for (const svg of section.querySelectorAll('.hist-svg')) {
    svg.addEventListener('pointerdown', (e) => select(fromPointer(svg, e)));
    svg.addEventListener('pointermove', (e) => {
      // A mouse reads on hover; a finger only while it touches (pointerdown
      // starts it), and its choice stays after lifting so it can be read.
      if (e.pointerType === 'mouse' || e.buttons) select(fromPointer(svg, e));
    });
    svg.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') select(null);
    });
  }
  group?.addEventListener('keydown', (e) => {
    const last = current.rows.length - 1;
    const at = index ?? last;
    const step = { ArrowLeft: -1, ArrowRight: 1, PageUp: -7, PageDown: 7 }[e.key];
    if (step !== undefined) select(at + step);
    else if (e.key === 'Home') select(0);
    else if (e.key === 'End' || e.key === 'Escape') select(null);
    else return;
    e.preventDefault();
  });
}

function paint() {
  const section = container;
  if (!section?.isConnected) return;
  const head = `<h3>${escapeHtml(str('statsHistory'))}</h3>`;
  if (data === null) {
    section.innerHTML = `${head}<p class="stats-note">${escapeHtml(str('statsHistoryLoading'))}</p>`;
    return;
  }
  if (data === 'error') {
    section.innerHTML = `${head}<p class="stats-note">${escapeHtml(str('statsHistoryError'))}</p>`;
    return;
  }
  const rows = fillHistory(data.entries, berlinDate(new Date()));
  if (rows.length < 2) {
    section.innerHTML = `${head}<p class="stats-note">${escapeHtml(str('statsHistoryTooShort'))}</p>`;
    return;
  }
  const width = Math.floor(section.clientWidth);
  if (!width) return; // the tab is hidden; the ResizeObserver paints once it shows
  lastWidth = width;
  const scales = {};
  const offline = data.offline ? ` ${str('statsHistoryOffline')}` : '';
  section.innerHTML = `${head}
    <p class="stats-note">${escapeHtml(str('statsHistoryNote', { from: dayText(rows[0].date) }) + offline)}</p>
    <div class="hist-charts" tabindex="0" role="group" aria-label="${escapeHtml(str('statsHistoryChartsAria'))}">
      ${KEYS.map((key) => figureHtml(rows, key, width, scales)).join('')}
      <p class="hist-readout"></p>
    </div>
    <p class="stats-note hist-hint">${escapeHtml(str('statsHistoryHint'))}</p>
    ${tableHtml(rows)}`;
  current = { rows, scales };
  wire(section);
  select(index);
}

async function load() {
  try {
    const res = await fetch(HISTORY_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const entries = await res.json();
    data = { entries: Array.isArray(entries) ? entries : [], offline: res.headers.get('X-Bauwatch-Cache') === 'hit' };
  } catch {
    data = 'error';
  } finally {
    loading = null;
  }
  paint();
}

/**
 * Draws the section into `section` (called by the statistics tab on every
 * render). The first call fetches the history; a failed fetch is retried on
 * the tab's next render.
 */
export function renderHistory(section) {
  container = section;
  if (!section) return;
  observer?.disconnect();
  observer = new ResizeObserver(() => {
    const width = Math.floor(section.clientWidth);
    if (width && Math.abs(width - lastWidth) > 1) paint();
  });
  observer.observe(section);
  if (data === null || data === 'error') {
    if (data === 'error') data = null;
    paint();
    loading ??= load();
    return;
  }
  paint();
}
