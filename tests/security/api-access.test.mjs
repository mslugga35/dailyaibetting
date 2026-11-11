/**
 * Server-side Pro authorization and unauthorized API access.
 * `todo: 'OPEN …'` = target behaviour of an audited defect.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setup, harness, req, body, quietly, cookieUser, seedSubscription } from '../harness/helpers.mjs';

const consensusRoute = await import('../../src/app/api/consensus/route.ts');
const picksRoute = await import('../../src/app/api/picks/route.ts');
/** Removing /api/consensus-sql is an accepted S2 fix, so it is imported lazily. */
async function consensusSqlRoute() {
  try { return await import('../../src/app/api/consensus-sql/route.ts'); }
  catch (e) { if (e?.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find|not resolve/.test(String(e?.message))) return null; throw e; }
}
const { getTodayET, getYesterdayET } = await import('../../src/lib/utils/date.ts');

const TEAMS = ['Lakers', 'Celtics', 'Knicks', 'Bulls', 'Heat', 'Warriors', 'Nets', 'Suns', 'Bucks', 'Nuggets'];
const CAPPERS = ['Alpha', 'Bravo', 'Charlie'];

/** 10 NBA moneyline consensus picks, each backed by 3 cappers (more than the free tier's 5). */
function seedTodaysPicks(day = getTodayET()) {
  const created = `${day}T15:00:00Z`;
  const rows = [];
  for (const team of TEAMS) {
    for (const c of CAPPERS) {
      rows.push({ sport: 'NBA', team, opponent: null, pick_type: 'moneyline', line: null, odds: -110, units: 1, source: 'discord', posted_at: created, created_at: created, matched_game_id: null, capper: { name: c } });
    }
  }
  harness().db.seed('hb_picks', rows);
  // Today's schedule (hb_games), so the ESPN/Odds filter keeps these teams.
  const games = [
    ['Los Angeles Lakers', 'Boston Celtics'], ['New York Knicks', 'Chicago Bulls'], ['Miami Heat', 'Golden State Warriors'],
    ['Brooklyn Nets', 'Phoenix Suns'], ['Milwaukee Bucks', 'Denver Nuggets'],
  ];
  harness().db.seed('hb_games', games.map(([home_team, away_team]) => ({ sport: 'basketball_nba', home_team, away_team, commence_time: `${day}T23:30:00Z` })));
}

const get = (mod, path, opts) => quietly(() => mod.GET(req(path, opts)));

beforeEach(() => { setup(); });

// ---------------------------------------------------------------- /api/consensus tiering

test('/api/consensus: anonymous visitor gets at most the free-tier slice (5)', async () => {
  seedTodaysPicks();
  const res = await get(consensusRoute, '/api/consensus');
  assert.equal(res.status, 200);
  const b = await body(res);
  assert.equal(b.consensusCount, 10, 'fixture must produce 10 consensus picks (guards against a vacuous pass)');
  assert.equal(b.consensus.length, 5, `anonymous got ${b.consensus.length}`);
});

test('/api/consensus: an active Pro subscriber gets the full list (server-side gate)', async () => {
  seedTodaysPicks();
  cookieUser('u_pro_c');
  seedSubscription({ userId: 'u_pro_c', status: 'active' });
  const b = await body(await get(consensusRoute, '/api/consensus'));
  assert.equal(b.consensus.length, 10, `pro got ${b.consensus.length}`);
});

test('/api/consensus: a canceled subscriber is served the free tier', async () => {
  seedTodaysPicks();
  cookieUser('u_cx');
  seedSubscription({ userId: 'u_cx', status: 'canceled' });
  const b = await body(await get(consensusRoute, '/api/consensus'));
  assert.equal(b.consensusCount, 10);
  assert.equal(b.consensus.length, 5);
});

test('/api/consensus: a wrong Bearer CRON_SECRET does not unlock the full (internal) list', async () => {
  seedTodaysPicks();
  const b = await body(await get(consensusRoute, '/api/consensus', { headers: { Authorization: 'Bearer guess' } }));
  assert.equal(b.consensusCount, 10);
  assert.equal(b.consensus.length, 5);
});

test('/api/consensus: the correct internal CRON_SECRET bearer does unlock the full list (grade-and-persist path)', async () => {
  seedTodaysPicks();
  const b = await body(await get(consensusRoute, '/api/consensus', { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }));
  assert.equal(b.consensus.length, 10);
});

test('B1: a paying subscriber must not be served the free tier because Supabase timed out on the entitlement read',
  { todo: 'OPEN B1 — P0-BILL-1 (explicit "cannot verify" response, not a silent downgrade)' }, async () => {
    seedTodaysPicks();
    cookieUser('u_pay_out');
    seedSubscription({ userId: 'u_pay_out', status: 'active' });
    harness().db.fail({ table: 'user_subscriptions', op: 'select' });
    const res = await get(consensusRoute, '/api/consensus');
    const b = await body(res);
    // Serving the full list is NOT an acceptable fix: that is fail-open for everyone.
    assert.ok(res.status >= 500 || b.entitlement === 'unknown', `HTTP ${res.status}, served ${b.consensus?.length} picks, entitlement=${b.entitlement}`);
  });

test('outage must never fail OPEN: anonymous and non-paying users get at most the free slice while Supabase entitlement reads fail', async () => {
  seedTodaysPicks();
  harness().db.fail({ table: 'user_subscriptions', op: 'select' });
  const anon = await body(await get(consensusRoute, '/api/consensus'));
  assert.ok(!(anon.consensus?.length > 5), `anonymous got ${anon.consensus?.length}`);
  cookieUser('u_np_out');
  seedSubscription({ userId: 'u_np_out', status: 'canceled' });
  const np = await body(await get(consensusRoute, '/api/consensus'));
  assert.ok(!(np.consensus?.length > 5), `non-paying got ${np.consensus?.length}`);
});

