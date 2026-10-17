// text.js — UI strings and the language switch (A-5), split out in A-14/E11.
//
// Every string the JavaScript puts on the page goes through str(): one place
// that knows the current language, and one call shape (`str('key')`) that
// scripts/test-i18n.mjs can check against the dictionary. Before A-14 the
// lookups were spread as `STRINGS[state.lang].key` / `s.key`, and a typo in a
// key showed up only as "undefined" on the page.

import { DEFAULT_LANG, STRINGS, t } from '../lib/i18n.js';
import { state } from './state.js';

// Language preference (A-5). localStorage key: 'bauwatch.sprache'.
const SPRACHE_KEY = 'bauwatch.sprache';

// Word-based date/time (unlike format.js's numeric dd.mm.yyyy, A-5/E5) — the
// locale follows the UI language so month names don't stay German in an
// English UI.
export const STAND_LOCALE = { de: 'de-DE', en: 'en-GB' };

/** The current language's string for `key`, with `{name}` placeholders filled. */
export function str(key, params) {
  return t(STRINGS[state.lang][key], params);
}

// Read failures (private mode, disabled storage) fall back to the German
// default and never throw — a storage failure must not break the switch.
export function liesGespeicherteSprache() {
  try {
    const wert = localStorage.getItem(SPRACHE_KEY);
    return wert === 'de' || wert === 'en' ? wert : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function schreibeGespeicherteSprache(lang) {
  try {
    localStorage.setItem(SPRACHE_KEY, lang);
  } catch {
    // Quota/disabled storage: the switch itself still works, just not
    // persisted for the next visit (same pattern as sw.js's ablegen()).
  }
}

// Swaps every data-i18n/data-i18n-attr static text node and document.lang;
// dynamic content (markers/list/popups/stats/status) goes through the normal
// render() pipeline afterwards — same "flip a control, call render()" flow
// the filters already use, no new state model.
export function applyI18n(lang) {
  const dict = STRINGS[lang];
  document.querySelectorAll('[data-i18n]').forEach((elm) => {
    elm.textContent = dict[elm.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((elm) => {
    for (const spec of elm.dataset.i18nAttr.split(',')) {
      const [attr, key] = spec.split(':');
      elm.setAttribute(attr, dict[key]);
    }
  });
  document.documentElement.lang = lang;
}

function syncLanguageButtons(lang) {
  document.querySelectorAll('[data-lang-toggle] button').forEach((b) => {
    const active = b.dataset.lang === lang;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', String(active));
  });
}

/** Wires the DE/EN buttons; `onChange` re-renders whatever depends on the language. */
export function wireLanguageToggle(onChange) {
  const group = document.querySelector('[data-lang-toggle]');
  if (!group) return;
  syncLanguageButtons(state.lang);
  applyI18n(state.lang);
  group.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === state.lang) return;
      state.lang = lang;
      syncLanguageButtons(lang);
      applyI18n(lang);
      schreibeGespeicherteSprache(lang);
      onChange();
    });
  });
}
