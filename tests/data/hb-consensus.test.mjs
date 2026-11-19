/**
 * Shared consensus (CONSENSUS_SOURCE=hb): DailyAI reads HiddenBag's hb_consensus_live
 * and must show EXACTLY what HiddenBag shows for the same date / sport / minCappers.
 *
 * tests/fixtures/consensus-parity/{rows.json, expected-projection.json} are
 * byte-identical copies of the goldens in hiddenbag-v2
 * scripts/tests/fixtures/consensus-parity/ (rows produced by the real HB writer,
 * projections produced by the real HB reader). CHECKSUMS.txt pins both.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setup, harness, req, body, quietly, cookieUser, seedSubscription } from '../harness/helpers.mjs';

const hb = await import('../../src/lib/data/hb-consensus.ts');
const { fetchAllPicksInWindow } = await import('../../src/lib/data/supabase-picks.ts');
const { consensusSection } = await import('../../src/lib/ai-picks/consensus-section.ts');
const { recordTable } = await import('../../src/lib/data/record-source.ts');
const consensusRoute = await import('../../src/app/api/consensus/route.ts');
const resultsRoute = await import('../../src/app/api/results/route.ts');
const dailyBetsRoute = await import('../../src/app/api/daily-bets/route.ts');
const { getTodayET, getYesterdayET } = await import('../../src/lib/utils/date.ts');
const { createClient } = await import('@supabase/supabase-js');

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'consensus-parity');
const ROWS = JSON.parse(fs.readFileSync(join(DIR, 'rows.json'), 'utf8'));
const EXPECTED = JSON.parse(fs.readFileSync(join(DIR, 'expected-projection.json'), 'utf8'));
// Same combos as hiddenbag scripts/tests/consensus-parity.test.mjs
const COMBOS = [
  { name: 'today-all-2', dates: ['2026-11-16'], sport: 'all', minCappers: 2 },
  { name: 'today-nba-3', dates: ['2026-11-16'], sport: 'nba', minCappers: 3 },
  { name: 'today-nfl-2', dates: ['2026-11-16'], sport: 'nfl', minCappers: 2 },
  { name: 'today-all-25', dates: ['2026-11-16'], sport: 'all', minCappers: 25 },
  { name: 'yesterday-all-2', dates: ['2026-11-15'], sport: 'all', minCappers: 2 },
  { name: 'yesterday-nhl-2', dates: ['2026-11-15'], sport: 'nhl', minCappers: 2 },
];

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const get = (mod, path, opts) => quietly(() => mod.GET(req(path, opts)));
const cron = { headers: { Authorization: 'Bearer cron-secret-harness' } };

/** Seed the golden rows, re-dated so the fixture's "today"/"yesterday" are the real ones the route uses. */
function seedRows({ redate = false, hbAgo = 0 } = {}) {
  const map = redate ? { '2026-11-16': getTodayET(), '2026-11-15': getYesterdayET() } : {};
  const rows = ROWS.map((r, i) => ({ id: i + 1, ...r, et_date: map[r.et_date] || r.et_date }));
  harness().db.seed('hb_consensus_live', rows);
  if (hbAgo !== null) heartbeat(hbAgo);
  return rows;
}

/** Writer heartbeat `agoSeconds` before now (hb_consensus_meta id=1). */
function heartbeat(agoSeconds) {
  harness().db.seed('hb_consensus_meta', [{ id: 1, last_success_at: new Date(Date.now() - agoSeconds * 1000).toISOString() }]);
}

beforeEach(() => { setup({ env: { CONSENSUS_SOURCE: 'hb' } }); hb.resetHbConsensusCache(); });

test('goldens are the pinned HiddenBag copies (checksum)', () => {
  const sums = Object.fromEntries(fs.readFileSync(join(DIR, 'CHECKSUMS.txt'), 'utf8').trim().split(/\r?\n/).map((l) => l.split(/\s+/)).map(([h, f]) => [f, h]));
  for (const f of ['rows.json', 'expected-projection.json']) {
    // CRLF-normalized: git autocrlf may check these out with CRLF on Windows.
    const h = createHash('sha256').update(fs.readFileSync(join(DIR, f), 'utf8').split('\r\n').join('\n')).digest('hex').slice(0, 16);
    assert.equal(h, sums[f], `${f} differs from the HiddenBag golden`);
  }
});

