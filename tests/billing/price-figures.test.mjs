/**
 * Muse final retest (build 2265871, Nov 22): one step note said the regular price was
 * $24.99/mo while the report said $19.99/mo. Source of truth: PLANS in
 * src/lib/pricing/plans.ts (each amount must equal its Stripe Price's unit_amount).
 * Guard: every "$N.99" monthly figure written anywhere in src/ or public/ (app copy,
 * comments, Harbor blog posts) must be a PLANS amount, so a stray figure can't ship.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const { PLANS, formatAmount } = await import('../../src/lib/pricing/plans.ts');

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TEXT = /\.(ts|tsx|mjs|js|json|html|md|txt|xml)$/;
const ALLOWED = new Set(Object.values(PLANS).map(p => formatAmount(p.cents)));

/** All "$N.99" figures in a text, with line numbers. */
export function ninetyNineFigures(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/\$(\d+\.99)\b/g)) out.push({ figure: `$${m[1]}`, line: i + 1 });
  });
  return out;
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (TEXT.test(name)) files.push(p);
  }
  return files;
}

test('every $N.99 figure in src/ and public/ is a PLANS amount ($9.99 founding / $19.99 regular)', () => {
  assert.deepEqual([...ALLOWED].filter(a => a.endsWith('.99')).sort(), ['$19.99', '$9.99']);
  const bad = [];
  let seen = 0;
  for (const f of [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'public'))]) {
    for (const hit of ninetyNineFigures(readFileSync(f, 'utf8'))) {
      seen++;
      if (!ALLOWED.has(hit.figure)) bad.push(`${relative(ROOT, f)}:${hit.line} ${hit.figure}`);
    }
  }
  assert.ok(seen > 0, 'scanner found no price figures at all: the scan is broken');
  assert.deepEqual(bad, [], `price figures that disagree with PLANS:\n${bad.join('\n')}`);
});

test('falsifier: the scanner flags a planted $24.99 and passes the real figures', () => {
  const sample = 'Founding $9.99/mo\nthen $24.99/mo\nregular $19.99/mo';
  const hits = ninetyNineFigures(sample);
  assert.deepEqual(hits.map(h => h.figure), ['$9.99', '$24.99', '$19.99']);
  assert.deepEqual(hits.filter(h => !ALLOWED.has(h.figure)), [{ figure: '$24.99', line: 2 }]);
});
