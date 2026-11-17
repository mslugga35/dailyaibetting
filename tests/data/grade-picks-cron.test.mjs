/**
 * GET /api/cron/grade-picks end to end (the first job the Hetzner scheduler enables).
 * Proves its whole footprint: reads ESPN scoreboards (free), updates only PENDING
 * ai_picks rows from the last 7 days, writes nothing else, and calls no other host.
 * The one optional extra effect (a Discord summary) happens only when
 * AI_PICKS_DISCORD_WEBHOOK is set (it is not set in production).
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, req } from '../harness/helpers.mjs';

const route = await import('../../src/app/api/cron/grade-picks/route.ts');

const dayUTC = (offset) => new Date(Date.now() - offset * 86400000).toISOString().split('T')[0];
const NBA = {
  events: [{
    status: { type: { completed: true } },
    competitions: [{ competitors: [
      { homeAway: 'home', score: '110', team: { displayName: 'Los Angeles Lakers', abbreviation: 'LAL' } },
      { homeAway: 'away', score: '101', team: { displayName: 'Boston Celtics', abbreviation: 'BOS' } },
    ] }],
  }],
};

function seedPicks() {
  harness().db.seed('ai_picks', [
    { id: 'win', pick_date: dayUTC(1), sport: 'NBA', team: 'Lakers', opponent: 'Celtics', bet_type: 'ML', line: null, result: 'PENDING' },
    { id: 'loss', pick_date: dayUTC(1), sport: 'NBA', team: 'Celtics', opponent: 'Lakers', bet_type: 'ML', line: null, result: 'PENDING' },
    { id: 'kprop', pick_date: dayUTC(1), sport: 'NBA', team: 'Lakers', opponent: 'Celtics', bet_type: 'K_OVER', line: 'O 6.5 Ks', result: 'PENDING' },
    { id: 'old', pick_date: dayUTC(10), sport: 'NBA', team: 'Lakers', opponent: 'Celtics', bet_type: 'ML', line: null, result: 'PENDING' },
    { id: 'done', pick_date: dayUTC(1), sport: 'NBA', team: 'Celtics', opponent: 'Lakers', bet_type: 'ML', line: null, result: 'WIN', final_score: 'kept' },
  ]);
}

beforeEach(() => {
  setup({ env: { AI_PICKS_DISCORD_WEBHOOK: undefined } });
  harness().fetchRoutes.set('https://site.api.espn.com/', async (url) =>
    Response.json(url.includes('/basketball/nba/') ? NBA : { events: [] }));
  seedPicks();
});

const run = (headers = { Authorization: `Bearer ${process.env.CRON_SECRET}` }) =>
  route.GET(req('/api/cron/grade-picks', { headers }));
const row = (id) => harness().db.rows('ai_picks').find((r) => r.id === id);

test('grades only pending ai_picks from the last 7 days against ESPN finals', async () => {
  const res = await run();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.aiPicks.graded, 2);

  assert.equal(row('win').result, 'WIN');
  assert.match(row('win').final_score, /Boston Celtics 101 @ Los Angeles Lakers 110/);
  assert.ok(row('win').graded_at);
  assert.equal(row('loss').result, 'LOSS');
  assert.equal(row('kprop').result, 'PENDING', 'K props are not graded from team scores');
  assert.equal(row('old').result, 'PENDING', 'outside the 7-day window: untouched');
  assert.equal(row('done').final_score, 'kept', 'already-graded rows are never rewritten');
});

test('external footprint: ESPN GETs only, no refused calls, and writes touch ai_picks only', async () => {
  await run();
  const f = harness().fetches;
  assert.ok(f.length > 0);
  for (const x of f) {
    assert.ok(x.url.startsWith('https://site.api.espn.com/'), `unexpected host: ${x.url}`);
    assert.equal(x.method, 'GET');
    assert.equal(x.allowed, true);
  }
  const writes = harness().db.log.filter((l) => l.op && !['select', 'rpc'].includes(l.op));
  assert.ok(writes.length > 0);
  for (const w of writes) {
    assert.equal(w.table, 'ai_picks', `unexpected write to ${w.table}`);
    assert.equal(w.op, 'update', `unexpected ${w.op}`);
  }
});

test('Discord summary is posted only when AI_PICKS_DISCORD_WEBHOOK is configured', async () => {
  setup({ env: { AI_PICKS_DISCORD_WEBHOOK: 'https://discord.test/api/webhooks/1/x' } });
  harness().fetchRoutes.set('https://site.api.espn.com/', async (url) =>
    Response.json(url.includes('/basketball/nba/') ? NBA : { events: [] }));
  harness().fetchRoutes.set('https://discord.test/', async () => new Response(null, { status: 204 }));
  seedPicks();
  await run();
  await new Promise((r) => setTimeout(r, 10)); // the post is fire-and-forget
  assert.equal(harness().fetches.filter((x) => x.url.startsWith('https://discord.test/')).length, 1);
});

test('without the cron bearer: 401, no ESPN call, nothing written', async () => {
  for (const headers of [{}, { Authorization: 'Bearer nope' }, { Authorization: process.env.CRON_SECRET }]) {
    assert.equal((await run(headers)).status, 401);
  }
  assert.equal(harness().fetches.length, 0);
  assert.equal(row('win').result, 'PENDING');
});
