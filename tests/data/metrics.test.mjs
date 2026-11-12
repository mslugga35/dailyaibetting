/**
 * Displayed performance metrics — GET /api/results (view=stats / recent).
 * The fake DB applies PostgREST's silent 1000-row cap, exactly like Supabase.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, req, body, quietly, cookieUser, seedSubscription } from '../harness/helpers.mjs';
import { MAX_ROWS } from '../harness/fake-db.mjs';

const { GET } = await import('../../src/app/api/results/route.ts');
const results = (q) => quietly(async () => body(await GET(req(`/api/results${q}`))));

const day = (offset) => new Date(Date.now() - offset * 86400000).toISOString().split('T')[0];

/** Graded fire picks. `spec` = [[result, daysAgo, count, isFire?], ...] in insertion order. */
function seed(spec) {
  const rows = [];
  for (const [result, daysAgo, count, isFire = true] of spec) {
    for (let i = 0; i < count; i++) rows.push({ result, is_fire: isFire, pick_date: day(daysAgo), sport: 'NBA' });
  }
  harness().db.seed('consensus_results', rows);
}

beforeEach(() => { setup(); });

test('fixture sanity: the fake DB caps selects at 1000 rows like PostgREST', () => {
  assert.equal(MAX_ROWS, 1000);
});

test('stats: wins/losses counted, pushes + PENDING + non-fire excluded, win% to one decimal', async () => {
  seed([['WIN', 3, 7], ['LOSS', 3, 4], ['PUSH', 3, 2], ['PENDING', 0, 5], ['WIN', 3, 9, false]]);
  const b = await results('?view=stats');
  assert.equal(b.success, true);
  assert.deepEqual(b.data.allTime, { wins: 7, losses: 4, total: 11, winPct: 63.6 });
});

test('stats: last30Days only counts picks inside the window', async () => {
  seed([['WIN', 5, 3], ['LOSS', 45, 6]]);
  const b = await results('?view=stats');
  assert.deepEqual(b.data.last30Days, { wins: 3, losses: 0, total: 3, winPct: 100 });
  assert.equal(b.data.allTime.total, 9);
});

test('stats: no graded picks → zeros, not NaN', async () => {
  seed([['PENDING', 0, 3], ['PUSH', 2, 2]]);
  const b = await results('?view=stats');
  assert.deepEqual(b.data.allTime, { wins: 0, losses: 0, total: 0, winPct: 0 });
});

test('stats: Supabase outage → 500 with a generic error (not zeros dressed up as a record)', async () => {
  seed([['WIN', 1, 3]]);
  harness().db.outage();
  const b = await results('?view=stats');
  assert.equal(b.success, false);
  assert.equal(b.error, 'Failed to fetch results');
});

test('M4: the all-time record must count EVERY graded pick, not the first 1000 rows',
  async () => {
    seed([['WIN', 60, 1000], ['LOSS', 50, 500]]); // 1500 graded: true record 1000-500 (66.7%)
    const b = await results('?view=stats');
    assert.equal(b.data.allTime.total, 1500, `displayed ${b.data.allTime.wins}-${b.data.allTime.losses} (${b.data.allTime.winPct}%)`);
    assert.equal(b.data.allTime.winPct, 66.7);
  });

test('M7: the streak must be computed from the MOST RECENT picks',
  async () => {
    // Non-monotonic insertion order: only a real pick_date DESC sort gives "winning 2"
    // (insertion order gives winning 1; a reversed array gives losing 1).
    seed([['WIN', 5, 1], ['LOSS', 9, 1], ['WIN', 1, 1], ['LOSS', 8, 1]]);
    const b = await results('?view=stats');
    assert.deepEqual(b.data.streak, { type: 'winning', count: 2 });
  });

test('M5: the recent view used for /stats windows must not silently stop at 50 rows',
  async () => {
    seed([['WIN', 2, 80], ['LOSS', 3, 40]]);
    const b = await results('?view=recent&days=30');
    assert.equal(b.data.length, 120, `returned ${b.data.length} of 120 graded picks in the window`);
  });

test('recent view is ordered newest first and excludes PENDING', async () => {
  seed([['WIN', 10, 1], ['LOSS', 1, 1], ['PENDING', 0, 1]]);
  const b = await results('?view=recent');
  assert.deepEqual(b.data.map((r) => r.result), ['LOSS', 'WIN']);
});

test('invalid view → 400', async () => {
  const res = await quietly(() => GET(req('/api/results?view=../../etc')));
  assert.equal(res.status, 400);
});

test('pending picks (today, ungraded = premium data) are not public: anonymous 401, non-Pro 403, Pro and the grading cron 200', async () => {
  harness().db.seed('consensus_results', [{ pick_date: day(0), sport: 'NBA', bet: 'Lakers ML', result: 'PENDING', is_fire: true }]);
  const get = (headers) => quietly(() => GET(req('/api/results?view=pending', { headers })));
  const anon = await get();
  assert.equal(anon.status, 401);
  assert.doesNotMatch(JSON.stringify(await body(anon)), /Lakers/);
  cookieUser('u_pend_free');
  seedSubscription({ userId: 'u_pend_free', status: 'canceled' });
  assert.equal((await get()).status, 403);
  setup();
  harness().db.seed('consensus_results', [{ pick_date: day(0), sport: 'NBA', bet: 'Lakers ML', result: 'PENDING', is_fire: true }]);
  assert.equal((await get({ Authorization: `Bearer ${process.env.CRON_SECRET}` })).status, 200);
  cookieUser('u_pend_pro');
  seedSubscription({ userId: 'u_pend_pro', status: 'active' });
  const pro = await get();
  assert.equal(pro.status, 200);
  assert.match(JSON.stringify(await body(pro)), /Lakers/);
});