test('PARITY: DailyAI reader returns exactly HiddenBag\'s projection for every date/sport/minCappers combo', async () => {
  seedRows();
  for (const c of COMBOS) {
    hb.resetHbConsensusCache();
    const rows = await hb.fetchHbConsensus(c.dates, { sport: c.sport, minCappers: c.minCappers, db: db() });
    assert.deepEqual(rows.map(hb.parityProjection), EXPECTED[c.name], c.name);
  }
  assert.ok(EXPECTED['today-all-2'].length > 10);
});

test('sport filter is case-insensitive (DailyAI passes NBA, HiddenBag passes nba)', async () => {
  seedRows();
  const upper = await hb.fetchHbConsensus(['2026-11-16'], { sport: 'NBA', minCappers: 3, db: db() });
  assert.deepEqual(upper.map(hb.parityProjection), EXPECTED['today-nba-3']);
});

test('reader pages past the 1000-row cap and uses the SERVICE key', async () => {
  const base = ROWS.find((r) => r.et_date === '2026-11-16');
  harness().db.seed('hb_consensus_live', Array.from({ length: 1500 }, (_, i) => ({ ...base, id: i + 1, group_key: `k${String(i).padStart(5, '0')}` })));
  const rows = await hb.fetchHbConsensus(['2026-11-16'], {});
  assert.equal(rows.length, 1500);
  const reads = harness().db.log.filter((l) => l.table === 'hb_consensus_live');
  assert.ok(reads.length >= 2 && reads.every((l) => l.key === 'service'), JSON.stringify(reads.map((l) => l.key)));
});

test('reader never falls back to the anon key', async () => {
  setup({ env: { CONSENSUS_SOURCE: 'hb', SUPABASE_SERVICE_ROLE_KEY: undefined } });
  hb.resetHbConsensusCache();
  await assert.rejects(() => hb.fetchHbConsensus(['2026-11-16'], {}), /SUPABASE_SERVICE_ROLE_KEY/);
});

test('/api/consensus (hb, Pro/internal): full list == HiddenBag today-all-2, and DailyAI computes nothing itself', async () => {
  seedRows({ redate: true });
  const b = await body(await get(consensusRoute, '/api/consensus', cron));
  assert.equal(b.source, 'hb');
  assert.deepEqual(b.consensus.map((p) => p.id), EXPECTED['today-all-2'].map((p) => p.group_key));
  assert.deepEqual(b.consensus.map((p) => p.capperCount), EXPECTED['today-all-2'].map((p) => p.capper_count));
  const tables = new Set(harness().db.log.map((l) => l.table));
  assert.ok(!tables.has('hb_picks'), 'hb mode must not read hb_picks / build its own consensus');
});

test('/api/consensus (hb, Pro): sport + minCappers filter == HiddenBag today-nba-3', async () => {
  seedRows({ redate: true });
  const b = await body(await get(consensusRoute, '/api/consensus?sport=NBA&minCappers=3', cron));
  assert.deepEqual(b.consensus.map((p) => p.capperCount), EXPECTED['today-nba-3'].map((p) => p.capper_count));
  assert.deepEqual(b.consensus.map((p) => p.agreementPct), EXPECTED['today-nba-3'].map((p) => p.agreement_pct));
});

test('/api/consensus (hb): anonymous gets only the overall top 5, under every filter', async () => {
  seedRows({ redate: true });
  const full = (await body(await get(consensusRoute, '/api/consensus', cron))).consensus.map((p) => p.id);
  const anon = await body(await get(consensusRoute, '/api/consensus'));
  assert.equal(anon.entitlement, 'free');
  assert.deepEqual(anon.consensus.map((p) => p.id), full.slice(0, 5));
  assert.ok(anon.consensusCount > 5);
  assert.deepEqual(anon.allPicks, []);
  assert.deepEqual(anon.picksByCapper, {});
  for (const qs of ['?sport=NBA', '?sport=NFL', '?minCappers=3', '?sport=NBA&minCappers=4']) {
    const b = await body(await get(consensusRoute, `/api/consensus${qs}`));
    assert.ok(b.consensus.every((p) => full.slice(0, 5).includes(p.id)), qs);
    for (const list of Object.values(b.bySport)) assert.ok(list.every((p) => full.slice(0, 5).includes(p.id)), qs);
  }
});

test('/api/consensus (hb): active Pro gets the full list; canceled gets the free slice', async () => {
  seedRows({ redate: true });
  cookieUser('u_pro'); seedSubscription({ userId: 'u_pro', status: 'active' });
  const pro = await body(await get(consensusRoute, '/api/consensus'));
  assert.equal(pro.consensus.length, EXPECTED['today-all-2'].length);
  setup({ env: { CONSENSUS_SOURCE: 'hb' } }); hb.resetHbConsensusCache(); seedRows({ redate: true });
  cookieUser('u_old'); seedSubscription({ userId: 'u_old', status: 'canceled' });
  const old = await body(await get(consensusRoute, '/api/consensus'));
  assert.equal(old.consensus.length, 5);
});

