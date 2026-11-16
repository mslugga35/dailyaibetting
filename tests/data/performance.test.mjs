/**
 * Verified performance (src/lib/data/performance.ts): counts only graded fire picks,
 * never truncates at the 1000-row cap, excludes pushes from the rate, and reports
 * an empty record as empty (nothing estimated).
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness } from '../harness/helpers.mjs';

const { getVerifiedPerformance, toRecord } = await import('../../src/lib/data/performance.ts');
const { createClient } = await import('@supabase/supabase-js');

beforeEach(() => { setup(); });
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const day = (offset) => new Date(Date.now() - offset * 86400000).toISOString().split('T')[0];
function seed(rows) {
  const out = [];
  for (const [result, offset, n, extra = {}] of rows) {
    for (let i = 0; i < n; i++) out.push({ pick_date: day(offset), sport: 'NBA', bet: `T${i}`, is_fire: true, capper_count: 3, result, ...extra });
  }
  harness().db.seed('consensus_results', out);
}

test('toRecord: pushes are excluded from the win rate; nothing decided → null rate', () => {
  assert.deepEqual(toRecord(6, 4, 3), { wins: 6, losses: 4, pushes: 3, decided: 10, winPct: 60 });
  assert.equal(toRecord(0, 0, 2).winPct, null);
});

test('empty table → zeros and no rate (nothing fabricated)', async () => {
  const p = await getVerifiedPerformance(db());
  assert.equal(p.configured, true);
  assert.deepEqual(p.allTime, toRecord(0, 0, 0));
  assert.equal(p.bySport.length, 0);
  assert.equal(p.recent.length, 0);
  assert.equal(p.firstGradedDate, null);
});

test('counts every graded fire pick past the 1000-row cap; pending and non-fire rows are ignored', async () => {
  seed([['WIN', 60, 1100], ['LOSS', 50, 500], ['PUSH', 40, 7], ['PENDING', 0, 30]]);
  seed([['WIN', 1, 50, { is_fire: false }]]);
  const p = await getVerifiedPerformance(db());
  assert.deepEqual(p.allTime, toRecord(1100, 500, 7));
  assert.equal(p.allTime.winPct, 68.8);
  assert.equal(p.recent.length, 25);
  assert.ok(p.recent.every((r) => r.result !== 'PENDING'));
  assert.equal(p.lastGradedDate, day(40));
  assert.equal(p.firstGradedDate, day(60));
});

test('windows, sports and consensus-strength buckets are counted separately and correctly', async () => {
  seed([['WIN', 2, 3], ['LOSS', 2, 1], ['WIN', 20, 2], ['LOSS', 100, 4]]);
  seed([['WIN', 3, 5, { sport: 'NFL', capper_count: 7 }], ['LOSS', 3, 5, { sport: 'NFL', capper_count: 12 }]]);
  const p = await getVerifiedPerformance(db());
  assert.deepEqual(p.last7, toRecord(8, 6, 0));
  assert.deepEqual(p.last30, toRecord(10, 6, 0));
  assert.deepEqual(p.allTime, toRecord(10, 10, 0));
  const nfl = p.bySport.find((s) => s.sport === 'NFL');
  assert.deepEqual([nfl.wins, nfl.losses], [5, 5]);
  const b = Object.fromEntries(p.byCapperCount.map((x) => [x.label, [x.wins, x.losses]]));
  assert.deepEqual(b['3–4 cappers'], [5, 5]);
  assert.deepEqual(b['7–9 cappers'], [5, 0]);
  assert.deepEqual(b['10+ cappers'], [0, 5]);
});

test('no database configured → reported as unconfigured, never as a record', async () => {
  const p = await getVerifiedPerformance(null);
  assert.equal(p.configured, false);
  assert.equal(p.allTime.decided, 0);
});

test('sports outside the named list are shown as Other, so the sport table sums to the all-time total', async () => {
  seed([['WIN', 5, 3], ['LOSS', 5, 2, { sport: 'TENNIS' }], ['WIN', 5, 1, { sport: 'GOLF' }]]);
  const p = await getVerifiedPerformance(db());
  const other = p.bySport.find((x) => x.sport === 'Other');
  assert.deepEqual([other.wins, other.losses], [1, 2]);
  const sum = p.bySport.reduce((n, x) => n + x.wins + x.losses + x.pushes, 0);
  assert.equal(sum, p.allTime.wins + p.allTime.losses + p.allTime.pushes);
});

test('"last 7 days" is exactly 7 ET calendar dates including today', async () => {
  const { windowStartET, getTodayET } = await import('../../src/lib/utils/date.ts');
  const [y, m, d] = getTodayET().split('-').map(Number);
  const et = (back) => new Date(Date.UTC(y, m - 1, d - back)).toISOString().slice(0, 10);
  assert.equal(windowStartET(7), et(6));
  assert.equal(windowStartET(1), getTodayET());
  harness().db.seed('consensus_results', [
    { pick_date: et(6), sport: 'NBA', bet: 'In', is_fire: true, capper_count: 3, result: 'WIN' },
    { pick_date: et(7), sport: 'NBA', bet: 'Out', is_fire: true, capper_count: 3, result: 'LOSS' },
  ]);
  const p = await getVerifiedPerformance(db());
  assert.deepEqual(p.last7, toRecord(1, 0, 0));
});

test('getAllTimeRecord (homepage badge) equals the full report all-time record', async () => {
  seed([['WIN', 1, 7], ['LOSS', 2, 3], ['PUSH', 3, 1]]);
  const { getAllTimeRecord } = await import('../../src/lib/data/performance.ts');
  assert.deepEqual(await getAllTimeRecord(), (await getVerifiedPerformance(db())).allTime);
});
