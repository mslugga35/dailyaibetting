#!/usr/bin/env node
/**
 * `npm test` entry point. Runs each offline suite in its own node --test process
 * (allow-listed env, network blocked by register.mjs) and fails the run when:
 *
 *   1. any test fails or is cancelled, or a file crashes;
 *   2. any test is SKIPPED (skips hide coverage);
 *   3. a `todo` test PASSES. Todo tests encode the target behaviour of an OPEN
 *      audited defect; one passing means the defect was fixed (promote the test:
 *      remove `todo`, delete its PINNED twin) or the test went vacuous;
 *   4. a file's test count differs from tests/harness/expected-counts.json, or a
 *      test file is not in the manifest. A file that exits early, or a test that
 *      silently stops being collected, therefore cannot read green.
 *
 *   node tests/harness/run.mjs                    run everything
 *   node tests/harness/run.mjs --write-manifest   record current counts (review the diff!)
 *   node tests/harness/run.mjs --suite=<name>     offline | billing | webhook-resilience | access | metrics
 *
 * Self-test hooks (honoured ONLY when HARNESS_SELFTEST=1; used by tests/harness-selftest.test.mjs):
 *   HARNESS_RUN_FILES  = files to run (path-delimiter separated), instead of discovery
 *   HARNESS_MANIFEST   = alternative manifest path
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, delimiter, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allowListedEnv } from './env-policy.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const SELFTEST = process.env.HARNESS_SELFTEST === '1';
const MANIFEST = (SELFTEST && process.env.HARNESS_MANIFEST) || join(ROOT, 'tests', 'harness', 'expected-counts.json');
const SUITES = {
  offline: ['tests/harness-selftest.test.mjs'],
  billing: ['tests/billing/checkout.test.mjs', 'tests/billing/entitlement.test.mjs', 'tests/billing/stripe-webhook.test.mjs'],
  'webhook-resilience': ['tests/billing/stripe-webhook.test.mjs'],
  access: ['tests/security/api-access.test.mjs', 'tests/security/cron-auth.test.mjs'],
  metrics: ['tests/data/metrics.test.mjs', 'tests/data/grading.test.mjs'],
};
const suiteArg = (process.argv.find((a) => a.startsWith('--suite=')) || '').slice('--suite='.length) || null;
if (suiteArg && !SUITES[suiteArg]) { console.error(`unknown suite "${suiteArg}"; choose ${Object.keys(SUITES).join(', ')}`); process.exit(2); }
const WRITE = process.argv.includes('--write-manifest');
if (WRITE && suiteArg) { console.error('--write-manifest needs a full run (no --suite)'); process.exit(2); }

const norm = (p) => relative(ROOT, isAbsolute(p) ? p : join(ROOT, p)).replace(/\\/g, '/');

function collect(dir, pred, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'harness') collect(p, pred, out); }
    else if (pred(name)) out.push(norm(p));
  }
  return out;
}

const files = SELFTEST && process.env.HARNESS_RUN_FILES
  ? process.env.HARNESS_RUN_FILES.split(delimiter).filter(Boolean).map(norm)
  : suiteArg ? SUITES[suiteArg] : [
    ...collect(join(ROOT, 'tests'), (n) => n.endsWith('.test.mjs')),
    ...collect(join(ROOT, 'src'), (n) => /\.test\.(ts|mts|mjs)$/.test(n)),
  ].sort();

const manifest = !WRITE && existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const num = (out, k) => Number((out.match(new RegExp(`^# ${k} (\\d+)`, 'm')) || [])[1] ?? NaN);

const totals = { tests: 0, pass: 0, fail: 0, todo: 0, skipped: 0, cancelled: 0 };
const problems = [];
const counts = {};

for (const file of files) {
  const r = spawnSync(process.execPath, [
    '--test', '--experimental-strip-types', '--no-warnings',
    '--import', './tests/harness/register.mjs', '--test-reporter=tap', file,
  ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: allowListedEnv(process.env) });
  const out = (r.stdout || '') + (r.stderr || '');
  process.stdout.write(`\n════ ${file}\n${out}`);

  const t = Object.fromEntries(Object.keys(totals).map((k) => [k, num(out, k)]));
  for (const k of Object.keys(totals)) totals[k] += Number.isFinite(t[k]) ? t[k] : 0;
  counts[file] = t.tests;

  if (!Number.isFinite(t.tests)) problems.push(`${file}: no TAP summary (crashed?)`);
  if (r.status !== 0) problems.push(`${file}: exit ${r.status}${t.fail ? ` (${t.fail} failing)` : ''}`);
  if (t.cancelled > 0) problems.push(`${file}: ${t.cancelled} cancelled`);
  if (t.skipped > 0) problems.push(`${file}: ${t.skipped} skipped — skips are not allowed`);
  // A file-level entry ("ok 1 - tests\\x.test.mjs") with no subtests means the file never registered tests.
  if (/^ok \d+ - .*\.test\.(mjs|ts)\s*$/m.test(out) && t.tests <= 1) problems.push(`${file}: registered no tests`);
  for (const l of out.split(/\r?\n/)) {
    if (/^\s*ok \d+ - .* # TODO/.test(l)) problems.push(`${file}: todo now PASSES — promote it (remove todo) or fix the test: ${l.trim()}`);
  }
  if (!WRITE) {
    if (!(file in manifest)) problems.push(`${file}: not in ${norm(MANIFEST)} (run --write-manifest and review)`);
    else if (manifest[file] !== t.tests) problems.push(`${file}: expected ${manifest[file]} tests, ran ${t.tests}`);
  }
}
if (!WRITE) {
  if (!suiteArg && !(SELFTEST && process.env.HARNESS_RUN_FILES)) {
    for (const f of Object.keys(manifest)) if (!files.includes(f)) problems.push(`${f}: in manifest but missing`);
  }
}
if (WRITE) {
  writeFileSync(MANIFEST, `${JSON.stringify(counts, null, 2)}\n`);
  console.log(`\nwrote ${norm(MANIFEST)}`);
}

console.log(`\n── harness summary${suiteArg ? ` (suite ${suiteArg})` : ''} ─────────────────────────────`);
console.log(`files ${files.length} | tests ${totals.tests} | pass ${totals.pass} | fail ${totals.fail} | open-defect todo ${totals.todo} | skipped ${totals.skipped} | cancelled ${totals.cancelled}`);
for (const p of problems) console.log(`✖ ${p}`);
const ok = problems.length === 0 && files.length > 0;
const partial = suiteArg || (SELFTEST && process.env.HARNESS_RUN_FILES);
console.log(ok ? (partial ? '✔ harness GREEN (PARTIAL RUN — not a release gate; use `npm test`)' : '✔ harness GREEN') : '✖ harness RED');
process.exit(ok ? 0 : 1);
