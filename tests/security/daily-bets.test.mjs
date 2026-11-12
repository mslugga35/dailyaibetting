/**
 * /api/daily-bets paywall: anonymous, Free and "unknown" (entitlement outage) visitors
 * get only the free top picks; nothing in the response may reveal another pick.
 * Pro and the internal cron get the full analysis.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, req, body, quietly, cookieUser, seedSubscription } from '../harness/helpers.mjs';

const { GET } = await import('../../src/app/api/daily-bets/route.ts');
const { limitDailyBetsToFreeTier } = await import('../../src/lib/daily-bets/daily-bets-builder.ts');
const { getTodayET } = await import('../../src/lib/utils/date.ts');

const TEAMS = ['Lakers', 'Celtics', 'Knicks', 'Bulls', 'Heat', 'Warriors', 'Nets', 'Suns', 'Bucks', 'Nuggets'];

/** 10 NBA moneyline consensus picks; capper counts 12..3 so the ranking is deterministic. */
function seedTodaysPicks() {
  const day = getTodayET();
  const created = `${day}T15:00:00Z`;
  const rows = [];
  TEAMS.forEach((team, i) => {
    for (let c = 0; c < 12 - i; c++) {
      rows.push({ sport: 'NBA', team, opponent: null, pick_type: 'moneyline', line: null, odds: -110, units: 1, source: 'discord', posted_at: created, created_at: created, matched_game_id: null, capper: { name: `Capper${c}` } });
    }
  });
  harness().db.seed('hb_picks', rows);
  const games = [
    ['Los Angeles Lakers', 'Boston Celtics'], ['New York Knicks', 'Chicago Bulls'], ['Miami Heat', 'Golden State Warriors'],
    ['Brooklyn Nets', 'Phoenix Suns'], ['Milwaukee Bucks', 'Denver Nuggets'],
  ];
  harness().db.seed('hb_games', games.map(([home_team, away_team]) => ({ sport: 'basketball_nba', home_team, away_team, commence_time: `${day}T23:30:00Z` })));
  harness().db.seed('daily_ai_report', [{ report_date: day, report_text: 'Full-slate write-up: every pick explained.', generated_at: created }]);
}

/** Every bet string anywhere in the body (pick objects and trend lists). */
function betsIn(b) {
  const out = new Set();
  const walk = (v, key) => {
    if (Array.isArray(v)) { for (const x of v) walk(x, key === 'relevantPicks' ? 'relevantPicks' : undefined); return; }
    if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) { if (k === 'bet' && typeof x === 'string') out.add(x); else walk(x, k); } return; }
    if (key === 'relevantPicks' && typeof v === 'string') out.add(v.replace(/\s*\(\d+\)$/, ''));
  };
  walk({ ...b, botPicks: undefined }); // bot picks are a separate, public AI feed
  return out;
}

const get = (opts) => quietly(async () => GET(req('/api/daily-bets', opts)));

beforeEach(() => {
  setup();
  harness().fetchRoutes.set('https://site.api.espn.com/', async () => new Response(
    JSON.stringify({ events: [] }), { status: 200, headers: { 'content-type': 'application/json' } },
  ));
});

test('Pro gets the full analysis (fixture guard: there is more than the free slice to hide)', async () => {
  seedTodaysPicks();
  cookieUser('u_pro_db');
  seedSubscription({ userId: 'u_pro_db', status: 'active' });
  const b = await body(await get());
  assert.equal(b.success, true);
  assert.equal(b.isLimited, false);
  assert.equal(b.entitlement, 'premium');
  assert.ok(b.consensusCount >= 10, `consensusCount ${b.consensusCount}`);
  assert.ok(b.aiReport, 'Pro sees the AI write-up');
  assert.ok(b.twoLegParlays.length > 0, 'fixture produces parlays');
});

