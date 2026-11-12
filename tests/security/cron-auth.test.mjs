/**
 * Cron route authentication. Every /api/cron/* route must refuse to run unless
 * the caller presents `Authorization: Bearer <CRON_SECRET>`, and must FAIL CLOSED
 * when CRON_SECRET is not configured. "Did not run" is checked by side effects:
 * no engine call, no outbound request, no DB write.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, req, quietly } from '../harness/helpers.mjs';

const ROUTES = {
  'ai-picks': await import('../../src/app/api/cron/ai-picks/route.ts'),
  'daily-ai-picks': await import('../../src/app/api/cron/daily-ai-picks/route.ts'),
  'grade-picks': await import('../../src/app/api/cron/grade-picks/route.ts'),
  'generate-blog-recap': await import('../../src/app/api/cron/generate-blog-recap/route.ts'),
};

const call = (name, headers = {}, query = '') => quietly(() => ROUTES[name].GET(req(`/api/cron/${name}${query}`, { headers })));

function sideEffects() {
  const h = harness();
  return {
    engine: h.moduleCalls.length,
    outbound: h.fetches.length,
    writes: h.db.log.filter((l) => ['insert', 'upsert', 'update', 'delete', 'rpc'].includes(l.op)).length,
  };
}
const NONE = { engine: 0, outbound: 0, writes: 0 };
/** Anything at all happened downstream of auth (engine call, outbound attempt, or any DB access). */
const activity = () => { const h = harness(); return h.moduleCalls.length + h.fetches.length + h.db.log.length; };

beforeEach(() => { setup(); });

for (const name of Object.keys(ROUTES)) {
  test(`${name}: no Authorization header → 401, nothing runs`, async () => {
    const res = await call(name);
    assert.equal(res.status, 401);
    assert.deepEqual(sideEffects(), NONE);
  });

  test(`${name}: wrong secret → 401, nothing runs`, async () => {
    const res = await call(name, { Authorization: 'Bearer not-the-secret' });
    assert.equal(res.status, 401);
    assert.deepEqual(sideEffects(), NONE);
  });

  test(`${name}: correct Bearer CRON_SECRET is accepted and the job actually runs`, async () => {
    const res = await call(name, { Authorization: `Bearer ${process.env.CRON_SECRET}` });
    assert.notEqual(res.status, 401);
    assert.ok(activity() > 0, 'authorized call did no work, so the "nothing runs" checks would be vacuous');
  });

  test(`${name}: CRON_SECRET set to "" + "Bearer " header → refused, nothing runs`,
    {},
    async () => {
      setup({ env: { CRON_SECRET: '' } });
      const res = await call(name, { Authorization: 'Bearer ' });
      assert.ok([401, 403, 500, 503].includes(res.status), `HTTP ${res.status}`);
      assert.deepEqual(sideEffects(), NONE);
    });

  test(`${name}: CRON_SECRET unset + "Bearer undefined" header → refused, nothing runs`,
    {},
    async () => {
      setup({ env: { CRON_SECRET: undefined } });
      const res = await call(name, { Authorization: 'Bearer undefined' });
      assert.ok([401, 403, 500, 503].includes(res.status), `HTTP ${res.status}`);
      assert.deepEqual(sideEffects(), NONE);
    });

  test(`${name}: CRON_SECRET unset → refuses (fails closed), nothing runs`,
    {},
    async () => {
      setup({ env: { CRON_SECRET: undefined } });
      const res = await call(name, {}, '?force=true');
      assert.ok([401, 403, 500, 503].includes(res.status), `HTTP ${res.status}`);
      assert.deepEqual(sideEffects(), NONE);
    });
}

test('ai-picks: authorized ?force=true reaches the engine with force=true (fake engine, no spend)', async () => {
  await call('ai-picks', { Authorization: `Bearer ${process.env.CRON_SECRET}` }, '?force=true');
  assert.deepEqual(harness().moduleCalls, [{ name: 'generateAIPicks', args: [true] }]);
});

test('S12: generate-blog-recap must require the "Bearer " scheme (a bare secret is not a bearer token)',
  async () => {
    const res = await call('generate-blog-recap', { Authorization: process.env.CRON_SECRET });
    assert.equal(res.status, 401);
  });

test('S12: POST /api/daily-ai-picks (force refresh, paid generation) refuses a bare secret and a blank-secret config', async () => {
  const mod = await import('../../src/app/api/daily-ai-picks/route.ts');
  const post = (headers) => quietly(() => mod.POST(req('/api/daily-ai-picks', { method: 'POST', headers })));
  assert.equal((await post({ Authorization: process.env.CRON_SECRET })).status, 401, 'bare secret');
  assert.equal((await post({ Authorization: `bearer ${process.env.CRON_SECRET}` })).status, 401, 'wrong scheme case');
  setup({ env: { CRON_SECRET: '   ' } });
  assert.equal((await post({ Authorization: 'Bearer    ' })).status, 500, 'blank secret is misconfiguration, never a match');
  assert.deepEqual(harness().moduleCalls, []);
});

test('grade-picks: a missing legacy `consensus` table (as in production) is skipped, and AI-pick grading still runs', async () => {
  harness().db.fail({ table: 'consensus', op: 'select', error: { message: "Could not find the table 'public.consensus' in the schema cache", code: 'PGRST205' } });
  harness().fetchRoutes.set('https://site.api.espn.com/', async () => new Response(JSON.stringify({ events: [] }), { status: 200, headers: { 'content-type': 'application/json' } }));
  const res = await call('grade-picks', { Authorization: `Bearer ${process.env.CRON_SECRET}` });
  const b = await res.json();
  assert.equal(res.status, 200, JSON.stringify(b));
  assert.match(b.consensus.status, /skipped/);
  assert.ok(harness().db.log.some((e) => e.table === 'ai_picks'), 'AI-pick grading was reached');
});

test('grade-picks: any other consensus read failure still fails the run (no silent success)', async () => {
  harness().db.fail({ table: 'consensus', op: 'select', error: { message: 'fetch failed: connect ETIMEDOUT', code: '' } });
  const res = await call('grade-picks', { Authorization: `Bearer ${process.env.CRON_SECRET}` });
  assert.equal(res.status, 500);
});

test('POST /api/blog authenticates before validating: a keyless empty body is 401, not 400', async () => {
  setup({ env: { BLOG_API_KEY: 'blog-key-for-tests-0123456789' } });
  const { POST } = await import('../../src/app/api/blog/route.ts');
  const res = await quietly(() => POST(req('/api/blog', { method: 'POST', body: {} })));
  assert.equal(res.status, 401);
  assert.equal(harness().db.log.length, 0, 'nothing touched the DB');
});

test('grade-picks: a missing COLUMN on the legacy table is schema drift and still fails', async () => {
  harness().db.fail({ table: 'consensus', op: 'select', error: { message: 'column consensus.result does not exist', code: '42703' } });
  const res = await call('grade-picks', { Authorization: `Bearer ${process.env.CRON_SECRET}` });
  assert.equal(res.status, 500);
});
