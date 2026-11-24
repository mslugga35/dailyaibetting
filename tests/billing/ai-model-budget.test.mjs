/**
 * Claude API client (src/lib/utils/ai-model.ts), replacing OpenRouter (2026-11-24).
 * Requirements: zero spend beyond the included API credit; fail closed on anything unconfirmable;
 * a monthly cap enforced on the WORST-CASE cost of each call before it is sent; the real cost from
 * `usage` recorded after; credit exhaustion is a budget stop; never another provider.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setup, harness } from '../harness/helpers.mjs';

const ai = await import('../../src/lib/utils/ai-model.ts');
const budgetRoute = await import('../../src/app/api/cron/openrouter-budget/route.ts');

const MSG_URL = 'https://api.anthropic.com/v1/messages';
let dir;
let ledger;
let reply;
const BASE_ENV = () => ({ ANTHROPIC_API_KEY: 'sk-ant-harness-never-sent', AI_MONTHLY_BUDGET_USD: '15', AI_SPEND_LEDGER_PATH: ledger });
/** setup() resets the harness, so the fake Anthropic endpoint is registered again each time. */
function env(over = {}) {
  setup({ env: { ...BASE_ENV(), ...over } });
  ai._setClientForTests(null);
  harness().fetchRoutes.set('https://api.anthropic.com/', async (url) => (url.startsWith(MSG_URL) ? reply() : new Response('nope', { status: 404 })));
}
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'dai-ai-ledger-'));
  ledger = join(dir, 'sub', 'ai-spend.json');
  reply = () => Response.json({
    id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-sonnet-4-6', stop_reason: 'end_turn',
    content: [{ type: 'text', text: 'report text' }],
    usage: { input_tokens: 10_000, output_tokens: 2_000 },
  });
  env();
});

const calls = () => harness().fetches.filter((f) => f.allowed && String(f.url).startsWith(MSG_URL));
const call = (opts = { maxTokens: 6000 }) => ai.callModel('system', 'user prompt', opts);
const refused = (p, re) => assert.rejects(p, (e) => e.name === 'AiBudgetError' && (!re || re.test(e.message)));
const readL = () => JSON.parse(readFileSync(ledger, 'utf8'));
const month = new Date().toISOString().slice(0, 7);

test('within budget: one Messages call to Anthropic only, text returned, real cost recorded', async () => {
  assert.equal(await call(), 'report text');
  assert.equal(calls().length, 1);
  assert.equal(harness().fetches.filter((f) => /openrouter/.test(String(f.url))).length, 0);
  const body = JSON.parse(calls()[0].body);
  assert.equal(body.model, 'claude-sonnet-4-6');
  assert.equal(body.max_tokens, 6000);
  assert.equal('temperature' in body, false, 'sampling params are rejected by the current API version');
  const l = readL();
  assert.equal(l.month, month);
  assert.ok(Math.abs(l.spentUsd - (10_000 * 3e-6 + 2_000 * 15e-6)) < 1e-9, `recorded ${l.spentUsd}`); // $0.06
  assert.equal(l.calls, 1);
});

test('the worst case of the NEXT call is checked before it is sent (cap reached = no request)', async () => {
  await call();
  writeFileSync(ledger, JSON.stringify({ month, spentUsd: 14.95, calls: 9 }));
  await refused(call(), /Monthly AI budget reached/);
  assert.equal(calls().length, 1, 'no second request');
});

