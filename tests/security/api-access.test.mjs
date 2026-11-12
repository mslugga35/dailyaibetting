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
  assert.equal(b.firePickCount, 10, 'the true fire-pick count (aggregate only) is reported even on the free tier');
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
  async () => {
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
  async () => {
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
  async () => {
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
  async () => {
    seedTodaysPicks();
    const res = await get(picksRoute, '/api/picks');
    assert.ok([401, 403].includes(res.status), `anonymous got HTTP ${res.status}`);
  });

// ---------------------------------------------------------------- consensus-sql

test('S2: /api/consensus-sql (service-role RPC, raw DB errors, unvalidated date) is removed and stays removed', async () => {
  assert.equal(await consensusSqlRoute(), null);
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
  () => {
    const names = new Set();
    for (const f of walk(SRC_DIR)) for (const m of readFileSync(f, 'utf8').matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) names.add(m[0]);
    assert.ok(names.has('NEXT_PUBLIC_SUPABASE_URL'), 'scan found the source tree');
    assert.deepEqual([...names].filter((n) => !PUBLIC_BY_DESIGN.has(n)), []);
  });

test('/api/consensus: the internal CRON_SECRET bearer also gets the FULL graded list for ?date=yesterday', async () => {
  seedTodaysPicks(getYesterdayET());
  const b = await body(await get(consensusRoute, '/api/consensus?date=yesterday', { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }));
  assert.equal(b.isYesterday, true);
  assert.equal(b.consensusCount, 10, 'fixture must produce 10 yesterday consensus picks');
  assert.equal(b.consensus.length, 10, `internal got ${b.consensus.length}`);
  for (const p of b.consensus) assert.ok('result' in p, 'every pick carries its result field');
});

test('B1: unknown entitlement is served at most the free slice, labelled unknown (never the full list)', async () => {
  seedTodaysPicks();
  cookieUser('u_unk_slice');
  seedSubscription({ userId: 'u_unk_slice', status: 'active' });
  harness().db.fail({ table: 'user_subscriptions', op: 'select' });
  const res = await get(consensusRoute, '/api/consensus');
  const b = await body(res);
  assert.equal(res.status, 200, 'unknown entitlement is answered with the free slice, not an error');
  assert.equal(b.consensusCount, 10, 'fixture must produce 10 consensus picks (guards against a vacuous pass)');
  assert.equal(b.entitlement, 'unknown');
  assert.equal(b.tier, 'free');
  assert.equal(b.consensus.length, 5, `unknown got ${b.consensus.length}`);
  assert.equal(b.allPicks.length, 0);
});

test('B1: an AUTH outage (cannot tell who the caller is) is unknown entitlement: free slice, labelled unknown, never the full list', async () => {
  seedTodaysPicks();
  cookieUser('u_auth_out');
  seedSubscription({ userId: 'u_auth_out', status: 'active' });
  harness().authOutage = true;
  const res = await get(consensusRoute, '/api/consensus');
  const b = await body(res);
  assert.equal(res.status, 200);
  assert.equal(b.consensusCount, 10, 'fixture must produce 10 consensus picks');
  assert.equal(b.entitlement, 'unknown');
  assert.equal(b.consensus.length, 5);
});

test('B1: a signed-out (no session) caller is a confident anonymous free, not unknown', async () => {
  seedTodaysPicks();
  const b = await body(await get(consensusRoute, '/api/consensus'));
  assert.equal(b.entitlement, 'free');
  assert.equal(b.consensus.length, 5);
});

test('S1: /api/picks rejects a signed-in NON-Pro user (403) and serves a Pro user (200, not publicly cacheable)', async () => {
  seedTodaysPicks();
  cookieUser('u_picks_free');
  seedSubscription({ userId: 'u_picks_free', status: 'canceled' });
  assert.equal((await get(picksRoute, '/api/picks')).status, 403);
  setup();
  seedTodaysPicks();
  cookieUser('u_picks_pro');
  seedSubscription({ userId: 'u_picks_pro', status: 'active' });
  const res = await get(picksRoute, '/api/picks');
  assert.equal(res.status, 200);
  assert.match(JSON.stringify(await body(res)), /Alpha|Bravo|Charlie/);
  assert.doesNotMatch(res.headers.get('cache-control') || '', /public/);
});

test('S1: /api/picks with unverifiable entitlement is 503 (never the picks)', async () => {
  seedTodaysPicks();
  cookieUser('u_picks_unk');
  seedSubscription({ userId: 'u_picks_unk', status: 'active' });
  harness().db.fail({ table: 'user_subscriptions', op: 'select' });
  const res = await get(picksRoute, '/api/picks');
  assert.equal(res.status, 503);
  assert.doesNotMatch(JSON.stringify(await body(res)), /Alpha|Bravo|Charlie/);
});