test('/api/consensus (hb): entitlement outage → labelled unknown, free slice only (never fail-open)', async () => {
  seedRows({ redate: true });
  cookieUser('u_pay'); seedSubscription({ userId: 'u_pay', status: 'active' });
  harness().db.fail({ table: 'user_subscriptions', op: 'select' });
  const res = await get(consensusRoute, '/api/consensus');
  const b = await body(res);
  assert.ok(res.status >= 500 || (b.entitlement === 'unknown' && b.consensus.length <= 5), `HTTP ${res.status} ${b.entitlement} ${b.consensus?.length}`);
});

test('/api/consensus (hb): shared table unreadable → 500, no silent fallback to DailyAI\'s own consensus', async () => {
  heartbeat(0);
  harness().db.fail({ table: 'hb_consensus_live', op: 'select' });
  const res = await get(consensusRoute, '/api/consensus', cron);
  assert.equal(res.status, 500);
  assert.ok(!harness().db.log.some((l) => l.table === 'hb_picks'));
});

test('/api/consensus?date=yesterday (hb): results come from the shared record; void never shown', async () => {
  seedRows({ redate: true });
  const b = await body(await get(consensusRoute, '/api/consensus?date=yesterday', cron));
  const letter = { win: 'W', loss: 'L', push: 'P', pending: null };
  assert.deepEqual(b.consensus.map((p) => p.result), EXPECTED['yesterday-all-2'].map((p) => letter[p.result]));
  assert.ok(!b.consensus.some((p) => p.id.includes('nhl_g5')), 'postponed game (void) is not shown');
  assert.equal(b.stats.wins, EXPECTED['yesterday-all-2'].filter((p) => p.result === 'win').length);
  assert.equal(b.stats.losses, EXPECTED['yesterday-all-2'].filter((p) => p.result === 'loss').length);
  const anon = await body(await get(consensusRoute, '/api/consensus?date=yesterday'));
  assert.ok(anon.consensus.length <= 5);
});

test('legacy mode (default) never reads the shared table', async () => {
  setup({ env: { CONSENSUS_SOURCE: undefined } }); hb.resetHbConsensusCache();
  assert.equal(hb.getConsensusSource(), 'legacy');
  seedRows({ redate: true });
  await get(consensusRoute, '/api/consensus', cron);
  assert.ok(!harness().db.log.some((l) => l.table === 'hb_consensus_live'));
});

test('legacy pagination fix: every hb_picks row in the window is read past 1000', async () => {
  const day = getTodayET();
  harness().db.seed('hb_picks', Array.from({ length: 1234 }, (_, i) => ({ id: `p${String(i).padStart(5, '0')}`, sport: 'nba', team: 'Lakers', pick_type: 'moneyline', created_at: `${day}T15:00:00Z`, capper: { name: `C${i}` } })));
  const { data, error } = await fetchAllPicksInWindow(db(), `${day}T00:00:00Z`, `${day}T23:59:59Z`);
  assert.equal(error, null);
  assert.equal(data.length, 1234);
});

test('record source: hb → hb_consensus_record (the shared record), legacy → consensus_results', async () => {
  assert.equal(recordTable(), 'hb_consensus_record');
  harness().db.seed('hb_consensus_record', [
    { id: 'a', pick_date: getYesterdayET(), sport: 'NBA', bet: 'X', capper_count: 3, is_fire: true, result: 'WIN' },
    { id: 'b', pick_date: getYesterdayET(), sport: 'NBA', bet: 'Y', capper_count: 4, is_fire: true, result: 'LOSS' },
    { id: 'c', pick_date: getYesterdayET(), sport: 'NBA', bet: 'Z', capper_count: 3, is_fire: true, result: 'WIN' },
  ]);
  harness().db.seed('consensus_results', [{ id: 'z', pick_date: getYesterdayET(), is_fire: true, result: 'LOSS' }]);
  const b = await body(await get(resultsRoute, '/api/results?view=stats'));
  assert.deepEqual([b.data.allTime.wins, b.data.allTime.losses], [2, 1]);
  setup({ env: { CONSENSUS_SOURCE: undefined } });
  assert.equal(recordTable(), 'consensus_results');
});