test('S6: the tier-dependent ?date=yesterday response must not be publicly cacheable',
  { todo: 'OPEN S6 — P0-SEC-1 Cache-Control: private on tiered responses (route.ts:250)' }, async () => {
    seedTodaysPicks(getYesterdayET());
    cookieUser('u_cache');
    seedSubscription({ userId: 'u_cache', status: 'active' });
    const res = await get(consensusRoute, '/api/consensus?date=yesterday');
    assert.equal(res.status, 200);
    const cc = res.headers.get('cache-control') || '';
    assert.doesNotMatch(cc, /public/, `Cache-Control: ${cc}`);
  });

test("today's /api/consensus response is not cacheable (no-store)", async () => {
  seedTodaysPicks();
  const res = await get(consensusRoute, '/api/consensus');
  assert.match(res.headers.get('cache-control') || '', /no-store/);
});

test('S3b: ?date=yesterday must truncate bySport for the free tier like consensus/topOverall',
  { todo: 'OPEN S3b (new, found by this harness) — P0-SEC-1 free tier gets the full yesterday bySport list' }, async () => {
    seedTodaysPicks(getYesterdayET());
    const b = await body(await get(consensusRoute, '/api/consensus?date=yesterday'));
    assert.equal(b.consensusCount, 10, 'fixture must produce 10 consensus picks');
    assert.ok(b.consensus.length <= 5);
    assert.ok(b.bySport && Object.keys(b.bySport).length > 0, 'bySport must still be returned (truncated), not removed');
    const perSport = Object.values(b.bySport).map((a) => a.length);
    assert.ok(perSport.every((n) => n <= 5), `anonymous bySport sizes: ${perSport.join(',')}`);
  });

// ---------------------------------------------------------------- individual picks

test('S1: /api/picks (every capper\'s individual picks — a Pro feature) must reject anonymous callers',
  { todo: 'OPEN S1 — P0-SEC-1 auth + Pro check on /api/picks' }, async () => {
    seedTodaysPicks();
    const res = await get(picksRoute, '/api/picks');
    assert.ok([401, 403].includes(res.status), `anonymous got HTTP ${res.status}`);
  });

test('PINNED current behaviour (delete when S1 is fixed): today /api/picks returns individual capper picks to an anonymous caller', async () => {
  seedTodaysPicks();
  const res = await get(picksRoute, '/api/picks');
  assert.equal(res.status, 200);
  const text = JSON.stringify(await body(res));
  assert.match(text, /Alpha|Bravo|Charlie/, 'capper names present in the anonymous response');
});

// ---------------------------------------------------------------- consensus-sql

test('S2: /api/consensus-sql must not run with the service-role key on an anonymous request',
  { todo: 'OPEN S2 — P0-SEC-1 remove the route or use the anon key + auth' }, async () => {
    harness().db.rpcHandlers.set('get_betting_consensus', () => []);
    const mod = await consensusSqlRoute();
    if (!mod) return; // route removed: S2 fixed
    await get(mod, '/api/consensus-sql');
    const rpc = harness().db.log.find((l) => l.op === 'rpc');
    assert.ok(!rpc || rpc.key !== 'service', 'RPC executed with the service-role key');
  });

test('S2: /api/consensus-sql must not echo raw database error text to the caller',
  { todo: 'OPEN S2 — P0-SEC-1 generic error body' }, async () => {
    harness().db.fail({ op: 'rpc', error: { message: 'permission denied for function get_betting_consensus; schema internal_x', code: '42501' } });
    const mod = await consensusSqlRoute();
    if (!mod) return;
    const res = await get(mod, '/api/consensus-sql');
    assert.doesNotMatch(JSON.stringify(await body(res)), /permission denied|internal_x/);
  });

test('S2: /api/consensus-sql must validate the date parameter',
  { todo: 'OPEN S2 — P0-SEC-1 YYYY-MM-DD validation' }, async () => {
    harness().db.rpcHandlers.set('get_betting_consensus', () => []);
    const mod = await consensusSqlRoute();
    if (!mod) return;
    const res = await get(mod, `/api/consensus-sql?date=${encodeURIComponent("2026-01-01'; select 1;--")}`);
    assert.equal(res.status, 400);
  });

// ---------------------------------------------------------------- admin secret in the bundle

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(n)) out.push(p);
  }
  return out;
}

/**
 * Every NEXT_PUBLIC_* value is inlined into the browser bundle. Only names on this
 * list are known to be public by design; anything else must be reviewed and added
 * here deliberately (renaming a secret to dodge a keyword check does not pass).
 */
const PUBLIC_BY_DESIGN = new Set([
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_BASE_URL', 'NEXT_PUBLIC_GA_ID', 'NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED',
]);
const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

test('S4: only reviewed, public-by-design NEXT_PUBLIC_* names are used (no admin password in the bundle)',
  { todo: 'OPEN S4 — P0-SEC-2 server-side admin auth; ROTATE the exposed value first' }, () => {
    const names = new Set();
    for (const f of walk(SRC_DIR)) for (const m of readFileSync(f, 'utf8').matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) names.add(m[0]);
    assert.ok(names.has('NEXT_PUBLIC_SUPABASE_URL'), 'scan found the source tree');
    assert.deepEqual([...names].filter((n) => !PUBLIC_BY_DESIGN.has(n)), []);
  });
