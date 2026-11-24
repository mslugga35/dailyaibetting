/**
 * The harness's own guarantees. If any of these fail, no other result is trustworthy.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import http from 'node:http';
import * as httpNs from 'node:http';
import { request as namedHttpsRequest } from 'node:https';
import net from 'node:net';
import { connect as namedTlsConnect } from 'node:tls';
import dns from 'node:dns';
import { spawnSync } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname, delimiter, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { setup, harness } from './harness/helpers.mjs';

beforeEach(() => { setup(); });

test('fetch to any real host is blocked and logged', async () => {
  await assert.rejects(fetch('https://api.stripe.com/v1/customers'), /network blocked/);
  await assert.rejects(fetch('https://aeeyk.supabase.co/rest/v1/user_subscriptions'), /network blocked/);
  assert.equal(harness().fetches.length, 2);
  assert.ok(harness().fetches.every((f) => f.allowed === false));
});

test('node http/https are blocked too', () => {
  assert.throws(() => https.request('https://api.stripe.com/'), /network blocked/);
  assert.throws(() => http.get('http://example.com/'), /network blocked/);
});

test('the Stripe module the app imports is the fake, and its real HTTP client is disabled', async () => {
  const mod = await import('../src/lib/stripe.ts');
  assert.equal(mod.stripe, (await import('./harness/fakes/stripe.mjs')).stripe);
  await mod.stripe.customers.create({ email: 'x@example.test' });
  assert.equal(harness().stripe.customers.length, 1);
});

test('the Supabase client the app imports is the in-memory fake', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  assert.equal(c.kind, 'service');
  assert.deepEqual(await c.from('anything').select('*'), { data: [], error: null, count: null, status: 200 });
});

test('credentials are fake: no inherited value can reach a real service', () => {
  assert.match(process.env.STRIPE_SECRET_KEY, /^sk_test_harness/);
  assert.match(process.env.NEXT_PUBLIC_SUPABASE_URL, /\.invalid$/);
  for (const k of ['OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'DISCORD_WEBHOOK_URL', 'ODDS_API_KEY', 'NEXT_PUBLIC_ADMIN_PASSWORD']) {
    assert.equal(process.env[k], undefined, `${k} leaked into the test env`);
  }
});

test('fake DB fidelity: .single() on zero rows errors (PGRST116), zero-row UPDATE succeeds silently, CHECK is enforced', async () => {
  const db = harness().db;
  const one = await db.from('user_subscriptions').select('*').eq('user_id', 'nobody').single();
  assert.equal(one.error.code, 'PGRST116');
  const upd = await db.from('user_subscriptions').update({ status: 'canceled' }).eq('stripe_subscription_id', 'sub_none');
  assert.equal(upd.error, null);
  const bad = await db.from('user_subscriptions').upsert({ user_id: 'u', status: 'incomplete' }, { onConflict: 'user_id' });
  assert.equal(bad.error.code, '23514');
  assert.equal(db.dump('user_subscriptions').length, 0, 'failed write leaves no row');
});

test('fake DB fidelity: .abortSignal() records the signal; an aborted call rejects with AbortError; a hung call settles only on abort', async () => {
  const db = harness().db;
  db.seed('user_subscriptions', [{ user_id: 'u_sig', status: 'active' }]);
  // Normal call with a live signal: answers, signal recorded, not aborted.
  const live = new AbortController();
  const ok = await db.from('user_subscriptions').select('*').eq('user_id', 'u_sig').abortSignal(live.signal).single();
  assert.equal(ok.data.status, 'active');
  assert.equal(db.abortSignals.at(-1), live.signal);
  // Already-aborted signal: rejects with AbortError.
  const pre = new AbortController(); pre.abort();
  await assert.rejects(Promise.resolve(db.from('user_subscriptions').select('*').abortSignal(pre.signal)), (e) => e.name === 'AbortError');
  // Hung call: no answer until aborted, then AbortError.
  db.hang({ table: 'user_subscriptions', op: 'select', times: 1 });
  const ctl = new AbortController();
  let settled = false;
  const p = db.from('user_subscriptions').select('*').abortSignal(ctl.signal).then(() => { settled = true; }, (e) => { settled = true; throw e; });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(settled, false, 'a hung call must not answer on its own');
  ctl.abort();
  await assert.rejects(p, (e) => e.name === 'AbortError');
  // times: 1 — the next call answers normally; restore() clears hangs.
  assert.equal((await db.from('user_subscriptions').select('*').eq('user_id', 'u_sig')).data.length, 1);
  db.hang({}); db.restore();
  assert.equal((await db.from('user_subscriptions').select('*').eq('user_id', 'u_sig')).data.length, 1);
});

test('fake DB fidelity: unpaginated select is capped at 1000 rows; range() pages past it', async () => {
  const db = harness().db;
  db.seed('t', Array.from({ length: 1500 }, (_, i) => ({ n: i })));
  assert.equal((await db.from('t').select('*')).data.length, 1000);
  assert.equal((await db.from('t').select('*').range(1000, 1499)).data.length, 500);
  assert.equal((await db.from('t').select('*', { count: 'exact', head: true })).count, 1500);
});

test('named ESM imports and namespace imports of http/https/tls are blocked too', () => {
  assert.throws(() => namedHttpsRequest('https://192.0.2.1/'), /network blocked/);
  assert.throws(() => httpNs.request('http://192.0.2.1/'), /network blocked/);
  assert.throws(() => namedTlsConnect({ host: '192.0.2.1', port: 443 }), /network blocked/);
});

test('raw sockets, DNS and WebSocket are blocked', async () => {
  assert.throws(() => net.connect({ host: '192.0.2.1', port: 80 }), /network blocked/);
  assert.throws(() => new net.Socket().connect(80, '192.0.2.1'), /network blocked/);
  assert.throws(() => dns.lookup('example.com', () => {}), /network blocked/);
  await assert.rejects(dns.promises.lookup('example.com'), /network blocked/);
  if (typeof WebSocket === 'function') assert.throws(() => new WebSocket('wss://192.0.2.1/'), /network blocked/);
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const childEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));

test('env allow-list: a credential with an unexpected name never reaches a test process', () => {
  const env = { ...childEnv(), GOOGLE_SHEET_ID: 'real-looking-sheet', VERCEL_TOKEN: 'v', npm_config__authToken: 'npm', MY_THING_CRED: 'x' };
  const r = spawnSync(process.execPath, ['--import', './tests/harness/register.mjs', '-e',
    "console.log(JSON.stringify(['GOOGLE_SHEET_ID','VERCEL_TOKEN','npm_config__authToken','MY_THING_CRED'].map(k => process.env[k] ?? null)))"],
  { cwd: ROOT, env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout.trim().split(/\r?\n/).pop()), [null, null, null, null]);
});

// ---------------------------------------------------------------- the REAL runner, against fixtures

function runRunner(fixtures, manifest) {
  const dir = mkdtempSync(join(tmpdir(), 'harness-run-'));
  try {
    const files = Object.keys(fixtures).map((name) => { const f = join(dir, name); writeFileSync(f, fixtures[name]); return f; });
    // Manifest keys are repo-root-relative with forward slashes, exactly as run.mjs normalises them.
    const key = (name) => relative(ROOT, join(dir, name)).split('\\').join('/');
    const man = join(dir, 'manifest.json');
    writeFileSync(man, JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([n, c]) => [key(n), c]))));
    const r = spawnSync(process.execPath, ['tests/harness/run.mjs'], {
      cwd: ROOT, encoding: 'utf8',
      env: { ...childEnv(), HARNESS_SELFTEST: '1', HARNESS_RUN_FILES: files.join(delimiter), HARNESS_MANIFEST: man },
    });
    return { status: r.status, out: r.stdout + r.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const OK_FILE = "import {test} from 'node:test'; test('a', () => {}); test('b', () => {});\n";

test('runner positive control: a clean file with a matching manifest count is GREEN', () => {
  const r = runRunner({ 'good.test.mjs': OK_FILE }, { 'good.test.mjs': 2 });
  assert.equal(r.status, 0, r.out.slice(-600));
  assert.match(r.out, /harness GREEN/);
});

test('runner: a todo test that starts passing turns the run RED', () => {
  const r = runRunner({ 'p.test.mjs': "import {test} from 'node:test'; test('fixed already', {todo:'OPEN X'}, () => {});\n" }, { 'p.test.mjs': 1 });
  assert.equal(r.status, 1);
  assert.match(r.out, /todo now PASSES/);
});

test('runner: a skipped test turns the run RED', () => {
  const r = runRunner({ 's.test.mjs': "import {test} from 'node:test'; test('real', () => {}); test('hidden', {skip:true}, () => {});\n" }, { 's.test.mjs': 2 });
  assert.equal(r.status, 1);
  assert.match(r.out, /skipped/);
});

test('runner: a file that exits before registering tests turns the run RED', () => {
  const r = runRunner({ 'e.test.mjs': 'process.exit(0);\n' }, { 'e.test.mjs': 1 });
  assert.equal(r.status, 1);
  assert.match(r.out, /registered no tests/);
});

test('runner: a test count that differs from the manifest turns the run RED', () => {
  const r = runRunner({ 'c.test.mjs': OK_FILE }, { 'c.test.mjs': 3 });
  assert.equal(r.status, 1);
  assert.match(r.out, /expected 3 tests, ran 2/);
});

test('fake DB fidelity: select list is projected; unknown columns error 42703; NULLs sort like Postgres', async () => {
  const db = harness().db;
  db.seed('consensus_results', [{ result: 'WIN', pick_date: '2026-01-01' }, { result: 'LOSS', pick_date: null }, { result: 'WIN', pick_date: '2026-02-01' }]);
  const proj = await db.from('consensus_results').select('result');
  assert.deepEqual(Object.keys(proj.data[0]), ['result']);
  const bad = await db.from('consensus_results').select('nonexistent_col');
  assert.equal(bad.error.code, '42703');
  const badFilter = await db.from('consensus_results').select('*').eq('nope', 1);
  assert.equal(badFilter.error.code, '42703');
  const desc = await db.from('consensus_results').select('pick_date').order('pick_date', { ascending: false });
  assert.deepEqual(desc.data.map((r) => r.pick_date), [null, '2026-02-01', '2026-01-01']);
  const asc = await db.from('consensus_results').select('pick_date').order('pick_date', { ascending: true });
  assert.deepEqual(asc.data.map((r) => r.pick_date), ['2026-01-01', '2026-02-01', null]);
});

test('worker threads (which would escape the patches) are refused; process.binding is refused', () => {
  assert.throws(() => process.binding('tcp_wrap'), /network blocked/);
  assert.throws(() => new Worker("require('node:net').connect({ host: '192.0.2.1', port: 80 })", { eval: true }), /network blocked/);
});

test('fake DB supports .or / .ilike / .match like PostgREST', async () => {
  const db = harness().db;
  db.seed('consensus_results', [{ result: 'WIN', sport: 'NBA' }, { result: 'LOSS', sport: 'nfl' }, { result: 'PUSH', sport: 'NBA' }]);
  assert.equal((await db.from('consensus_results').select('result').or('result.eq.WIN,result.eq.LOSS')).data.length, 2);
  assert.equal((await db.from('consensus_results').select('result').ilike('sport', 'NF%')).data.length, 1);
  assert.equal((await db.from('consensus_results').select('result').match({ sport: 'NBA', result: 'PUSH' })).data.length, 1);
  assert.equal((await db.from('consensus_results').select('result').or('nope.eq.1')).error.code, '42703');
});

test('v4: dns Resolver classes, every resolve* and inspector/cluster/dlopen are refused', async () => {
  const dnsMod = await import('node:dns');
  assert.throws(() => new dnsMod.Resolver(), /network blocked/);
  assert.throws(() => new dnsMod.promises.Resolver(), /network blocked/);
  assert.throws(() => dnsMod.resolveTxt('example.invalid', () => {}), /network blocked/);
  await assert.rejects(dnsMod.promises.resolveMx('example.invalid'), /network blocked/);
  assert.throws(() => process._linkedBinding('x'), /network blocked/);
  assert.throws(() => process.dlopen({}, 'x'), /network blocked/);
  assert.throws(() => (require_('node:cluster')).fork(), /network blocked/);
  assert.throws(() => (require_('node:inspector')).open(0), /network blocked/);
});

import { createRequire as createRequire_ } from 'node:module';
const require_ = createRequire_(import.meta.url);

test('v4: child_process only starts guarded node children', async () => {
  const cp = require_('node:child_process');
  assert.throws(() => cp.execSync('echo hi'), /network blocked/);
  assert.throws(() => cp.exec('echo hi'), /network blocked/);
  assert.throws(() => cp.fork('tests/harness/state.mjs'), /network blocked/);
  assert.throws(() => cp.spawnSync('git', ['--version']), /network blocked/);
  assert.throws(() => cp.spawnSync(process.execPath, ['-e', '1']), /network blocked/);
  // a guarded child is allowed, and is itself guarded
  const r = cp.spawnSync(process.execPath, ['--import', './tests/harness/register.mjs', '-e',
    "try { require('node:child_process').execSync('echo hi'); console.log('ESCAPED') } catch (e) { console.log('CHILD-BLOCKED') }"],
    { cwd: process.cwd(), encoding: 'utf8', env: childEnv() });
  assert.match(r.stdout, /CHILD-BLOCKED/);
});

test('v4: fetch routes match on a URL boundary, not a raw string prefix', async () => {
  harness().fetchRoutes.set('https://api.example.test', async () => new Response('ok'));
  assert.equal(await (await fetch('https://api.example.test/v1')).text(), 'ok');
  await assert.rejects(fetch('https://api.example.test.evil.invalid/v1'), /network blocked/);
});

test('v4: LIKE wildcards behave like Postgres (% matches zero chars, _ one char)', async () => {
  const db = harness().db;
  db.seed('consensus_results', [{ sport: 'nba' }, { sport: 'nfl' }, { sport: 'a_b' }, { sport: 'axb' }, { sport: null }]);
  const n = async (q) => (await q).data.length;
  const t = () => db.from('consensus_results').select('sport');
  assert.equal(await n(t().ilike('sport', 'nba%')), 1);
  assert.equal(await n(t().ilike('sport', '%nba')), 1);
  assert.equal(await n(t().ilike('sport', 'NBA')), 1);
  assert.equal(await n(t().like('sport', 'n_a')), 1);
  assert.equal(await n(t().like('sport', 'a_b')), 2);
  assert.equal(await n(t().like('sport', 'n.a')), 0);
  assert.equal(await n(t().not('sport', 'ilike', 'nba%')), 3); // NULL row excluded, as in SQL
});

test('v4: .or() is strict: unknown/malformed/empty throw; not.<op>, and(), text casts work', async () => {
  const db = harness().db;
  db.seed('consensus_results', [{ result: 'WIN', capper_count: 5 }, { result: 'LOSS', capper_count: 2 }, { result: null, capper_count: null }]);
  const t = () => db.from('consensus_results').select('result');
  assert.throws(() => t().or('result.bogus.x'), /unsupported filter bogus/);
  assert.throws(() => t().or('result.cs.{WIN}'), /unsupported filter cs/);
  assert.throws(() => t().or(''), /empty logic expression/);
  assert.throws(() => t().or('result'), /malformed term/);
  assert.throws(() => t().or('and(result.eq.WIN'), /unbalanced/);
  assert.throws(() => t().contains('x', []), /unsupported filter contains/);
  assert.equal((await t().or('result.not.eq.WIN')).data.length, 1); // LOSS only; NULL is UNKNOWN
  assert.equal((await t().or('and(result.eq.WIN,capper_count.gt.4),result.eq.LOSS')).data.length, 2);
  assert.equal((await t().or('and(result.eq.WIN,capper_count.gt.9)')).data.length, 0);
  assert.equal((await t().or('capper_count.eq.5')).data.length, 1); // text '5' cast to the numeric column
  assert.equal((await t().or('result.is.null')).data.length, 1);
  assert.equal((await t().or('result.in.(WIN,LOSS)')).data.length, 2);
  assert.equal((await t().filter('result', 'not.eq', 'WIN')).data.length, 1);
});

test('v4: SQL NULL semantics: eq/neq/match with NULL never match a NULL row', async () => {
  const db = harness().db;
  db.seed('consensus_results', [{ result: 'WIN' }, { result: null }]);
  const t = () => db.from('consensus_results').select('result');
  assert.equal((await t().eq('result', null)).data.length, 0);
  assert.equal((await t().match({ result: null })).data.length, 0);
  assert.equal((await t().neq('result', 'WIN')).data.length, 0);
  assert.equal((await t().not('result', 'eq', 'WIN')).data.length, 0);
  assert.equal((await t().is('result', null)).data.length, 1);
  assert.equal((await t().not('result', 'is', null)).data.length, 1);
});

test('v4: runner --suite labels a PARTIAL run, rejects unknown suites and --write-manifest with --suite', () => {
  const man = join(process.cwd(), 'tests', 'harness', 'expected-counts.json');
  const before = readFileSync(man, 'utf8');
  const run = (args, extra = {}) => {
    const r = spawnSync(process.execPath, ['tests/harness/run.mjs', ...args], { cwd: process.cwd(), encoding: 'utf8', env: { ...childEnv(), ...extra } });
    return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
  };
  const bad = run(['--suite=nope']);
  assert.equal(bad.status, 2);
  assert.match(bad.out, /unknown suite/);
  const w = run(['--write-manifest', '--suite=metrics']);
  assert.equal(w.status, 2);
  assert.equal(readFileSync(man, 'utf8'), before, 'manifest must be untouched');
  // HARNESS_MANIFEST is ignored without HARNESS_SELFTEST=1: the real manifest is used, so this stays GREEN.
  const m = run(['--suite=metrics'], { HARNESS_MANIFEST: join(process.cwd(), 'does-not-exist.json') });
  assert.equal(m.status, 0, m.out.slice(-800));
  assert.match(m.out, /files 2 \|/);
  assert.match(m.out, /PARTIAL RUN — not a release gate/);
});

test('v5: guarded-child shapes are exact: preload flags, foreign register files, NODE_OPTIONS and shell are refused', () => {
  const cp = require_('node:child_process');
  const R = './tests/harness/register.mjs';
  const refuse = (args, opts) => assert.throws(() => cp.spawnSync(process.execPath, args, opts), /network blocked/, JSON.stringify(args));
  refuse(['--import=data:text/javascript,console.log("UNGUARDED")', 'tests/harness/run.mjs', '--suite=nope']);
  refuse(['tests/harness/run.mjs', '--import=data:text/javascript,1']);
  refuse(['tests/harness/run.mjs', '-e', '1']);
  refuse(['--import', R, '--import', 'data:text/javascript,1', '-e', '1']);
  refuse(['--import', R, '--require=x', '-e', '1']);
  refuse(['--import', R, '-r', 'x', '-e', '1']);
  refuse(['--import', R, '--experimental-loader=x', '-e', '1']);
  refuse(['--import', join(tmpdir(), 'tests', 'harness', 'register.mjs'), '-e', '1']); // planted look-alike
  refuse(['--import', R, '-e', '1'], { env: { ...childEnv(), NODE_OPTIONS: '--import=data:text/javascript,1' } });
  refuse(['--import', R, '-e', '1'], { shell: true });
  refuse(['-e', '1', '--import', R]);
  // allow-list, not deny-list: any other node flag is refused, including --env-file
  // (whose file could set NODE_OPTIONS=--import=<unguarded code>)
  const envFile = join(mkdtempSync(join(tmpdir(), 'harness-envfile-')), 'evil.env');
  writeFileSync(envFile, 'NODE_OPTIONS=--import=data:text/javascript,console.log("UNGUARDED")\n');
  refuse(['--import', R, `--env-file=${envFile}`, '-e', '1']);
  refuse(['--import', R, '--env-file', envFile, '-e', '1']);
  refuse(['--import', R, '--env-file-if-exists=x', '-e', '1']);
  refuse(['--import', R, '--watch', 'x.mjs']);
  refuse(['--import', R, '-C', 'x', '-e', '1']);
  refuse(['--import', R, '-e', '1', 'extra']);
  refuse(['--import', R]);
  refuse(['--import', R, '--experimental_loader=data:text/javascript,1', '-e', '1']); // underscore spelling
  refuse(['--import', 'tests/harness/register.mjs', '-e', '1']); // bare specifier: node resolves it as a package
  // the raw ChildProcess class and process.execve
  assert.throws(() => new cp.ChildProcess().spawn({ file: process.execPath, args: [process.execPath, '-e', '1'], stdio: 'ignore' }), /network blocked/);
  assert.throws(() => new cp.ChildProcess().spawn({ file: 'git', args: ['git', '--version'], stdio: 'ignore' }), /network blocked/);
  if (typeof process.execve === 'function') assert.throws(() => process.execve(process.execPath, [process.execPath]), /network blocked/);
  // the exact shapes still work
  const ok = cp.spawnSync(process.execPath, ['--import', R, '-e', 'console.log("GUARDED")'], { cwd: process.cwd(), encoding: 'utf8', env: childEnv() });
  assert.match(ok.stdout, /GUARDED/);
  const bad = cp.spawnSync(process.execPath, ['tests/harness/run.mjs', '--suite=nope'], { cwd: process.cwd(), encoding: 'utf8', env: childEnv() });
  assert.equal(bad.status, 2);
});