test('fail closed: unset key, unset/invalid cap, unset ledger path, corrupt ledger, unknown model', async () => {
  for (const over of [{ ANTHROPIC_API_KEY: undefined }, { AI_MONTHLY_BUDGET_USD: undefined }, { AI_MONTHLY_BUDGET_USD: '0' },
    { AI_MONTHLY_BUDGET_USD: '2000' }, { AI_MONTHLY_BUDGET_USD: 'abc' }, { AI_SPEND_LEDGER_PATH: undefined }]) {
    env(over);
    await refused(call());
    assert.equal(calls().length, 0, JSON.stringify(over));
  }
  env();
  await call(); // creates the ledger
  writeFileSync(ledger, '{not json');
  await refused(call(), /corrupt/);
  writeFileSync(ledger, JSON.stringify({ month, spentUsd: -5 }));
  await refused(call(), /corrupt/);
  await refused(ai.callModel('s', 'u', { model: 'claude-unknown-9' }), /No price/);
  assert.equal(calls().length, 1);
});

test('a new UTC month starts from zero', async () => {
  await call();
  writeFileSync(ledger, JSON.stringify({ month: '2020-01', spentUsd: 14.99, calls: 99 }));
  assert.equal(await call(), 'report text');
  assert.equal(readL().month, month);
  assert.ok(readL().spentUsd < 1);
});

test('credit exhausted (included credit used up) is a budget stop, with the worst case kept', async () => {
  reply = () => Response.json({ type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } }, { status: 400 });
  await refused(call(), /credit exhausted/i);
  assert.equal(calls().length, 1, 'no retry, no other provider');
  assert.ok(readL().spentUsd >= ai.worstCaseCostUsd('claude-sonnet-4-6', 'system'.length + 'user prompt'.length, 6000) - 1e-9);
});

test('server error: not a budget error, worst case stays reserved, never another provider', async () => {
  reply = () => Response.json({ type: 'error', error: { type: 'api_error', message: 'boom' } }, { status: 500 });
  await assert.rejects(call(), (e) => e.name !== 'AiBudgetError');
  assert.equal(harness().fetches.filter((f) => !String(f.url).startsWith(MSG_URL)).length, 0);
  assert.equal(calls().length, 2, 'the SDK retries a 5xx once (maxRetries 1), on Anthropic only');
  assert.ok(readL().spentUsd > 0);
});

test('refusal stop reason is an error, not content', async () => {
  reply = () => Response.json({ id: 'm', type: 'message', role: 'assistant', model: 'claude-sonnet-4-6', stop_reason: 'refusal', content: [], usage: { input_tokens: 5, output_tokens: 0 } });
  await assert.rejects(call(), /declined/);
});

test('concurrent calls are serialized: two cannot both pass the same check', async () => {
  await call();
  // Room for exactly one more worst-case call.
  const wc = ai.worstCaseCostUsd('claude-sonnet-4-6', 'system'.length + 'user prompt'.length, 6000);
  writeFileSync(ledger, JSON.stringify({ month, spentUsd: 15 - wc * 1.5, calls: 1 }));
  reply = () => Response.json({ id: 'm', type: 'message', role: 'assistant', model: 'claude-sonnet-4-6', stop_reason: 'end_turn', content: [{ type: 'text', text: 'x' }], usage: { input_tokens: 1, output_tokens: 6000 } });
  const r = await Promise.allSettled([call(), call()]);
  assert.deepEqual(r.map((x) => x.status).sort(), ['fulfilled', 'rejected']);
});

test('budget route: cron-only numbers, 503 when unconfirmable, never the key', async () => {
  const { req } = await import('../harness/helpers.mjs');
  const cron = () => ({ headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  assert.equal((await budgetRoute.GET(req('/api/cron/openrouter-budget'))).status, 401);
  const ok = await budgetRoute.GET(req('/api/cron/openrouter-budget', cron()));
  const j = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(j.allowed, true);
  assert.equal(j.budgetUsd, 15);
  assert.doesNotMatch(JSON.stringify(j), /sk-ant/);
  env({ AI_MONTHLY_BUDGET_USD: undefined });
  const bad = await budgetRoute.GET(req('/api/cron/openrouter-budget', cron()));
  assert.equal(bad.status, 503);
  assert.equal((await bad.json()).allowed, false);
  assert.equal(existsSync(ledger), false, 'a budget check never creates or writes the ledger');
});
