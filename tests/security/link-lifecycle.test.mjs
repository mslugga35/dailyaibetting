/**
 * DAI-05 (Muse retest 11-20): sign-in link lifecycle, tested by behaviour, not by source text.
 * Escape being fixed: several links for one address in a short time, emails stacked in one
 * Gmail conversation with identical subjects, and the newest email not reliably the valid one.
 * The fake Supabase issues a NEW token per generateLink and keeps only the newest (like GoTrue).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, req, harness, captureEmails } from '../harness/helpers.mjs';

const tok = await import('../../src/lib/auth/link-token.ts');
const { POST } = await import('../../src/app/api/auth/email-link/route.ts');
const ask = (email, extra = {}) => POST(req('/api/auth/email-link', { method: 'POST', body: { email, elapsedMs: 4000, website: '', ...extra } }));
const tokenOf = (mail) => new URLSearchParams(mail.text.match(/#([^\s]+)/)[1]).get('token_hash');
const userOf = (email) => harness().authUsers.find((u) => u.email === email);

test('cooldown: one claim per key per window, released slots and other keys are independent', () => {
  const c = tok.createLinkCooldown(60_000);
  const t1 = c.claim('a@x.com', 1_000);
  assert.ok(t1);
  assert.equal(c.claim('a@x.com', 1_000), null, 'same instant (double click)');
  assert.equal(c.claim('a@x.com', 60_999), null, 'inside the minute');
  assert.ok(c.claim('b@x.com', 2_000), 'other address unaffected');
  const t2 = c.claim('a@x.com', 61_000);
  assert.ok(t2, 'after the minute');
  c.release('a@x.com', t1);
  assert.equal(c.claim('a@x.com', 61_001), null, "a stale request's failure cannot free the newer request's slot");
  c.release('a@x.com', t2);
  assert.ok(c.claim('a@x.com', 61_002), 'the owner can free it');
});

test('verify errors: only a Supabase rejection reads as "no longer works"; outages keep the link', () => {
  for (const e of [{ status: 403, code: 'otp_expired' }, { code: 'otp_expired' }, { status: 403 }]) assert.equal(tok.classifyVerifyError(e), 'rejected', JSON.stringify(e));
  for (const e of [{ status: 0, name: 'AuthRetryableFetchError' }, { status: 500 }, { status: 502 }, { status: 429 }, new TypeError('Failed to fetch'), null, undefined]) {
    assert.equal(tok.classifyVerifyError(e), 'unreachable', String(JSON.stringify(e)));
  }
});

test('issue time in the link is display-only and rejects junk or future values', () => {
  const now = Date.parse('2026-11-20T16:00:00Z');
  assert.equal(tok.parseSent('1795189800', now)?.toISOString(), '2026-11-20T15:50:00.000Z');
  for (const bad of [null, '', 'abc', '12.5', '-1', '1000', String(Math.floor(now / 1000) + 3600), '<script>']) assert.equal(tok.parseSent(bad, now), null, String(bad));
  assert.equal(tok.sentLabel(new Date('2026-11-20T15:50:00Z')), '10:50 AM ET');
});

test('route: a real request issues one link, emails our confirm page, and the email is the valid token', async () => {
  setup({ env: { EMAIL_FROM: 'picks@dailyai.test' } });
  harness().authUsers.push({ id: 'u_admin', email: 'admin@example.com' });
  const sent = captureEmails();
  const r = await ask('admin@example.com');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  assert.equal(sent.length, 1);
  const m = sent[0];
  assert.deepEqual(m.to, ['admin@example.com']);
  assert.match(m.subject, /^Your DailyAI sign-in link \(sent \d{1,2}:\d{2} [AP]M ET\)$/);
  assert.match(m.headers['X-Entity-Ref-ID'], /^[0-9a-f-]{36}$/);
  assert.match(m.text, /https:\/\/dailyaibetting\.com\/auth\/confirm#token_hash=[A-Za-z0-9_-]{16,}&type=magiclink&sent=\d{10}/);
  assert.doesNotMatch(m.html + m.text, /supabase/);
  assert.equal(tokenOf(m), userOf('admin@example.com').currentLinkToken, 'the emailed token is the one Supabase holds');
});

test('route: a second request within a minute (double click, "send again") sends nothing and keeps the first link valid', async () => {
  setup({ env: { EMAIL_FROM: 'picks@dailyai.test' } });
  harness().authUsers.push({ id: 'u_two', email: 'two@example.com' });
  const sent = captureEmails();
  assert.equal((await ask('two@example.com')).status, 200);
  const first = tokenOf(sent[0]);
  const again = await ask('two@example.com');
  assert.equal(again.status, 200);
  assert.deepEqual(await again.json(), { ok: true }, 'same answer as a send: no hint either way');
  assert.equal(sent.length, 1, 'no second email');
  assert.equal(userOf('two@example.com').currentLinkToken, first, 'the first emailed link was not cancelled');
  assert.equal(harness().db.log.filter((l) => l.op === 'generateLink').length, 1, 'no second token was minted');
});

test('route: overlapping requests for one address mint exactly one token and send exactly one email', async () => {
  setup({ env: { EMAIL_FROM: 'picks@dailyai.test' } });
  harness().authUsers.push({ id: 'u_race', email: 'race@example.com' });
  const sent = captureEmails();
  const rs = await Promise.all([ask('race@example.com'), ask('race@example.com'), ask('race@example.com')]);
  assert.deepEqual(rs.map((r) => r.status), [200, 200, 200]);
  assert.equal(sent.length, 1);
  assert.equal(harness().db.log.filter((l) => l.op === 'generateLink').length, 1);
  assert.equal(tokenOf(sent[0]), userOf('race@example.com').currentLinkToken, 'the only email holds the valid token');
});

test('route: a failed send gives the slot back, so an immediate retry emails a fresh, valid link', async () => {
  setup({ env: { EMAIL_FROM: 'picks@dailyai.test' } });
  harness().authUsers.push({ id: 'u_retry', email: 'retry@example.com' });
  let calls = 0; const sent = [];
  harness().fetchRoutes.set('https://api.resend.com/', async (_u, init) => {
    calls++;
    if (calls === 1) return new Response('{}', { status: 500 });
    sent.push(JSON.parse(init.body));
    return new Response('{"id":"e2"}', { status: 200 });
  });
  const errLog = console.error; console.error = () => {};
  try {
    assert.equal((await ask('retry@example.com')).status, 502);
    assert.equal((await ask('retry@example.com')).status, 200);
  } finally { console.error = errLog; }
  assert.equal(sent.length, 1);
  assert.equal(tokenOf(sent[0]), userOf('retry@example.com').currentLinkToken);
});

test('route: a brand-new address gets the sign-up email for a new, unconfirmed account', async () => {
  setup({ env: { EMAIL_FROM: 'picks@dailyai.test' } });
  const sent = captureEmails();
  assert.equal((await ask('brand.new@example.com')).status, 200);
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /^Confirm your email to finish creating your DailyAI account \(sent /);
  assert.match(sent[0].text, /type=signup/);
  assert.equal(userOf('brand.new@example.com').confirmed, false);
});

test('two links issued at least a cooldown apart never share a subject (Gmail cannot stack them by subject)', async () => {
  const lib = await import('../../src/lib/auth/email-link.ts');
  const base = Date.parse('2026-11-20T15:49:00Z');
  for (let s = 0; s < 60; s++) {
    const a = new Date(base + s * 1000); const b = new Date(a.getTime() + lib.LINK_COOLDOWN_MS);
    assert.notEqual(lib.linkEmailContent('https://x/v', false, a).subject, lib.linkEmailContent('https://x/v', false, b).subject, a.toISOString());
  }
});
