/**
 * Free tier cannot be enumerated: across ?sport=, ?minCappers= and the per-sport lists,
 * a non-Pro visitor never sees more than the 5 free picks. Own file (own process) so the
 * game-schedule module cache starts empty and both sports' games are visible.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, req, body, quietly } from '../harness/helpers.mjs';

const consensusRoute = await import('../../src/app/api/consensus/route.ts');
const { getTodayET, getYesterdayET } = await import('../../src/lib/utils/date.ts');
const TEAMS = ['Lakers', 'Celtics', 'Knicks', 'Bulls', 'Heat', 'Warriors', 'Nets', 'Suns'];
const CAPPERS = ['Alpha', 'Bravo', 'Charlie'];
const get = (mod, path, opts) => quietly(() => mod.GET(req(path, opts)));
beforeEach(() => { setup(); });

/** 8 NBA + 6 NHL consensus picks (3 cappers each). */
function seedTwoSports(day) {
  const created = `${day}T15:00:00Z`;
  const rows = [];
  const add = (sport, team) => { for (const c of CAPPERS) rows.push({ sport, team, opponent: null, pick_type: 'moneyline', line: null, odds: -110, units: 1, source: 'discord', posted_at: created, created_at: created, matched_game_id: null, capper: { name: c } }); };
  TEAMS.forEach((t) => add('NBA', t));
  ['Rangers', 'Bruins', 'Oilers', 'Maple Leafs', 'Penguins', 'Flyers'].forEach((t) => add('NHL', t));
  harness().db.seed('hb_picks', rows);
  harness().db.seed('hb_games', [
    ['basketball_nba', 'Los Angeles Lakers', 'Boston Celtics'], ['basketball_nba', 'New York Knicks', 'Chicago Bulls'],
    ['basketball_nba', 'Miami Heat', 'Golden State Warriors'], ['basketball_nba', 'Brooklyn Nets', 'Phoenix Suns'],
    ['icehockey_nhl', 'New York Rangers', 'Boston Bruins'], ['icehockey_nhl', 'Edmonton Oilers', 'Toronto Maple Leafs'],
    ['icehockey_nhl', 'Pittsburgh Penguins', 'Philadelphia Flyers'],
  ].map(([sport, home_team, away_team]) => ({ sport, home_team, away_team, commence_time: `${day}T23:30:00Z` })));
}

for (const [label, day, q] of [['today', () => getTodayET(), ''], ['yesterday', () => getYesterdayET(), 'date=yesterday&']]) {
  test(`free tier (${label}): no combination of ?sport= / ?minCappers= or per-sport lists reveals more than 5 distinct picks`, async () => {
    seedTwoSports(day());
    const seen = new Set();
    const log = [];
    let total = 0;
    for (const extra of ['', 'sport=NBA', 'sport=NHL', 'sport=ALL', 'minCappers=3', 'sport=NHL&minCappers=3', 'minCappers=1']) {
      const b = await body(await get(consensusRoute, `/api/consensus?${q}${extra}`));
      assert.equal(b.success, true, `${extra}: ${JSON.stringify(b).slice(0, 200)}`);
      log.push(`${extra || '-'}:${b.consensusCount}/${b.consensus?.length}`);
      total = Math.max(total, b.consensusCount ?? 0);
      for (const p of [...(b.consensus ?? []), ...(b.topOverall ?? []), ...Object.values(b.bySport ?? {}).flat()]) seen.add(p.id);
    }
    assert.ok(total >= 8, `fixture guard: ${total} consensus picks`);
    assert.ok(seen.size > 0 && seen.size <= 5, `free tier saw ${seen.size} distinct picks (${log.join(' ')})`);
  });
}