for (const [who, arrange] of [
  ['anonymous', () => {}],
  ['a Free (canceled) account', () => { cookieUser('u_free_db'); seedSubscription({ userId: 'u_free_db', status: 'canceled' }); }],
  ['a past_due account', () => { cookieUser('u_pd_db'); seedSubscription({ userId: 'u_pd_db', status: 'past_due' }); }],
]) {
  test(`${who} gets only the free top picks; no other pick appears anywhere in the response`, async () => {
    seedTodaysPicks();
    arrange();
    const res = await get();
    const b = await body(res);
    assert.equal(b.success, true);
    assert.equal(b.isLimited, true);
    assert.ok(b.topPicks.length > 0 && b.topPicks.length <= 5, `topPicks ${b.topPicks.length}`);
    const free = new Set(b.topPicks.map((p) => p.bet));
    for (const bet of betsIn(b)) assert.ok(free.has(bet), `leaked non-free pick: ${bet}`);
    assert.equal(b.mlbAnalysis, null);
    assert.deepEqual(b.playerPropParlays, []);
    assert.match(res.headers.get('cache-control') || '', /private/);
    assert.match(res.headers.get('cache-control') || '', /no-store/);
  });
}

test('an entitlement outage is served the free view (fail closed) and labelled unknown', async () => {
  seedTodaysPicks();
  cookieUser('u_pay_out_db');
  seedSubscription({ userId: 'u_pay_out_db', status: 'active' });
  harness().db.fail({ table: 'user_subscriptions', op: 'select' });
  const b = await body(await get());
  assert.equal(b.entitlement, 'unknown');
  assert.equal(b.isLimited, true);
});

test('a wrong cron bearer is free; the real cron secret gets the full analysis', async () => {
  seedTodaysPicks();
  const wrong = await body(await get({ headers: { Authorization: 'Bearer guess' } }));
  assert.equal(wrong.isLimited, true);
  const cron = await body(await get({ headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }));
  assert.equal(cron.isLimited, false);
});

test('limitDailyBetsToFreeTier keeps a parlay, ladder or trend only when it reveals nothing beyond the free picks', () => {
  const P = (id) => ({ id, sport: 'NBA', matchup: `${id} game`, bet: `${id} ML`, capperCount: 3 });
  const free = ['a', 'b', 'c', 'd', 'e'].map(P);
  const out = limitDailyBetsToFreeTier({
    date: 'd', timestamp: 't', topPicks: [...free, P('f')],
    top5MostCommon: [{ bet: 'a ML', sport: 'NBA', matchup: 'x', frequency: 3, capperCount: 3, isFire: true }, { bet: 'z ML', sport: 'NBA', matchup: 'y', frequency: 9, capperCount: 9, isFire: true }],
    twoLegParlays: [[P('a'), P('b')], [P('a'), P('z')]], threeLegParlays: [[P('a'), P('b'), P('z')]],
    playerPropParlays: [[{ player: 'p', prop: 'pts', line: '20', sport: 'NBA', capperCount: 3, cappers: ['x'] }]],
    bestBySport: { NBA: P('a'), NHL: P('z') }, mlbAnalysis: { strikeoutProps: [], yrfiPicks: [P('z')], nrfiPicks: [], pitcherProps: [] },
    bigMoneyParlays: [{ legs: [P('z')] }], ladderPick: { pick: P('z') },
    trends: [{ type: 'hot', title: 't', description: 'd', relevantPicks: ['a ML', 'z ML (7)', 'b ML (8)'] }, { type: 'hot', title: 'hidden', description: 'only hidden picks', relevantPicks: ['z ML'] }],
    totalPicks: 9, consensusCount: 9, firePickCount: 9, activeSports: ['NBA'],
    aiReport: 'x', aiReportGeneratedAt: 'y', botPicks: [], botRecord: null,
  });
  assert.deepEqual(out.topPicks.map((p) => p.id), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(out.top5MostCommon.map((x) => x.bet), ['a ML']);
  assert.equal(out.twoLegParlays.length, 1);
  assert.equal(out.threeLegParlays.length, 0);
  assert.deepEqual(Object.keys(out.bestBySport), ['NBA']);
  assert.equal(out.bigMoneyParlays.length, 0);
  assert.equal(out.ladderPick, null);
  assert.deepEqual(out.trends.map((t) => t.title), ['t'], 'a trend about hidden picks only is dropped');
  assert.deepEqual(out.trends[0].relevantPicks, ['a ML', 'b ML (8)']);
  assert.equal(out.mlbAnalysis, null);
  assert.equal(out.aiReport, 'x', 'the AI write-up is public (/daily-ai-picks)');
  assert.equal(out.totalPicks, 9, 'aggregate counts stay');
});
