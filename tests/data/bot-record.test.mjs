/**
 * Daily Bets API — GET /api/daily-bets exposes the bot record from the
 * ai_picks_overall view. winPct must be the view's win_pct column, as a number,
 * not a value recomputed from wins/losses.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, body, quietly } from '../harness/helpers.mjs';

const { GET } = await import('../../src/app/api/daily-bets/route.ts');

beforeEach(() => {
  setup();
  // The route's ESPN schedule filter is answered offline with an empty scoreboard.
  harness().fetchRoutes.set('https://site.api.espn.com/', async () => new Response(
    JSON.stringify({ events: [] }), { status: 200, headers: { 'content-type': 'application/json' } },
  ));
});

test('botRecord.winPct is the numeric win_pct column of ai_picks_overall', async () => {
  // 10-5 would derive 66.7; the view says 58.25, and that is what must be shown.
  harness().db.seed('ai_picks_overall', [{ wins: 10, losses: 5, pushes: 2, pending: 3, win_pct: 58.25 }]);
  const b = await quietly(async () => body(await GET()));
  assert.equal(b.success, true);
  assert.equal(typeof b.botRecord.winPct, 'number');
  assert.equal(b.botRecord.winPct, 58.25);
  assert.equal(harness().fetches.filter((f) => !f.allowed).length, 0, 'no refused outbound calls');
  assert.deepEqual(b.botRecord, { wins: 10, losses: 5, pushes: 2, pending: 3, winPct: 58.25 });
});
