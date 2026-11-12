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

test('guest checkout: one email is rate-limited even when the client IP changes', async () => {
  setup({ env: { GUEST_CHECKOUT_ENABLED: 'true' } });
  const statuses = [];
  for (let i = 0; i < 5; i++) {
    const res = await quietly(() => checkoutRoute.POST(req('/api/checkout', { method: 'POST', body: { guestEmail: 'same@example.test' }, ip: `198.51.100.${i + 20}` })));
    statuses.push(res.status);
  }
  assert.equal(statuses.filter((s) => s === 429).length, 2, statuses.join(','));
});

test('notifications: a well-formed platform webhook passes URL validation (the allowlist is not reject-everything)', async () => {
  for (const [platform, webhookUrl] of [['discord', `https://${DC}${HOOK}`], ['telegram', `https://${TG}/bot123:abc/sendMessage`]]) {
    const res = await notify({ platform, webhookUrl });
    const b = await res.json().catch(() => ({}));
    assert.doesNotMatch(String(b.error ?? ''), /Invalid/, `${platform} rejected as invalid`);
  }
});

test('guest checkout: plus-address variants of one mailbox share the per-email budget', async () => {
  setup({ env: { GUEST_CHECKOUT_ENABLED: 'true' } });
  const statuses = [];
  for (let i = 0; i < 4; i++) {
    const res = await quietly(() => checkoutRoute.POST(req('/api/checkout', { method: 'POST', body: { guestEmail: `box+t${i}@example.test` }, ip: `198.51.100.${i + 60}` })));
    statuses.push(res.status);
  }
  assert.equal(statuses.filter((x) => x === 429).length, 1, statuses.join(','));
});

test('public capper profile never lists an ungraded (live) pick; graded history stays visible', async () => {
  const cappers = await import('../../src/app/api/cappers/route.ts');
  const { harness } = await import('../harness/helpers.mjs');
  harness().db.seed('hb_capper_stats', [{ capper_id: 'c1', slug: 'sharp-sam', name: 'Sharp Sam', wins: 3, losses: 1, pushes: 0, units_won: 2, current_streak: 2 }]);
  harness().db.seed('hb_picks', [
    { id: 'p1', capper_id: 'c1', sport: 'nba', team: 'Lakers', line: '-3', odds: -110, pick_type: 'spread', result: 'win', posted_at: '2026-11-09T15:00:00Z' },
    { id: 'p2', capper_id: 'c1', sport: 'nba', team: 'Knicks', line: null, odds: -120, pick_type: 'moneyline', result: 'pending', posted_at: '2026-11-11T15:00:00Z' },
  ]);
  const res = await quietly(() => cappers.GET(req('/api/cappers?view=profile&slug=sharp-sam')));
  const b = await res.json();
  const picks = (b.capper ?? b.data ?? b).recent_picks;
  assert.ok(Array.isArray(picks), `profile shape: ${JSON.stringify(b).slice(0, 200)}`);
  assert.deepEqual(picks.map((p) => p.id), ['p1']);
});
