// Re-grade 2026-11-18: picks whose grade could not be verified are flagged hb_picks.stats_excluded.
// They stay listed, but never count in by_sport, recent_form or recent_win_pct.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, req, quietly } from '../harness/helpers.mjs';

beforeEach(() => setup());

test('capper profile: stats_excluded picks are not counted in by_sport / recent form / recent win %', async () => {
  const cappers = await import('../../src/app/api/cappers/route.ts');
  harness().db.seed('hb_capper_stats', [{ capper_id: 'c1', slug: 'sharp-sam', name: 'Sharp Sam', wins: 2, losses: 0, pushes: 0, units_won: 2, current_streak: 2 }]);
  const pick = (id, result, excluded, day) => ({ id, capper_id: 'c1', sport: 'nba', team: 'Lakers', line: '-3', odds: -110, pick_type: 'spread', result, stats_excluded: excluded, posted_at: `2026-11-${day}T15:00:00Z` });
  harness().db.seed('hb_picks', [pick('p1', 'win', false, '09'), pick('p2', 'win', false, '08'), pick('p3', 'loss', true, '10'), pick('p4', 'loss', true, '11')]);
  const res = await quietly(() => cappers.GET(req('/api/cappers?view=profile&slug=sharp-sam')));
  const b = await res.json();
  const c = b.capper ?? b.data ?? b;
  assert.equal(c.recent_form, 'WW', 'the two unverified losses are not in the form line');
  assert.equal(c.recent_win_pct, 100);
  const nba = c.by_sport.find((s) => String(s.sport).toLowerCase() === 'nba');
  assert.deepEqual([nba.wins, nba.losses], [2, 0]);
});