test('AI-picks prompt uses the shared consensus counts when present', () => {
  const lines = consensusSection([{ sport: 'nba', bet: 'New York Knicks ML', capperCount: 4, cappers: ['A', 'B', 'C', 'D'], opposingCount: 1, tier: 'consensus' }], { picks: [{ sport: 'nba', team: 'Knicks', pick_type: 'moneyline', line: null, odds: null, capper_name: 'A' }], capperCount: 1 });
  assert.match(lines[0], /shared HiddenBag\/DailyAI consensus/);
  assert.match(lines[1], /NBA \| New York Knicks ML \| 4 cappers, 1 opposing \[consensus\]/);
  const legacy = consensusSection(null, { picks: [{ sport: 'nba', team: 'Knicks', pick_type: 'moneyline', line: null, odds: null, capper_name: 'A' }], capperCount: 1 });
  assert.match(legacy[0], /1 picks, 1 cappers/);
});

test('/api/results in hb mode: recent lists fire rows only (shared record also holds 2-capper groups)', async () => {
  harness().db.seed('hb_consensus_record', [
    { id: 'f', pick_date: getYesterdayET(), sport: 'NBA', bet: 'F', capper_count: 3, is_fire: true, result: 'WIN' },
    { id: 'l', pick_date: getYesterdayET(), sport: 'NBA', bet: 'L', capper_count: 2, is_fire: false, result: 'LOSS' },
  ]);
  const recent = await body(await get(resultsRoute, '/api/results?view=recent'));
  assert.deepEqual(recent.data.map((r) => r.id), ['f']);
});

// ---- Stale writer: never show an old board as today's ------------------------------
test('stale writer heartbeat → /api/consensus 503 stale, no picks in the body, no fallback', async () => {
  seedRows({ redate: true, hbAgo: 600 }); // 10 min > 300 s default
  const res = await get(consensusRoute, '/api/consensus', cron);
  assert.equal(res.status, 503);
  const b = await body(res);
  assert.equal(b.stale, true);
  assert.equal(b.success, false);
  assert.equal(b.consensus, undefined);
  assert.ok(b.lastUpdated);
  assert.ok(!harness().db.log.some((l) => l.table === 'hb_picks'), 'no raw-pick fallback');
});

test('missing heartbeat row (writer never ran) → 503, not an empty "no picks" board', async () => {
  harness().db.seed('hb_consensus_live', ROWS.map((r, i) => ({ id: i + 1, ...r, et_date: getTodayET() })));
  const res = await get(consensusRoute, '/api/consensus', cron);
  assert.equal(res.status, 503);
});

test('heartbeat read error → treated as stale (503)', async () => {
  seedRows({ redate: true });
  harness().db.fail({ table: 'hb_consensus_meta', op: 'select' });
  const res = await get(consensusRoute, '/api/consensus', cron);
  assert.equal(res.status, 503);
});

test('heartbeat within CONSENSUS_STALE_SECONDS → served; threshold is configurable and clamped', async () => {
  seedRows({ redate: true, hbAgo: 200 });
  assert.equal((await get(consensusRoute, '/api/consensus', cron)).status, 200);
  setup({ env: { CONSENSUS_SOURCE: 'hb', CONSENSUS_STALE_SECONDS: '150' } }); hb.resetHbConsensusCache();
  seedRows({ redate: true, hbAgo: 200 });
  assert.equal((await get(consensusRoute, '/api/consensus', cron)).status, 503);
  setup({ env: { CONSENSUS_SOURCE: 'hb', CONSENSUS_STALE_SECONDS: '5' } });
  assert.equal(hb.staleAfterSeconds(), 300, 'below 120 s falls back to the default');
});

test("yesterday's graded board is history: served even when the writer is stale", async () => {
  seedRows({ redate: true, hbAgo: 7200 });
  assert.equal((await get(consensusRoute, '/api/consensus?date=yesterday', cron)).status, 200);
});

test('AI prompt in hb mode with no shared consensus: says unavailable, never rebuilds one from raw picks', () => {
  const raw = { picks: [{ sport: 'nba', team: 'Heat', pick_type: 'spread', line: '+2', odds: -110, capper_name: 'A' }, { sport: 'nba', team: 'Heat', pick_type: 'spread', line: '+2', odds: -110, capper_name: 'B' }], capperCount: 2 };
  const out = consensusSection([], raw).join(' | ');
  assert.match(out, /unavailable/);
  assert.doesNotMatch(out, /Heat/);
  assert.match(consensusSection(null, raw).join(' | '), /heat/i, 'legacy mode (null) keeps the raw section');
});

