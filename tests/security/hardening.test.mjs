/**
 * Notification webhook URL pinning and checkout rate limits (per account, per guest email).
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, req, quietly, bearerUser } from '../harness/helpers.mjs';

const notifications = await import('../../src/app/api/notifications/route.ts');
const checkoutRoute = await import('../../src/app/api/checkout/route.ts');

beforeEach(() => { setup(); });

const notify = (body) => quietly(() => notifications.POST(req('/api/notifications', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, 'content-type': 'application/json' },
  body,
})));

// Fake endpoints are assembled at runtime (no webhook-shaped literals in source).
const DC = ['discord', 'com'].join('.');
const HOOK = ['', 'api', 'webhooks', '1', 'fake'].join('/');
const TG = ['api', 'telegram', 'org'].join('.');

test('notifications: only the platform own webhook endpoint is accepted (host + path + https, no creds/port)', async () => {
  const bad = [
    ['discord', `https://${DC}/attachments/1/2`],            // right host, wrong path
    ['discord', `https://evil.test${HOOK}`],                 // wrong host
    ['discord', `http://${DC}${HOOK}`],                      // not https
    ['discord', `https://${DC}:8443${HOOK}`],                // port
    ['discord', `https://user:pw@${DC}${HOOK}`],             // credentials
    ['discord', `https://${TG}/bot1:abc/sendMessage`],       // the other platform's host
    ['telegram', `https://${TG}/bot1:abc/deleteWebhook`],    // wrong method path
    ['slack', `https://hooks.example.test/services/x`],      // unknown platform
    ['discord', `https://${DC}.evil.test${HOOK}`],           // suffix trick
  ];
  for (const [platform, webhookUrl] of bad) {
    const res = await notify({ platform, webhookUrl });
    assert.equal(res.status, 400, `${platform} ${webhookUrl} -> ${res.status}`);
  }
});

test('checkout: a signed-in account is rate-limited (each attempt can create a Stripe session)', async () => {
  const u = bearerUser('u_spam_co');
  const statuses = [];
  for (let i = 0; i < 12; i++) {
    const res = await quietly(() => checkoutRoute.POST(req('/api/checkout', { method: 'POST', body: {}, headers: { ...u.headers, 'x-forwarded-for': `203.0.113.${i}` } })));
    statuses.push(res.status);
  }
  assert.ok(statuses.slice(0, 10).every((s) => s !== 429), statuses.join(','));
  assert.ok(statuses.slice(10).every((s) => s === 429), statuses.join(','));
});


test('notifications: a well-formed platform webhook passes URL validation (the allowlist is not reject-everything)', async () => {
  for (const [platform, webhookUrl] of [['discord', `https://${DC}${HOOK}`], ['telegram', `https://${TG}/bot123:abc/sendMessage`]]) {
    const res = await notify({ platform, webhookUrl });
    const b = await res.json().catch(() => ({}));
    assert.doesNotMatch(String(b.error ?? ''), /Invalid/, `${platform} rejected as invalid`);
  }
});


test('public capper profile never lists an ungraded (live) pick; graded history stays visible', async () => {
  const cappers = await import('../../src/app/api/cappers/route.ts');
  const { harness } = await import('../harness/helpers.mjs');
  harness().db.seed('hb_capper_stats', [{ capper_id: 'c1', slug: 'sharp-sam', name: 'Sharp Sam', wins: 3, losses: 1, pushes: 0, units_won: 2, current_streak: 2, sport_records: { nba: '3-1 (75.0%)' }, units_wagered: 4, avg_odds: -110, roi: 12.5 }]);
  harness().db.seed('hb_picks', [
    { id: 'p1', capper_id: 'c1', sport: 'nba', team: 'Lakers', line: '-3', odds: -110, pick_type: 'spread', result: 'win', posted_at: '2026-11-09T15:00:00Z' },
    { id: 'p2', capper_id: 'c1', sport: 'nba', team: 'Knicks', line: null, odds: -120, pick_type: 'moneyline', result: 'pending', posted_at: '2026-11-11T15:00:00Z' },
  ]);
  // Pick detail is Pro (QA 2026-11-19): read it as a Pro member.
  const { bearerUser, seedSubscription } = await import('../harness/helpers.mjs');
  const pro = bearerUser('user_pro_cap');
  seedSubscription({ userId: pro.id });
  const res = await quietly(() => cappers.GET(req('/api/cappers?view=profile&slug=sharp-sam', { headers: pro.headers })));
  const b = await res.json();
  const picks = (b.capper ?? b.data ?? b).recent_picks;
  assert.ok(Array.isArray(picks), `profile shape: ${JSON.stringify(b).slice(0, 200)}`);
  assert.deepEqual(picks.map((p) => p.id), ['p1']);
  // Signed out: the record stays public, the pick-by-pick detail does not reach the client.
  const anon = (await (await quietly(() => cappers.GET(req('/api/cappers?view=profile&slug=sharp-sam')))).json()).data;
  assert.equal(anon.record, '3-1');
  assert.deepEqual([anon.recent_picks, anon.by_sport, anon.recent_form], [[], [], '']);
  for (const k of ['sport_records', 'units_wagered', 'avg_odds', 'roi']) assert.equal(k in anon, false, `${k} must not reach a non-Pro viewer`);
});

test('rate limit (QA 2026-11-19): each public API route has its own per-IP bucket, 60/min, with Retry-After', async () => {
  const { rateLimitGuard } = await import('../../src/lib/api-helpers.ts');
  const r = (path) => new Request(`https://dailyaibetting.com${path}`, { headers: { 'x-forwarded-for': '203.0.113.77' } });
  for (let i = 0; i < 60; i++) assert.equal(rateLimitGuard(r('/api/cappers')), null, `cappers #${i + 1}`);
  const blocked = rateLimitGuard(r('/api/cappers'));
  assert.equal(blocked?.status, 429);
  assert.equal(blocked.headers.get('Retry-After'), '60');
  // Same visitor, another route: not locked out by the first route's traffic.
  assert.equal(rateLimitGuard(r('/api/results')), null);
  assert.equal(rateLimitGuard(r('/api/consensus')), null);
});
