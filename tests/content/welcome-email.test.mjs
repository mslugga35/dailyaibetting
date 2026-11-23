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
const act = await import('../../src/lib/email/subscription-actions.ts');
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

const fakeDb = ({ insertedId = null, insertError = null, resubError = null, sendError = null } = {}) => {
  const log = []; const sent = []; const resub = [];
  return {
    log, sent, resub,
    deps: {
      insertIfNew: async () => ({ id: insertedId, error: insertError }),
      resubscribe: async (e) => { resub.push(e); return { error: resubError }; },
      sendWelcome: async (sub) => { sent.push(sub); if (sendError) throw new Error(sendError); },
      log: (m) => log.push(m),
    },
  };
};

test('signup: a NEW row gets exactly one welcome email; an existing address gets none and is re-subscribed', async () => {
  const n = fakeDb({ insertedId: ID });
  assert.equal(await act.handleSignup('new@example.com', n.deps), 'created');
  assert.deepEqual(n.sent, [{ id: ID, email: 'new@example.com' }]);
  assert.deepEqual(n.resub, []);
  const e = fakeDb({ insertedId: null });
  assert.equal(await act.handleSignup('old@example.com', e.deps), 'existing');
  assert.deepEqual(e.sent, []);
  assert.deepEqual(e.resub, ['old@example.com']);
});

test('signup: a send failure keeps the signup, is logged once without the address, and is not retried', async () => {
  const f = fakeDb({ insertedId: ID, sendError: 'Resend 422' });
  assert.equal(await act.handleSignup('who@example.com', f.deps), 'created');
  assert.equal(f.sent.length, 1);
  assert.deepEqual(f.log, ['[subscribe] welcome email not sent: Resend 422']);
  assert.doesNotMatch(f.log.join(' '), /who@example\.com/);
});

test('signup: a DB error sends nothing and reports an error', async () => {
  const f = fakeDb({ insertError: 'boom' });
  assert.equal(await act.handleSignup('x@example.com', f.deps), 'error');
  assert.deepEqual(f.sent, []);
});

test('unsubscribe: nothing is written unless the signed token matches the row', async () => {
  const writes = [];
  const mark = async (id) => { writes.push(id); return { error: null }; };
  const t = tok.signUnsubscribe(ID, SECRET);
  assert.equal(await act.handleUnsubscribe(ID, 'x'.repeat(43), mark, SECRET), 'invalid');
  assert.equal(await act.handleUnsubscribe('3f2b8c1e-5d4a-4b6f-9e21-0a1b2c3d4e50', t, mark, SECRET), 'invalid');
  assert.equal(await act.handleUnsubscribe(null, null, mark, SECRET), 'invalid');
  assert.deepEqual(writes, []);
  assert.equal(await act.handleUnsubscribe(ID, t, mark, SECRET), 'ok');
  assert.deepEqual(writes, [ID]);
  assert.equal(await act.handleUnsubscribe(ID, t, async () => ({ error: 'db' }), SECRET), 'error');
});

test('routes are wired to the tested actions (insert-or-ignore + maybeSingle; soft, POST-only unsubscribe)', () => {
  assert.match(SUB, /await handleSignup\(email, \{/);
  assert.match(SUB, /ignoreDuplicates: true[\s\S]*\.select\('id'\)\s*\n\s*\.maybeSingle\(\)/);
  assert.doesNotMatch(SUB, /\.single\(\)|N8N_WELCOME_EMAIL_WEBHOOK|triggerWelcomeEmail|< 5000/);
  assert.match(UNSUB, /await handleUnsubscribe\(id, t, async \(rowId\)/);
  assert.match(UNSUB, /\.is\('unsubscribed_at', null\)/);
  assert.doesNotMatch(UNSUB, /export async function GET|\.delete\(/);
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