test('/api/results: stray "##" never reaches bet/line; other fields and view=stats untouched', async () => {
  harness().db.seed('hb_consensus_record', [
    { id: 'h', pick_date: getYesterdayET(), sport: 'MLB', bet: 'Los Angeles Dodgers -1.5##', line: '-1.5##', capper_count: 3, is_fire: true, result: 'WIN', final_score: '5-2' },
  ]);
  const recent = await body(await get(resultsRoute, '/api/results?view=recent', cron));
  assert.deepEqual(recent.data.map((r) => [r.bet, r.line, r.final_score, r.id]), [['Los Angeles Dodgers -1.5', '-1.5', '5-2', 'h']]);
  // Signed out (QA 2026-11-19): sport/date/result only, no bet, line or score.
  const anon = await body(await get(resultsRoute, '/api/results?view=recent'));
  assert.deepEqual(anon.data, [{ id: 'h', sport: 'MLB', result: 'WIN', pick_date: getYesterdayET() }]);
  const anonWindow = await body(await get(resultsRoute, '/api/results?view=recent&days=30'));
  assert.deepEqual(Object.keys(anonWindow.data[0]).sort(), ['id', 'pick_date', 'result', 'sport']);
  const stats = await body(await get(resultsRoute, '/api/results?view=stats'));
  assert.equal(stats.data.allTime.wins, 1);
  assert.ok(!Array.isArray(stats.data));
});

// ── Nov 19 break-test: pages disagreed; sport pages showed other sports ──

test('/api/consensus?sport=X (hb): topOverall and bySport hold only that sport, today and yesterday', async () => {
  seedRows({ redate: true });
  for (const qs of ['?sport=NBA', '?sport=NFL', '?sport=NBA&date=yesterday', '?sport=NHL&date=yesterday']) {
    const sport = qs.match(/sport=(\w+)/)[1];
    const b = await body(await get(consensusRoute, `/api/consensus${qs}`, cron));
    assert.ok(b.topOverall.every((p) => p.sport === sport), `${qs} topOverall`);
    assert.deepEqual(Object.keys(b.bySport).filter((k) => b.bySport[k].length), b.consensus.length ? [sport] : [], `${qs} bySport`);
  }
  const all = await body(await get(consensusRoute, '/api/consensus', cron));
  assert.ok(Object.keys(all.bySport).length > 1, 'unfiltered board still spans sports');
});

test('/api/consensus?sport=X (hb): free picks are the same picks on the sport page as on the full board', async () => {
  seedRows({ redate: true });
  const freeAll = new Set((await body(await get(consensusRoute, '/api/consensus'))).consensus.map((p) => p.id));
  const nba = await body(await get(consensusRoute, '/api/consensus?sport=NBA'));
  assert.ok(nba.consensus.every((p) => freeAll.has(p.id)));
});

test('/api/daily-bets (hb): same shared consensus as /api/consensus, never rebuilt from hb_picks', async () => {
  seedRows({ redate: true });
  const cons = await body(await get(consensusRoute, '/api/consensus', cron));
  harness().db.log.length = 0;
  hb.resetHbConsensusCache(); // force a real read so the table log shows the source
  const db = await body(await get(dailyBetsRoute, '/api/daily-bets', cron));
  assert.equal(db.success, true);
  const tables = new Set(harness().db.log.map((l) => l.table));
  assert.ok(tables.has('hb_consensus_live'));
  assert.ok(!tables.has('hb_picks'), 'daily-bets must not build its own consensus in hb mode');
  // Top 5 = the first five of the shared ranking the homepage shows (topOverall order).
  assert.deepEqual(db.topPicks.map((p) => p.capperCount), cons.topOverall.slice(0, 5).map((p) => p.capperCount));
  assert.deepEqual(db.topPicks.map((p) => p.team), cons.topOverall.slice(0, 5).map((p) => p.team));
});

test('sport pages filter the whole board and keep their sport on client refresh', () => {
  const src = (p) => fs.readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', p), 'utf8');
  for (const s of ['mlb', 'nhl', 'cbb', 'cfb']) {
    const page = src(`src/app/${s}-picks-today/page.tsx`);
    assert.match(page, /Picks = consensus\.filter\(/, s);
    assert.doesNotMatch(page, /topOverall\.filter\(/, s);
  }
  assert.match(src('src/app/consensus/[sport]/page.tsx'), /<ConsensusContent [^>]*sport=\{meta\.upper\}/);
  const cc = src('src/app/consensus/ConsensusContent.tsx');
  assert.match(cc, /useConsensus\(\{ date: 'today', sport,/);
  assert.match(cc, /useConsensus\(\{ date: 'yesterday', sport,/);
});
