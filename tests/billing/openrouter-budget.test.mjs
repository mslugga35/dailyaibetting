/**
 * OpenRouter monthly budget (src/lib/utils/openrouter.ts): every paid call is refused
 * unless OpenRouter confirms headroom under OPENROUTER_MONTHLY_BUDGET_USD for this
 * call's WORST-CASE cost. Anything unconfirmable fails closed, and no completion
 * request is ever sent when the guard refuses.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, req } from '../harness/helpers.mjs';

const or = await import('../../src/lib/utils/openrouter.ts');
const budgetRoute = await import('../../src/app/api/cron/openrouter-budget/route.ts');

const KEY_URL = 'https://openrouter.ai/api/v1/key';
const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ENV = { OPENROUTER_API_KEY: 'sk-or-harness-never-sent', OPENROUTER_MONTHLY_BUDGET_USD: '20' };

let keyData;
let chatCost;
beforeEach(() => {
  setup({ env: { ...ENV, OPENROUTER_BASE_URL: undefined } });
  or._resetBudgetStateForTests();
  keyData = { usage_monthly: 1, limit: null, limit_remaining: null };
  chatCost = 0.05;
  harness().fetchRoutes.set('https://openrouter.ai/api/v1/', async (url) => {
    if (url === KEY_URL) return Response.json({ data: keyData });
    if (url === CHAT_URL) {
      return Response.json({ choices: [{ message: { content: 'ok' } }], usage: chatCost === null ? {} : { cost: chatCost } });
    }
    return new Response('nope', { status: 404 });
  });
});

const chatCalls = () => harness().fetches.filter((f) => f.url === CHAT_URL);
const call = (opts) => or.callOpenRouter('system', 'user prompt', opts);
const refused = (p, re) => assert.rejects(p, (e) => e.name === 'OpenRouterBudgetError' && (!re || re.test(e.message)));

test('within budget: one completion call, usage accounting requested, content returned', async () => {
  assert.equal(await call({ maxTokens: 6000 }), 'ok');
  assert.equal(chatCalls().length, 1);
  const body = JSON.parse(chatCalls()[0].body);
  assert.deepEqual(body.usage, { include: true });
  assert.equal(body.model, 'anthropic/claude-sonnet-4-6');
  assert.equal(body.max_tokens, 6000);
});

test('budget unset, blank, non-numeric, zero, negative or absurd → refused, nothing sent', async () => {
  for (const v of [undefined, '', '  ', 'abc', '0', '-5', '500']) {
    setup({ env: { ...ENV, OPENROUTER_MONTHLY_BUDGET_USD: v } });
    await refused(call(), /not configured/);
  }
  assert.equal(chatCalls().length, 0);
});

test('usage check fails (HTTP error, network error, missing usage_monthly) → refused, nothing sent', async () => {
  harness().fetchRoutes.set('https://openrouter.ai/api/v1/', async (url) =>
    url === KEY_URL ? new Response('down', { status: 500 }) : Response.json({ choices: [] }));
  await refused(call(), /usage check failed/);

  harness().fetchRoutes.set('https://openrouter.ai/api/v1/', async (url) => {
    if (url === KEY_URL) throw new TypeError('fetch failed');
    return Response.json({ choices: [] });
  });
  await refused(call(), /usage check failed/);

  harness().fetchRoutes.set('https://openrouter.ai/api/v1/', async (url) =>
    url === KEY_URL ? Response.json({ data: { usage: 3 } }) : Response.json({ choices: [] }));
  await refused(call(), /usage_monthly unavailable/);
  assert.equal(chatCalls().length, 0);
});

test('worst-case reservation: refused when spend + max possible cost of THIS call would pass the cap', async () => {
  keyData.usage_monthly = 19.95; // 6000 output tokens alone can cost ~$0.099
  await refused(call({ maxTokens: 6000 }), /budget reached/);
  assert.equal(chatCalls().length, 0);
  keyData.usage_monthly = 19.8;
  assert.equal(await call({ maxTokens: 6000 }), 'ok');
});

test('spend not yet visible in OpenRouter usage still counts (lagging counter)', async () => {
  keyData.usage_monthly = 19.7;
  chatCost = 0.25; // first call really cost $0.25, counter has not caught up
  assert.equal(await call({ maxTokens: 6000 }), 'ok');
  await refused(call({ maxTokens: 6000 }), /budget reached/);
  assert.equal(chatCalls().length, 1);
});

test('concurrent calls are serialized: two cannot both pass the same headroom', async () => {
  keyData.usage_monthly = 19.85;
  chatCost = null; // no cost reported → the worst case is booked
  const results = await Promise.allSettled([call({ maxTokens: 6000 }), call({ maxTokens: 6000 })]);
  assert.deepEqual(results.map((r) => r.status).sort(), ['fulfilled', 'rejected']);
  assert.equal(chatCalls().length, 1);
});

test('unknown model price → refused; OpenRouter key credit limit nearly gone → refused', async () => {
  await refused(call({ model: 'openai/gpt-something' }), /No price on file/);
  keyData = { usage_monthly: 1, limit: 5, limit_remaining: 0.01 };
  await refused(call({ maxTokens: 6000 }), /credit limit/);
  assert.equal(chatCalls().length, 0);
});

test('OPENROUTER_BASE_URL may only be a loopback mock (the key is sent there)', async () => {
  for (const bad of ['https://evil.example/api/v1', 'http://169.254.169.254/latest', 'not a url']) {
    setup({ env: { ...ENV, OPENROUTER_BASE_URL: bad } });
    await refused(call());
  }
  assert.equal(harness().fetches.filter((f) => !f.url.startsWith('https://openrouter.ai/')).length, 0);
});

test('budget route: cron auth required; reports numbers only; 503 + allowed:false when unconfirmable', async () => {
  const get = (headers) => budgetRoute.GET(req('/api/cron/openrouter-budget', { headers }));
  assert.equal((await get({})).status, 401);
  assert.equal((await get({ Authorization: 'Bearer wrong' })).status, 401);

  keyData.usage_monthly = 10;
  const ok = await get({ Authorization: `Bearer ${process.env.CRON_SECRET}` });
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.allowed, true);
  assert.equal(body.budgetUsd, 20);
  assert.equal(body.pct, 50);
  assert.ok(!JSON.stringify(body).includes(ENV.OPENROUTER_API_KEY));

  keyData.usage_monthly = 20;
  assert.equal((await (await get({ Authorization: `Bearer ${process.env.CRON_SECRET}` })).json()).allowed, false);

  setup({ env: { ...ENV, OPENROUTER_MONTHLY_BUDGET_USD: undefined } });
  const off = await get({ Authorization: `Bearer ${process.env.CRON_SECRET}` });
  assert.equal(off.status, 503);
  assert.equal((await off.json()).allowed, false);
});
