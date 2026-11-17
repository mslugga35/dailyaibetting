/**
 * DailyAI Picks report: BallparkPal/Statcast are gone, and the report only covers
 * sports that are in season (src/lib/daily-ai-picks/season.ts). In November, MLB
 * must not be collected, prompted or asked for, even when a stray "MLB" pick exists.
 * Also covers the parlay-math correction and report-sanity floor ported from HB.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setup, harness, quietly } from '../harness/helpers.mjs';

const season = await import('../../src/lib/daily-ai-picks/season.ts');
const prompt = await import('../../src/lib/daily-ai-picks/prompt.ts');
const collect = await import('../../src/lib/daily-ai-picks/collect.ts');
const sanity = await import('../../src/lib/daily-ai-picks/report-sanity.ts');
const parlay = await import('../../src/lib/daily-ai-picks/parlay-math.ts');

const NOV = new Date('2026-11-17T17:00:00Z');
const JUL = new Date('2026-07-15T17:00:00Z');
const hoursFrom = (d, h) => new Date(d.getTime() + h * 3600_000).toISOString();
const sig = (eventDates, seasonType = 2) => ({ fetched: true, eventDates, seasonType });

// ── season detection (pure) ──────────────────────────────────────────────────

test('season: ESPN off-season wins over stray picks; sports with games today are in', () => {
  const d = season.decideInSeasonSports({
    mlb: sig([], 4),
    nba: sig([hoursFrom(NOV, 6)]),
    nhl: sig([hoursFrom(NOV, 3), hoursFrom(NOV, 4)]),
    nfl: sig([], 2),
    ncaaf: sig([], 2),
    ncaab: sig([hoursFrom(NOV, 2)]),
  }, { mlb: 3, nba: 10 }, NOV);
  assert.deepEqual(d.inSeason, ['nba', 'ncaab', 'nhl']);
  assert.match(d.reasons.mlb, /off-season/);
  assert.match(d.reasons.nfl, /no games/);
});

test('season: ESPN unreachable → fallback calendar (Nov: no MLB; Jul: MLB, no NBA/NFL)', () => {
  const nov = season.decideInSeasonSports({}, {}, NOV).inSeason;
  assert.ok(!nov.includes('mlb'));
  for (const s of ['nfl', 'ncaaf', 'nba', 'ncaab', 'nhl']) assert.ok(nov.includes(s), s);
  const jul = season.decideInSeasonSports({ nba: { fetched: false, eventDates: [], seasonType: null } }, {}, JUL).inSeason;
  assert.deepEqual(jul, ['mlb']);
});

test('season: active season with no game today counts only when experts picked it', () => {
  const sigs = { nfl: sig([], 2) };
  assert.ok(season.decideInSeasonSports(sigs, { nfl: 4 }, NOV).inSeason.includes('nfl'));
  assert.ok(!season.decideInSeasonSports(sigs, {}, NOV).inSeason.includes('nfl'));
});

test('season: a scoreboard still showing last month\'s final game is not a slate', () => {
  const d = season.decideInSeasonSports({ mlb: sig([hoursFrom(NOV, -24 * 18)], null) }, { mlb: 2 }, NOV);
  assert.ok(!d.inSeason.includes('mlb'));
});

test('season: untracked pick sports (soccer, mma) are in; "other" never is; aliases normalise', () => {
  const d = season.decideInSeasonSports({}, { soccer: 5, mma: 1, other: 9 }, NOV);
  assert.ok(d.inSeason.includes('soccer') && d.inSeason.includes('mma'));
  assert.ok(!d.inSeason.includes('other'));
  assert.equal(season.normalizeSport('CBB'), 'ncaab');
  assert.equal(season.normalizeSport('cfb'), 'ncaaf');
  assert.equal(season.normalizeSport(''), 'other');
});

// ── prompt ───────────────────────────────────────────────────────────────────

function ctx(inSeasonSports, extra = {}) {
  const games = Array.from({ length: 40 }, (_, i) => ({
    name: `G${i}`, status: 'STATUS_SCHEDULED', homeTeam: `Home ${i}`, homeRecord: '1-0', awayTeam: `Away ${i}`, awayRecord: '0-1',
  }));
  return {
    date: 'Tuesday, November 17, 2026',
    expertPicks: {
      picks: inSeasonSports.map((s) => ({ sport: s, team: 'Team', opponent: null, pick_type: 'spread', line: '-3', odds: '-110', units: 1, capper_name: 'Capper A', posted_at: '' })),
      capperCount: 1,
    },
    prizePicks: [],
    mlbSchedule: [],
    espnSchedule: Object.fromEntries(inSeasonSports.filter((s) => s !== 'soccer').map((s) => [s, games])),
    polymarket: [],
    kalshi: [],
    inSeasonSports,
    seasonReasons: {},
    ...extra,
  };
}

test('prompt: MLB out of season → no MLB sections asked for, MLB named as excluded', () => {
  const p = prompt.buildUserPrompt(ctx(['nfl', 'nba', 'nhl']));
  for (const re of [/STRIKEOUT/, /YRFI/, /HOME RUNS/, /HITTING PROPS/, /first 5 inning/i]) assert.doesNotMatch(p, re);
  assert.match(p, /SPORTS IN SEASON TODAY: NFL, NBA, NHL/);
  assert.match(p, /OUT OF SEASON today[^\n]*MLB/);
  assert.match(p, /top 3 for each of: NFL, NBA, NHL/);
});

test('prompt: MLB in season → MLB sections are asked for', () => {
  const p = prompt.buildUserPrompt(ctx(['mlb', 'nba']));
  assert.match(p, /MLB STRIKEOUT PROPS/);
  assert.match(p, /YRFI\/NRFI/);
  assert.doesNotMatch(p, /OUT OF SEASON today[^\n]*MLB/);
});

test('prompt: no BallparkPal/Statcast, schedules capped, off-season prompt is smaller', () => {
  const off = prompt.buildUserPrompt(ctx(['nba', 'nhl']));
  const on = prompt.buildUserPrompt(ctx(['mlb', 'nba', 'nhl']));
  for (const p of [off, on, prompt.buildSystemPrompt()]) assert.doesNotMatch(p, /ballpark|statcast/i);
  const nbaLines = off.split('\n').filter((l) => / @ Home \d+/.test(l)).length;
  assert.equal(nbaLines, prompt.MAX_SCHEDULE_LINES * 2, 'two sports × capped schedule');
  assert.match(off, /\(\+15 more games\)/);
  assert.ok(off.length < on.length, `off-season prompt ${off.length} < in-season ${on.length}`);
  assert.doesNotMatch(prompt.buildSystemPrompt(), /MLB/);
});

test('prompt: player-prop parlay only when PrizePicks lines exist', () => {
  assert.doesNotMatch(prompt.buildUserPrompt(ctx(['nba'])), /PLAYER PROP PARLAY/);
  const withProps = ctx(['nba'], { prizePicks: [{ sport: 'nba', player: 'P', team: 'T', position: 'G', stat: 'Points', line: 20.5, startTime: '' }] });
  const p = prompt.buildUserPrompt(withProps);
  assert.match(p, /PLAYER PROP PARLAY/);
  assert.match(p, /### NBA Points/);
});

// ── collectAllData end-to-end (offline fakes) ────────────────────────────────

beforeEach(() => setup());

function espnRoutes(now) {
  harness().fetchRoutes.set('https://site.api.espn.com/', async (url) => {
    const ev = (date) => ({ date, shortName: 'A @ B', competitions: [{ status: { type: { name: 'STATUS_SCHEDULED' } }, competitors: [
      { homeAway: 'home', team: { displayName: 'Home' }, records: [{ summary: '5-5' }] },
      { homeAway: 'away', team: { displayName: 'Away' }, records: [{ summary: '4-6' }] },
    ] }] });
    if (url.includes('baseball/mlb')) return Response.json({ leagues: [{ season: { type: { type: 4 } } }], events: [] });
    if (url.includes('basketball/nba') || url.includes('hockey/nhl')) {
      return Response.json({ leagues: [{ season: { type: { type: 2 } } }], events: [ev(hoursFrom(now, 5))] });
    }
    if (url.includes('college-basketball')) return new Response('down', { status: 503 }); // → calendar
    return Response.json({ leagues: [{ season: { type: { type: 2 } } }], events: [] });
  });
  harness().fetchRoutes.set('https://partner-api.prizepicks.com/', async () => Response.json({ data: [], included: [] }));
  harness().fetchRoutes.set('https://gamma-api.polymarket.com/', async () => Response.json([]));
  harness().fetchRoutes.set('https://api.elections.kalshi.com/', async () => Response.json({ markets: [] }));
  harness().fetchRoutes.set('https://statsapi.mlb.com/', async () => Response.json({ dates: [] }));
}

test('collectAllData in November: MLB not fetched or kept; no BallparkPal/Statcast keys', async () => {
  const now = new Date();
  espnRoutes(now);
  const today = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  harness().db.seed('hb_cappers', [{ id: 'c1', name: 'Alpha' }, { id: 'c2', name: 'Beta' }]);
  harness().db.seed('hb_picks', [
    { sport: 'nba', team: 'Celtics', opponent: 'Knicks', pick_type: 'spread', line: '-4.5', odds: '-110', units: 1, capper_id: 'c1', posted_at: `${today}T12:00:00` },
    { sport: 'mlb', team: 'Yankees', opponent: null, pick_type: 'moneyline', line: null, odds: '-120', units: 1, capper_id: 'c2', posted_at: `${today}T12:05:00` },
  ]);

  const c = await quietly(() => collect.collectAllData(now));

  assert.ok(!('ballparkPal' in c) && !('statcast' in c));
  assert.ok(!c.inSeasonSports.includes('mlb'));
  assert.ok(c.inSeasonSports.includes('nba') && c.inSeasonSports.includes('nhl'));
  assert.match(c.seasonReasons.ncaab, /fallback calendar/);
  assert.deepEqual(c.expertPicks.picks.map((p) => p.team), ['Celtics'], 'off-season MLB pick dropped');
  assert.equal(c.expertPicks.capperCount, 1);
  assert.ok(!('mlb' in c.espnSchedule));

  const urls = harness().fetches.map((f) => f.url);
  assert.ok(!urls.some((u) => u.startsWith('https://statsapi.mlb.com/')), 'no MLB schedule fetch');
  assert.ok(!urls.some((u) => /league_id=2\b/.test(u)), 'no MLB PrizePicks fetch');
  assert.ok(!urls.some((u) => /series_ticker=KXMLB/.test(u)), 'no MLB Kalshi fetch');
  assert.ok(urls.some((u) => /league_id=7\b/.test(u)), 'NBA PrizePicks fetched');
  assert.equal(harness().fetches.filter((f) => !f.allowed).length, 0, 'no refused outbound calls');

  const p = prompt.buildUserPrompt(c);
  assert.doesNotMatch(p, /Yankees|STRIKEOUT|BALLPARK|STATCAST/i);
});

test('no BallparkPal/Statcast cache reads remain in the report or engine sources', () => {
  for (const f of ['collect.ts', 'prompt.ts', 'generate.ts', 'season.ts']) {
    const src = readFileSync(new URL(`../../src/lib/daily-ai-picks/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\.cache|homedir|from 'fs'|readFileSync|BPP_DIR|STATCAST_CACHE|context\.(ballparkPal|statcast)/, f);
  }
  const engine = readFileSync(new URL('../../src/lib/ai-picks/engine.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /data\.(ballparkPal|statcast)|context\.(ballparkPal|statcast)/);
  // generate.ts is redirected to a fake in the harness, so its contract is checked at source level:
  const gen = readFileSync(new URL('../../src/lib/daily-ai-picks/generate.ts', import.meta.url), 'utf8');
  assert.match(gen, /has_ballparkpal: false,\s*has_statcast: false/, 'shared schema columns still written');
  assert.ok(gen.indexOf('classifyReport(rawReport)') < gen.indexOf('await cacheReport(report'), 'sanity check before store');
  assert.ok(gen.indexOf('validateParlayMath(rawReport)') < gen.indexOf('await cacheReport(report'), 'parlay fix before store');
  assert.match(gen, /getTodaysStoredReport\(\)/, 'skip-if-exists kept');
  assert.match(gen, /getServiceRoleClient\(\)\.from\('daily_ai_report'\)\.upsert/, 'service-role write kept');
});

// ── ported HB guards ─────────────────────────────────────────────────────────

test('report sanity: stubs, empties and truncated tails rejected; a real report passes', () => {
  assert.equal(sanity.classifyReport('').kind, 'empty');
  assert.equal(sanity.classifyReport(null).kind, 'empty');
  assert.equal(sanity.classifyReport('Error: upstream 502').kind, 'error-stub');
  assert.equal(sanity.classifyReport('x'.repeat(866)).kind, 'too-short');
  assert.equal(sanity.classifyReport('x'.repeat(sanity.MIN_REPORT_CHARS)).ok, true);
});

test('parlay math: a 12-leg "+150 to +250" is corrected; right figures untouched', () => {
  const bad = '**Combined:** ~1.23 each ×12 ≈ **+150 to +250**';
  const r = parlay.validateParlayMath(bad);
  assert.equal(r.issues.length, 1);
  assert.equal(r.issues[0].severity, 'severe');
  assert.match(r.corrected, /auto-corrected: 11\.\d\dx = \+10\d\d/);
  const ok = parlay.validateParlayMath('2.5 × 2.0 × 2.0 = 10.0 and 6.32 dec = +532');
  assert.equal(ok.issues.length, 0);
  assert.equal(parlay.combineAmerican([-110, -110]), 264);
});
