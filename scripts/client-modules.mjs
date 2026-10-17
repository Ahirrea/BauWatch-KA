// client-modules.mjs — the browser's module graph, for the static tests.
//
// Several guards used to read src/app.js and nothing else. Once the client is
// split into modules (A-14/E11), a check that reads one file passes silently
// the moment the code it looks for moves next door — the attribution guard
// would stop seeing a write into #attribution, the PWA guard a module missing
// from SHELL. ADR-005: the guards keep their invariants and lose their layout
// assumptions. This helper follows the static imports from the entry module, so
// every test sees the same, complete set of files.
//
// Pure Node, no network. Not a test itself — imported by the test scripts.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ENTRY = 'src/app.js';

// Comments are stripped before scanning, so a comment that mentions an import
// doesn't add a phantom module. Naive on purpose: a `//` inside a string would
// cut the rest of that line, which can only ever drop text, never an import.
export const withoutComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

// Static `import … from`, bare `import '…'`, `export … from`, and dynamic
// `import('…')` — relative specifiers only (the client has no bare imports).
const IMPORT_RE =
  /(?:^|[;\s])(?:import|export)\s+(?:[^'"`;]*?\s+from\s+)?['"](\.\.?\/[^'"]+)['"]|\bimport\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;

/**
 * Every module reachable from the entry, in discovery order.
 * @returns {{ modules: {path: string, source: string}[], missing: string[] }}
 *   `path` is repo-relative with forward slashes (e.g. 'src/ui/map.js');
 *   `missing` lists specifiers that resolve to no file.
 */
export function clientModules(entry = ENTRY) {
  const seen = new Map();
  const missing = [];
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    const abs = join(ROOT, file);
    if (!existsSync(abs)) {
      missing.push(file);
      continue;
    }
    const source = readFileSync(abs, 'utf8');
    seen.set(file, source);
    for (const m of withoutComments(source).matchAll(IMPORT_RE)) {
      const spec = m[1] || m[2];
      queue.push(posix.normalize(posix.join(posix.dirname(file), spec)));
    }
  }
  return { modules: [...seen].map(([path, source]) => ({ path, source })), missing };
}

/**
 * The body of `function name(…) { … }` (also `async function`), found in any
 * of the given modules, by brace matching — not by slicing up to a section
 * comment, which yields an empty string (and a silently passing check) once
 * the comment moves.
 * @returns {{ path: string, body: string } | null}
 */
export function functionBody(modules, name) {
  const head = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  for (const { path, source } of modules) {
    const m = head.exec(source);
    if (!m) continue;
    const open = source.indexOf('{', m.index + m[0].length);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}' && --depth === 0) return { path, body: source.slice(open + 1, i) };
    }
  }
  return null;
}
