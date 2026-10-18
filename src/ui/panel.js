// panel.js — the panel that floats over the full-screen map (A-14): a bottom
// sheet with three heights on a phone, a collapsible side panel on desktop,
// and the tabs inside it.
//
// The sheet's heights live in src/shell.css; this module only switches
// data-sheet, measures what the CSS needs (--sheet-collapsed,
// --searchbar-bottom) and tells the map which part of it the chrome covers, so
// a popup's autoPan keeps clear of it (A-14/E9). Nothing here is stored
// (E10): every visit starts collapsed, on the Liste tab, panel open.

import { el } from './dom.js';
import { str } from './text.js';

const DESKTOP = window.matchMedia('(min-width: 900px)');
// Below 500 px of height (landscape phones) "half" would leave neither a
// usable map nor a usable list — two states only (E2).
const SHORT = window.matchMedia('(max-height: 499px)');
const HALF = 0.56; // keep in step with `.panel[data-sheet="half"]` in shell.css
const DRAG_THRESHOLD = 6; // px before a press on the head counts as a drag

let sheet = 'collapsed';
let handlers = { onChromeChange: () => {}, onTabChange: () => {} };
let justDragged = false;

export const isDesktop = () => DESKTOP.matches;
export const sheetState = () => sheet;

function sheetStates() {
  return SHORT.matches ? ['collapsed', 'full'] : ['collapsed', 'half', 'full'];
}

/** The state one step up from collapsed — "half", or "full" on short screens. */
function openState() {
  return sheetStates()[1];
}

function cssPx(name) {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
}

// Collapsed = exactly the head. On a phone the search bar inside the head is
// position:fixed and takes no room in it, so the head's own box is the answer.
function measure() {
  const root = document.documentElement.style;
  root.setProperty('--sheet-collapsed', `${Math.ceil(el('panel-head').getBoundingClientRect().height)}px`);
  root.setProperty('--searchbar-bottom', `${Math.ceil(el('searchbar').getBoundingClientRect().bottom)}px`);
}

/**
 * The part of the viewport the chrome covers, in px from each edge — for the
 * popup's autoPan padding and for centring views in the uncovered map (E9,
 * E13). `target` lets a caller ask for a sheet state it has just requested:
 * the height transition takes 220 ms, the popup opens now.
 */
export function chromeInsets(target = sheet) {
  const credits = el('map-credits').getBoundingClientRect();
  if (isDesktop()) {
    const collapsed = document.body.classList.contains('panel-collapsed');
    const left = collapsed ? 12 : el('panel').getBoundingClientRect().right + 12;
    // Bottom: the credits strip. The zoom control (top right) covers only a
    // corner, not a strip — leaving it out keeps views centred between panel
    // and edge.
    return { top: 12, left, right: 12, bottom: credits.height + 12 };
  }
  const H = window.innerHeight;
  const top = el('searchbar').getBoundingClientRect().bottom + 8;
  const collapsedH = cssPx('--sheet-collapsed');
  // A full sheet leaves no map to centre in. Measured, top + bottom came to
  // the viewport plus 24 px: a district fit hit zoom 15 at the wrong place,
  // and a search landed under the search bar. Views therefore aim at the
  // half sheet, where the map shows once the sheet is lowered (#43).
  const heights = { collapsed: collapsedH, half: H * HALF, full: H * HALF };
  // Collapsed, the credits ride on top of the sheet; open, the sheet covers
  // them. +24: below the popup's tip sits the marker itself, which must stay
  // visible too — without it the tip pointed at a marker hidden under the
  // credits (measured in the A-14 prototype).
  const bottom = (target === 'collapsed' ? collapsedH + credits.height : heights[target]) + 24;
  return { top, left: 10, right: 10, bottom };
}

// The handle's name says what the NEXT press does (E2).
function handleLabel() {
  const states = sheetStates();
  const next = states[(states.indexOf(sheet) + 1) % states.length];
  if (next === 'collapsed') return str('sheetCollapse');
  return sheet === 'collapsed' ? str('sheetExpand') : str('sheetExpandFull');
}

/** Re-applies the handle's accessible name (it changes with state and language). */
export function syncHandleLabel() {
  el('sheet-handle').setAttribute('aria-label', handleLabel());
}

export function setSheet(next) {
  if (isDesktop()) return;
  if (!sheetStates().includes(next)) next = openState();
  sheet = next;
  el('panel').dataset.sheet = next;
  el('sheet-handle').setAttribute('aria-expanded', String(next !== 'collapsed'));
  syncHandleLabel();
  // Report the target geometry now (a popup may open in the same tick) and
  // the real one once the transition has settled.
  handlers.onChromeChange(chromeInsets(next));
}

function cycleSheet() {
  const states = sheetStates();
  setSheet(states[(states.indexOf(sheet) + 1) % states.length]);
}

