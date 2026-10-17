// theme.js — the colour-scheme switch (A-8, ADR-004), split out in A-14/E11.
//
// Die Farben selbst liegen komplett in den Stylesheets: die Palette hängt an
// data-theme auf <html>, nicht an Werten aus dem JavaScript. Hier passiert
// deshalb nur dreierlei — Attribut setzen, Systemleiste nachziehen, Wahl
// merken. Kein render()-Aufruf: Karte, Liste und Popups holen ihre Farben über
// dieselben Tokens und schalten von selbst um.

import { state } from './state.js';

// Colour-scheme preference (A-8, ADR-004). localStorage key: 'bauwatch.theme'.
// 'system' is the default and stores nothing new about the visitor — it simply
// leaves the CSS media query in charge, exactly as before A-8.
const THEME_KEY = 'bauwatch.theme';
const THEMES = ['system', 'light', 'dark'];
const DEFAULT_THEME = 'system';

// Muss zu den <meta name="theme-color">-Angaben in index.html passen (und damit
// zu --accent hell / --bg dunkel in styles.css); scripts/test-theme.mjs
// vergleicht beide Seiten.
const THEME_COLOR = { light: '#1b4b73', dark: '#16181c' };

// Same shape as the language pair — a storage failure falls back to
// 'system', which is the pre-A-8 behaviour and therefore never a broken state.
export function liesGespeichertesFarbschema() {
  try {
    const wert = localStorage.getItem(THEME_KEY);
    return THEMES.includes(wert) ? wert : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function schreibeGespeichertesFarbschema(theme) {
  try {
    // 'system' bedeutet „keine Wahl" — dann wird der Schlüssel entfernt statt
    // ein drittes Wort hineingeschrieben. So bleibt auf dem Gerät genau dann
    // etwas liegen, wenn die Nutzerin tatsächlich etwas ausgewählt hat.
    if (theme === DEFAULT_THEME) localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Wie beim Sprachschalter: die Umschaltung wirkt, sie überdauert nur
    // keinen Seitenaufruf.
  }
}

// Ohne ausdrückliche Wahl bleibt das Attribut WEG, statt 'system'
// hineinzuschreiben: nur dann greift die Media Query in styles.css, und die
// Seite folgt der Systemvorgabe auch dann noch, wenn sie sich später ändert.
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) delete root.dataset.theme;
  else root.dataset.theme = theme;
  syncThemeColor(theme);
}

// Die beiden <meta name="theme-color"> in index.html sind über `media` an die
// Systemvorgabe gebunden — bei einer ausdrücklichen Wahl wäre die Systemleiste
// sonst hell, während die Seite dunkel ist. Bei 'system' bekommen sie ihre
// Media-Bindung zurück. Dass dann beide auf `all` stehen, ist unkritisch: sie
// tragen in dem Fall dieselbe Farbe, egal welche der Browser nimmt.
function syncThemeColor(theme) {
  document.querySelectorAll('meta[name="theme-color"][data-scheme]').forEach((meta) => {
    const scheme = meta.dataset.scheme;
    if (theme === DEFAULT_THEME) {
      meta.setAttribute('media', `(prefers-color-scheme: ${scheme})`);
      meta.setAttribute('content', THEME_COLOR[scheme]);
    } else {
      meta.setAttribute('media', 'all');
      meta.setAttribute('content', THEME_COLOR[theme]);
    }
  });
}

function syncThemeButtons(theme) {
  document.querySelectorAll('[data-theme-toggle] button').forEach((b) => {
    const active = b.dataset.themeValue === theme;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-pressed', String(active));
  });
}

export function wireThemeToggle() {
  applyTheme(state.theme);
  const group = document.querySelector('[data-theme-toggle]');
  if (!group) return;
  syncThemeButtons(state.theme);
  group.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.themeValue;
      if (theme === state.theme) return;
      state.theme = theme;
      syncThemeButtons(theme);
      applyTheme(theme);
      schreibeGespeichertesFarbschema(theme);
    });
  });

  // Wechselt die Systemvorgabe, während 'system' aktiv ist, schalten die
  // Farben per CSS von selbst um — nur die Systemleiste hängt an den beiden
  // Meta-Angaben und muss nachgezogen werden.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === DEFAULT_THEME) syncThemeColor(DEFAULT_THEME);
  });
}
