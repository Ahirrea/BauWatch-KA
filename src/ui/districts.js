// districts.js — the district filter and the boundaries it draws (A-17).
//
// The boundaries are a committed static input (data/districts.geojson,
// ADR-007), precached with the shell: they change only with a commit that
// bumps CACHE_SHELL anyway. The page loads them once; they supply the
// select's full list of names (an option with 0 sites stays — A-12) and the
// outline of a chosen district. Which district a site is in, the build has
// already decided (`properties.district`); nothing here assigns.

import { state } from './state.js';
import { el } from './dom.js';
import { str } from './text.js';
import { districtCounts } from './filters.js';

const DISTRICTS_URL = 'data/districts.geojson';

/** The district names, sorted for German (A-17: dataset spelling). */
export function districtNames() {
  return (state.districts?.features ?? [])
    .map((f) => f.properties?.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'de'));
}

/** The boundary feature of a district, for the outline; null if unknown. */
export function districtFeature(name) {
  return state.districts?.features.find((f) => f.properties?.name === name) ?? null;
}

/** Loads the boundaries once; a failure leaves the select at "Alle Stadtteile". */
export async function loadDistricts() {
  try {
    const res = await fetch(DISTRICTS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fc = await res.json();
    state.districts = Array.isArray(fc?.features) ? fc : null;
  } catch (err) {
    console.error(err);
    state.districts = null;
  }
}

/**
 * Rebuilds the select's options: "Alle Stadtteile", then every district with
 * its count (A-17/E4) — numbers only once data is there (A-12), and a 0 stays
 * a choosable option. Called from render(), so the numbers follow every other
 * filter.
 */
export function renderDistrictOptions() {
  const select = el('filter-district');
  if (!select) return;
  const counts = districtCounts();
  const label = (name) => (counts ? `${name} (${counts.get(name) ?? 0})` : name);
  const options = [new Option(str('filterDistrictAll'), 'alle')];
  for (const name of districtNames()) options.push(new Option(label(name), name));
  // A district that is chosen but missing from the list (boundaries not
  // loaded) still shows, so the select never contradicts the filter.
  if (state.filters.district !== 'alle' && !options.some((o) => o.value === state.filters.district)) {
    options.push(new Option(label(state.filters.district), state.filters.district));
  }
  select.replaceChildren(...options);
  select.value = state.filters.district;
}

/** Wires the select; `onChange(name|'alle')` runs after the state is set. */
export function wireDistrictFilter(onChange) {
  const select = el('filter-district');
  select?.addEventListener('change', () => {
    state.filters.district = select.value;
    onChange(select.value);
  });
}
