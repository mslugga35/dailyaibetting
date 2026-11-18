/**
 * src/middleware.ts: the Supabase session is refreshed (rotated cookies written to the
 * response) on tier-gated routes, so an expired access token never turns a paying member
 * into "free"; routes that do their own auth (Stripe webhook, cron, OAuth callback) are skipped.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, cookieUser } from '../harness/helpers.mjs';

const { middleware, config } = await import('../../src/middleware.ts');
const { NextRequest } = await import('next/server');

const ROTATED = [{ name: 'sb-test-auth-token', value: 'rotated-session', options: { path: '/', httpOnly: true, sameSite: 'lax' } }];
const call = (path) => middleware(new NextRequest(`https://dailyai.test${path}`, { headers: { cookie: 'sb-test-auth-token=expired-session' } }));

beforeEach(() => { setup(); cookieUser('u_mw', 'mw@example.test'); });

for (const path of ['/api/consensus', '/api/picks', '/api/daily-bets', '/pricing', '/account', '/api/checkout']) {
  test(`${path}: the session is refreshed and the rotated cookie reaches the browser`, async () => {
    harness().refreshCookies = ROTATED;
    const res = await call(path);
    assert.equal(harness().ssrGetUserCalls, 1, 'getUser() refreshes the session');
    assert.equal(res.cookies.get('sb-test-auth-token')?.value, 'rotated-session');
    assert.equal(res.headers.get('location'), null, 'no redirect');
  });
}

for (const path of ['/api/webhooks/stripe', '/api/cron/grade-picks', '/auth/callback', '/api/subscribe', '/api/blog/sync']) {
  test(`${path}: skipped (route handles its own auth; no session work)`, async () => {
    harness().refreshCookies = ROTATED;
    const res = await call(path);
    assert.equal(harness().ssrGetUserCalls, 0);
    assert.equal(res.cookies.get('sb-test-auth-token'), undefined);
  });
}

test('an auth outage during refresh does not throw or block the request', async () => {
  harness().authOutage = true;
  const res = await call('/api/consensus');
  assert.ok(res, 'a response is returned');
  assert.equal(res.headers.get('location'), null);
});

test('matcher: runs on pages and tier-gated APIs, not on static assets', () => {
  const re = new RegExp(`^${config.matcher[0]}$`);
  for (const p of ['/', '/pricing', '/api/consensus', '/api/picks', '/api/daily-bets', '/admin/grading']) assert.ok(re.test(p), `should match ${p}`);
  for (const p of ['/_next/static/chunk.js', '/_next/image', '/favicon.ico', '/robots.txt', '/sitemap.xml', '/logo.png']) assert.ok(!re.test(p), `should skip ${p}`);
});

for (const path of ['/blog/%E0%A4%A', '/cappers/%zz', '/picks/%']) {
  test(`${path}: malformed percent-escape → plain 404, no session work`, async () => {
    const res = await call(path);
    assert.equal(res.status, 404);
    assert.equal(harness().ssrGetUserCalls, 0);
  });
}

test('a valid encoded path still passes through with the session refreshed', async () => {
  harness().refreshCookies = ROTATED;
  const res = await call('/blog/caf%C3%A9-picks');
  assert.notEqual(res.status, 404);
  assert.equal(harness().ssrGetUserCalls, 1);
});

test('next.config: blog-linked short paths redirect permanently to real pages', async () => {
  const { default: cfg } = await import('../../next.config.ts');
  const r = await cfg.redirects();
  const find = (s) => r.find((x) => x.source === s);
  assert.deepEqual([find('/ncaab-picks')?.destination, find('/ncaab-picks')?.permanent], ['/picks/ncaab', true]);
  assert.deepEqual([find('/consensus-picks')?.destination, find('/consensus-picks')?.permanent], ['/consensus', true]);
});
