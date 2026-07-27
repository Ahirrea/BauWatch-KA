// Test script for the DE/EN language switch (requirement A-5).
// Run: node scripts/test-i18n.mjs (exit 0 = ok, 1 = failure)
//
// Pure Node, no network, no browser. Covers:
//   1. DE/EN key parity in src/lib/i18n.js — a key on one side missing on
//      the other silently ships an empty string in one language.
//   2. restdauer()/formatRange() produce a non-empty, language-appropriate
//      string for both languages across the same reference cases the
//      existing format tests use.
//   3. Every data-i18n="…" key referenced in index.html exists in the
//      dictionary (static scan, same spirit as the SHELL-import check in
//      scripts/test-pwa.mjs).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRINGS, AMPEL_LABEL, VM_LABEL, LANGS } from '../src/lib/i18n.js';
import { restdauer, formatRange } from '../src/lib/format.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0;
function check(name, cond, detail) {
  console.log(`[${cond ? 'PASS' : 'FAIL'}] ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}

// --- 1. DE/EN key parity ----------------------------------------------------

function checkParity(label, dict) {
  const [a, b] = LANGS;
  const keysA = new Set(Object.keys(dict[a]));
  const keysB = new Set(Object.keys(dict[b]));
  const onlyA = [...keysA].filter((k) => !keysB.has(k));
  const onlyB = [...keysB].filter((k) => !keysA.has(k));
  check(`${label}: same keys in ${a} and ${b}`, onlyA.length === 0 && onlyB.length === 0, [...onlyA, ...onlyB].join(', '));
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(dict[lang])) {
      check(`${label}.${lang}.${key} is non-empty`, typeof value === 'string' ? value.length > 0 : true);
    }
  }
}

checkParity('STRINGS', STRINGS);
checkParity('AMPEL_LABEL', AMPEL_LABEL);
checkParity('VM_LABEL', VM_LABEL);

// --- 2. format.js phrase table, both languages ------------------------------

const now = new Date(2026, 6, 27); // 27 July 2026, mirrors the format-test reference date convention
const RESTDAUER_CASES = [
  ['open-ended', null],
  ['expired', new Date(2026, 6, 20)],
  ['ends today', now],
  ['1 day left', new Date(2026, 6, 28)],
  ['N days left', new Date(2026, 6, 30)],
];

for (const [label, bis] of RESTDAUER_CASES) {
  for (const lang of LANGS) {
    const { text } = restdauer(bis, now, lang);
    check(`restdauer(${label}, ${lang}) is non-empty`, typeof text === 'string' && text.length > 0, text);
  }
}

for (const lang of LANGS) {
  check(
    `formatRange(open-ended, ${lang}) is non-empty`,
    formatRange(null, null, lang).length > 0
  );
  check(
    `formatRange(from-only, ${lang}) is non-empty`,
    formatRange(new Date(2026, 6, 1), null, lang).length > 0
  );
  check(
    `formatRange(until-only, ${lang}) is non-empty`,
    formatRange(null, new Date(2026, 6, 30), lang).length > 0
  );
  check(
    `formatRange(both, ${lang}) is non-empty`,
    formatRange(new Date(2026, 6, 1), new Date(2026, 6, 30), lang).length > 0
  );
}

// restdauer/formatRange must not silently produce the SAME text in both
// languages for the non-neutral cases — that would mean the lang param is
// being ignored.
for (const [label, bis] of RESTDAUER_CASES) {
  const [de, en] = LANGS.map((lang) => restdauer(bis, now, lang).text);
  check(`restdauer(${label}) differs between de/en`, de !== en, `both: "${de}"`);
}
{
  const [de, en] = LANGS.map((lang) => formatRange(new Date(2026, 6, 1), null, lang));
  check('formatRange(from-only) differs between de/en', de !== en, `both: "${de}"`);
}

// --- 3. Every data-i18n key in index.html exists in the dictionary --------

const index = readFileSync(join(ROOT, 'index.html'), 'utf8');

const dataI18nKeys = [...index.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
check('index.html has data-i18n keys (guard is active)', dataI18nKeys.length > 0);
for (const key of dataI18nKeys) {
  check(`data-i18n="${key}" exists in STRINGS.de/en`, key in STRINGS.de && key in STRINGS.en);
}

const dataI18nAttrKeys = [...index.matchAll(/data-i18n-attr="([^"]+)"/g)]
  .flatMap((m) => m[1].split(','))
  .map((spec) => spec.split(':')[1]);
check('index.html has data-i18n-attr keys (guard is active)', dataI18nAttrKeys.length > 0);
for (const key of dataI18nAttrKeys) {
  check(`data-i18n-attr key "${key}" exists in STRINGS.de/en`, key in STRINGS.de && key in STRINGS.en);
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll i18n tests passed.');