// --- Dragging the sheet (phones) ---------------------------------------------
// A drag on the head resizes the sheet live and snaps to the nearest state on
// release. It is never the only way (WCAG 2.5.7): the handle is a button.
//
// Moves and the release are heard on `window`, not on the head: a mouse that
// leaves the head before the drag threshold is crossed would otherwise go
// silent (touch pointers are captured implicitly, mice are not). Pointer
// capture is no way out — it retargets the click that follows a plain tap
// away from the handle, and the tap-to-cycle would stop working.
function wireDrag() {
  const panel = el('panel');
  const head = el('panel-head');
  let drag = null;

  const onMove = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = drag.y - e.clientY;
    if (!drag.moved) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      panel.classList.add('is-dragging');
    }
    const min = cssPx('--sheet-collapsed');
    const max = window.innerHeight - (el('searchbar').getBoundingClientRect().bottom + 8);
    panel.style.height = `${Math.max(min, Math.min(max, drag.h + dy))}px`;
  };

  const onEnd = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onEnd);
    window.removeEventListener('pointercancel', onEnd);
    if (!moved) return; // a tap: the handle's own click does the rest
    justDragged = true; // a click that still lands on the handle must not cycle again
    setTimeout(() => (justDragged = false), 0);
    const h = panel.getBoundingClientRect().height;
    panel.classList.remove('is-dragging');
    panel.style.height = '';
    const H = window.innerHeight;
    const target = {
      collapsed: cssPx('--sheet-collapsed'),
      half: H * HALF,
      full: H - (el('searchbar').getBoundingClientRect().bottom + 8),
    };
    const nearest = sheetStates().reduce((a, b) => (Math.abs(target[b] - h) < Math.abs(target[a] - h) ? b : a));
    setSheet(nearest);
  };

  // Belt and braces for the selection trap above (user-select in shell.css):
  // nothing in the head may start a native drag-and-drop.
  head.addEventListener('dragstart', (e) => {
    if (!isDesktop()) e.preventDefault();
  });

  head.addEventListener('pointerdown', (e) => {
    if (isDesktop() || e.button !== 0) return;
    // Controls keep their own taps; the search bar only lives in the head's DOM.
    if (e.target.closest('.searchbar, [role="tab"], a, input, button:not(.sheet-handle)')) return;
    drag = { id: e.pointerId, y: e.clientY, h: panel.getBoundingClientRect().height, moved: false };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  });
}

// --- Tabs (E4): the WAI-ARIA tabs pattern ------------------------------------
function wireTabs() {
  const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
  const select = (tab, { focus = false } = {}) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      el(t.getAttribute('aria-controls')).hidden = !on;
    }
    if (focus) tab.focus();
    // A tab tapped on the collapsed sheet is a request to see it.
    if (!isDesktop() && sheet === 'collapsed') setSheet(openState());
    el('panel-body').scrollTop = 0;
    handlers.onTabChange(tab.id.replace(/^tab-/, ''));
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      select(tabs[(to + tabs.length) % tabs.length], { focus: true });
    });
  });
}

// --- Desktop: collapsible side panel (E14) ----------------------------------
function setPanelCollapsed(collapsed, { moveFocus = true } = {}) {
  document.body.classList.toggle('panel-collapsed', collapsed);
  el('panel').inert = collapsed;
  el('panel-open').hidden = !collapsed;
  if (moveFocus) (collapsed ? el('panel-open') : el('panel-collapse')).focus();
  handlers.onChromeChange(chromeInsets());
}

/**
 * Wires the panel. `onChromeChange(insets)` hears every change of what the
 * chrome covers; `onTabChange(name)` every tab switch ('liste', 'neu', …).
 */
export function initPanel({ onChromeChange, onTabChange }) {
  handlers = { onChromeChange, onTabChange };
  const panel = el('panel');

  measure();
  const observer = new ResizeObserver(() => {
    measure();
    handlers.onChromeChange(chromeInsets());
  });
  observer.observe(el('panel-head'));
  // On a phone the search bar is position: fixed, outside the head's box, so
  // its growth (a two-line "nicht gefunden") never resized the head and
  // --searchbar-bottom stayed stale: the zoom "+" and a full sheet's handle
  // sat under the bar (#47).
  observer.observe(el('searchbar'));
  window.addEventListener('resize', () => {
    measure();
    handlers.onChromeChange(chromeInsets());
  });
  panel.addEventListener('transitionend', (e) => {
    if (e.target === panel) handlers.onChromeChange(chromeInsets());
  });

  el('sheet-handle').addEventListener('click', () => {
    if (justDragged) return;
    cycleSheet();
  });
  // Keyboard focus must never sit in a part of the sheet that is off-screen
  // (WCAG 2.4.11): focus entering the body of a collapsed sheet opens it.
  el('panel-body').addEventListener('focusin', () => {
    if (!isDesktop() && sheet === 'collapsed') setSheet(openState());
  });
  wireDrag();
  wireTabs();

  el('panel-collapse').addEventListener('click', () => setPanelCollapsed(true));
  el('panel-open').addEventListener('click', () => setPanelCollapsed(false));

  // Crossing the breakpoint: a phone has no collapsed side panel, a desktop no
  // sheet height. Short screens drop "half".
  DESKTOP.addEventListener('change', () => {
    if (!isDesktop() && document.body.classList.contains('panel-collapsed')) {
      setPanelCollapsed(false, { moveFocus: false });
    }
    measure();
    setSheet(isDesktop() ? sheet : 'collapsed');
    handlers.onChromeChange(chromeInsets());
  });
  SHORT.addEventListener('change', () => {
    if (!sheetStates().includes(sheet)) setSheet(openState());
  });

  setSheet('collapsed');
  // setSheet() is a no-op on desktop — the map still needs the panel's
  // footprint before its first view (E13).
  handlers.onChromeChange(chromeInsets());
}
