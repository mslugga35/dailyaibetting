/**
 * DAI-26: one transactional Resend welcome email per NEW signup, signed unsubscribe, no bulk sends.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tok = await import('../../src/lib/email/unsubscribe-token.ts');
const w = await import('../../src/lib/email/welcome.ts');
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const SUB = read('src/app/api/subscribe/route.ts');
const UNSUB = read('src/app/api/unsubscribe/route.ts');
const PAGE = read('src/app/unsubscribe/page.tsx');

const SECRET = 'test-secret-not-real';
const ID = '3f2b8c1e-5d4a-4b6f-9e21-0a1b2c3d4e5f';

test('token: round trip, wrong secret / other id / tampering / junk all rejected', () => {
  const t = tok.signUnsubscribe(ID, SECRET);
  assert.match(t, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(tok.verifyUnsubscribe(ID, t, SECRET), true);
  assert.equal(tok.verifyUnsubscribe(ID, t, 'other-secret'), false);
  assert.equal(tok.verifyUnsubscribe('3f2b8c1e-5d4a-4b6f-9e21-0a1b2c3d4e50', t, SECRET), false);
  assert.equal(tok.verifyUnsubscribe(ID, t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A'), SECRET), false);
  for (const [i, x] of [[null, t], [ID, null], ['not-a-uuid', t], [ID, 'short'], [ID, t + 'x'], [['a'], t]]) {
    assert.equal(tok.verifyUnsubscribe(i, x, SECRET), false);
  }
  assert.equal(tok.verifyUnsubscribe(ID, t, ''), false); // no key configured -> never valid
});

test('unsubscribe URLs carry the row id and token, never an email address', () => {
  const u = tok.unsubscribeUrl(ID, 'https://dailyaibetting.com/', SECRET);
  assert.match(u, /^https:\/\/dailyaibetting\.com\/unsubscribe\?id=[0-9a-f-]{36}&t=[A-Za-z0-9_-]{43}$/);
  assert.match(tok.oneClickUrl(ID, 'https://dailyaibetting.com', SECRET), /^https:\/\/dailyaibetting\.com\/api\/unsubscribe\?id=/);
  assert.doesNotMatch(u, /@|%40/);
});

test('content: confirms the signup, promises no daily email, includes the unsubscribe link', () => {
  const c = w.welcomeEmailContent('https://dailyaibetting.com', 'https://dailyaibetting.com/unsubscribe?id=x&t=y');
  for (const part of [c.html, c.text]) {
    assert.match(part, /unsubscribe\?id=x&t=y/);
    assert.match(part, /haven't launched yet/);
    assert.doesNotMatch(part, /every morning|delivered to your inbox|daily picks in your inbox/i);
  }
  assert.match(c.subject, /email list/);
});

const okFetch = () => {
  const calls = [];
  return { calls, impl: async (url, init) => { calls.push({ url, init }); return new Response('{"id":"x"}', { status: 200 }); } };
};
const opts = (f) => ({ fetchImpl: f.impl, apiKey: 're_test', from: 'hello@dailyaibetting.com', signingSecret: SECRET, siteUrl: 'https://dailyaibetting.com' });

test('send: one request to Resend, one recipient, idempotency key per row, one-click headers', async () => {
  const f = okFetch();
  await w.sendWelcomeEmail({ id: ID, email: 'person@example.com' }, opts(f));
  assert.equal(f.calls.length, 1);
  const { url, init } = f.calls[0];
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(init.headers['Idempotency-Key'], `dailyai-welcome-${ID}`);
  const body = JSON.parse(init.body);
  assert.deepEqual(body.to, ['person@example.com']);
  assert.equal(body.from, 'DailyAI Betting <hello@dailyaibetting.com>');
  assert.match(body.headers['List-Unsubscribe'], /^<https:\/\/dailyaibetting\.com\/api\/unsubscribe\?id=/);
  assert.equal(body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.equal('bcc' in body || 'cc' in body, false);
});

test('send: Resend error throws (caller logs); missing config throws before any request', async () => {
  const bad = { calls: [], impl: async () => { bad.calls.push(1); return new Response('nope', { status: 422 }); } };
  await assert.rejects(w.sendWelcomeEmail({ id: ID, email: 'a@b.co' }, opts(bad)), /Resend 422/);
  const f = okFetch();
  await assert.rejects(w.sendWelcomeEmail({ id: ID, email: 'a@b.co' }, { ...opts(f), apiKey: '' }), /not set/);
  assert.equal(f.calls.length, 0);
});

test('subscribe route: welcome only for a row this request inserted; repeat signup is not an error', () => {
  assert.match(SUB, /\.select\('id'\)\s*\n\s*\.maybeSingle\(\)/);
  assert.doesNotMatch(SUB, /\.single\(\)/);
  assert.doesNotMatch(SUB, /N8N_WELCOME_EMAIL_WEBHOOK|triggerWelcomeEmail|< 5000/);
  const start = SUB.indexOf('if (inserted?.id) {');
  const elseAt = SUB.indexOf('} else {', start);
  assert.ok(start > 0 && elseAt > start);
  assert.match(SUB.slice(start, elseAt), /await sendWelcomeEmail\(\{ id: inserted\.id, email \}\)/);
  const elseBranch = SUB.slice(elseAt, SUB.indexOf('return NextResponse.json({ success: true })'));
  assert.doesNotMatch(elseBranch, /sendWelcomeEmail/);
  assert.match(elseBranch, /update\(\{ unsubscribed_at: null \}\)/);
  assert.equal((SUB.match(/sendWelcomeEmail\(/g) ?? []).length, 1);
  // the failure log never contains the address
  assert.match(SUB, /console\.error\(`\[subscribe\] welcome email not sent: \$\{errText\(e\)\}`\)/);
});

test('unsubscribe route: POST only, verifies the token before writing, soft unsubscribe (no delete)', () => {
  assert.doesNotMatch(UNSUB, /export async function GET/);
  assert.ok(UNSUB.indexOf('verifyUnsubscribe(id, t)') > 0);
  assert.ok(UNSUB.indexOf('verifyUnsubscribe(id, t)') < UNSUB.indexOf('.update('));
  assert.match(UNSUB, /\.update\(\{ unsubscribed_at: new Date\(\)\.toISOString\(\) \}\)/);
  assert.match(UNSUB, /\.is\('unsubscribed_at', null\)/);
  assert.doesNotMatch(UNSUB, /\.delete\(/);
  assert.match(UNSUB, /rateLimitGuard\(request, 20, 60_000, 'unsubscribe'\)/);
});

test('unsubscribe page: opening it writes nothing; the button posts to the API; noindex', () => {
  assert.doesNotMatch(PAGE, /getSupabaseAdmin|\.update\(/);
  assert.match(PAGE, /<form method="post" action="\/api\/unsubscribe"/);
  assert.match(PAGE, /robots: \{ index: false, follow: false \}/);
});

const srcFiles = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? srcFiles(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
});
const SRC_DIR = fileURLToPath(new URL('../../src', import.meta.url));

test('no bulk path: only the subscribe route sends the welcome email; account creation never subscribes', () => {
  const files = srcFiles(SRC_DIR).map((p) => ({ p: p.replace(/\\/g, '/'), s: readFileSync(p, 'utf8') }));
  const rel = (p) => p.slice(p.lastIndexOf('/src/') + 1);
  const senders = files.filter((f) => /sendWelcomeEmail\(/.test(f.s) && !f.p.endsWith('lib/email/welcome.ts')).map((f) => rel(f.p));
  assert.deepEqual(senders, ['src/app/api/subscribe/route.ts']);
  const writers = files.filter((f) => /from\('email_subscribers'\)/.test(f.s)).map((f) => rel(f.p)).sort();
  assert.deepEqual(writers, ['src/app/api/subscribe/route.ts', 'src/app/api/unsubscribe/route.ts']);
});

test('falsifier: the old route shape is caught by the route checks', () => {
  const OLD = 'const isNew = row?.subscribed_at && (Date.now() - new Date(row.subscribed_at).getTime()) < 5000; triggerWelcomeEmail(email); .single()';
  assert.match(OLD, /N8N_WELCOME_EMAIL_WEBHOOK|triggerWelcomeEmail|< 5000/);
  assert.match(OLD, /\.single\(\)/);
});
