/**
 * DAI-26: one transactional Resend welcome email per NEW signup, signed unsubscribe, no bulk sends.
 * Behaviour is tested through the injectable actions; the routes are only checked for wiring.
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
const MW = read('src/middleware.ts');

const S = { derivedFrom: 'test-service-key-not-real' };
const ID = '3f2b8c1e-5d4a-4b6f-9e21-0a1b2c3d4e5f';
const OTHER_ID = '3f2b8c1e-5d4a-4b6f-9e21-0a1b2c3d4e50';

// ── token ───────────────────────────────────────────────────────────────────
test('token: round trip; wrong key / other id / tampering / junk / no key all rejected', () => {
  const t = tok.signUnsubscribe(ID, S);
  assert.match(t, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(tok.verifyUnsubscribe(ID, t, S), true);
  assert.equal(tok.verifyUnsubscribe(ID, t, { derivedFrom: 'other' }), false);
  assert.equal(tok.verifyUnsubscribe(OTHER_ID, t, S), false);
  assert.equal(tok.verifyUnsubscribe(ID, t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A'), S), false);
  for (const [i, x] of [[null, t], [ID, null], ['not-a-uuid', t], [ID, 'short'], [ID, t + 'x'], [['a'], t]]) {
    assert.equal(tok.verifyUnsubscribe(i, x, S), false);
  }
  assert.equal(tok.verifyUnsubscribe(ID, t, {}), false);
  assert.throws(() => tok.signUnsubscribe(ID, {}), /unavailable/);
});

test('token: adding a dedicated key later keeps links signed with the derived key working', () => {
  const old = tok.signUnsubscribe(ID, S);
  const both = { dedicated: 'dedicated-key', derivedFrom: S.derivedFrom };
  assert.equal(tok.verifyUnsubscribe(ID, old, both), true);
  const fresh = tok.signUnsubscribe(ID, both);
  assert.notEqual(fresh, old); // new links use the dedicated key
  assert.equal(tok.verifyUnsubscribe(ID, fresh, both), true);
  assert.equal(tok.verifyUnsubscribe(ID, fresh, { dedicated: 'dedicated-key' }), true); // survives service-key rotation
});

test('unsubscribe URLs carry the row id and token, never an email address', () => {
  const u = tok.unsubscribeUrl(ID, 'https://dailyaibetting.com/', S);
  assert.match(u, /^https:\/\/dailyaibetting\.com\/unsubscribe\?id=[0-9a-f-]{36}&t=[A-Za-z0-9_-]{43}$/);
  assert.match(tok.oneClickUrl(ID, 'https://dailyaibetting.com', S), /^https:\/\/dailyaibetting\.com\/api\/unsubscribe\?id=/);
  assert.doesNotMatch(u, /@|%40/);
});

// ── addresses and caps ──────────────────────────────────────────────────────
test('address rule: plain mailboxes only (display-name / bracket / list tricks rejected)', () => {
  assert.equal(act.normalizeSignupAddress('  Person.Name+x@Example.COM '), 'person.name+x@example.com');
  for (const bad of ['a<victim@x.com>', 'victim@x.com>', '"a"@x.com', 'a@x.com,b@y.com', 'a b@x.com', 'a@@x.com',
                     'a..b@x.com', '.a@x.com', 'a@x', 'a@-x.com', `${'a'.repeat(65)}@x.com`, `a@${'b'.repeat(250)}.com`, 42, null]) {
    assert.equal(act.normalizeSignupAddress(bad), null, String(bad));
  }
});

test('canonical mailbox: +tags and Gmail dots collapse to one mailbox', () => {
  assert.equal(act.canonicalMailbox('v.i.c.t.i.m+1@gmail.com'), 'victim@gmail.com');
  assert.equal(act.canonicalMailbox('victim+promo@googlemail.com'), 'victim@gmail.com');
  assert.equal(act.canonicalMailbox('first.last+x@example.com'), 'first.last@example.com');
});

test('throttle: one welcome per mailbox per 24 h however it is spelled; global hourly ceiling', () => {
  let now = 0;
  const th = new act.WelcomeThrottle(3, 24 * 3600_000, () => now);
  assert.equal(th.allow('victim@gmail.com'), true);
  assert.equal(th.allow('vic.tim+2@gmail.com'), false);
  assert.equal(th.allow('a@x.com'), true);
  assert.equal(th.allow('b@x.com'), true);
  assert.equal(th.allow('c@x.com'), false); // hourly ceiling (3) reached
  now += 3600_000;
  assert.equal(th.allow('c@x.com'), true);
  assert.equal(th.allow('victim+3@gmail.com'), false); // still inside 24 h
  now += 24 * 3600_000;
  assert.equal(th.allow('victim+3@gmail.com'), true);
});

// ── content and sender ──────────────────────────────────────────────────────
test('content: confirms the signup, promises no daily email, unsubscribe link in HTML (escaped) and text', () => {
  const c = w.welcomeEmailContent('https://dailyaibetting.com', 'https://dailyaibetting.com/unsubscribe?id=x&t=y');
  assert.match(c.html, /href="https:\/\/dailyaibetting\.com\/unsubscribe\?id=x&amp;t=y"/);
  assert.match(c.text, /unsubscribe\?id=x&t=y/);
  for (const part of [c.html, c.text]) {
    assert.match(part, /haven't launched yet/);
    assert.doesNotMatch(part, /every morning|delivered to your inbox|daily picks in your inbox/i);
  }
  assert.match(c.subject, /email list/);
});

const okFetch = () => {
  const calls = [];
  return { calls, impl: async (url, init) => { calls.push({ url, init }); return new Response('{"id":"x"}', { status: 200 }); } };
};
const opts = (f, extra = {}) => ({ fetchImpl: f.impl, apiKey: 're_test', from: 'hello@dailyaibetting.com', signingSecrets: S, siteUrl: 'https://dailyaibetting.com', ...extra });

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
  const g = okFetch();
  await w.sendWelcomeEmail({ id: ID, email: 'p@example.com' }, opts(g, { from: 'DailyAI <hello@dailyaibetting.com>' }));
  assert.equal(JSON.parse(g.calls[0].init.body).from, 'DailyAI <hello@dailyaibetting.com>'); // not double-wrapped
});

test('send: Resend error throws (caller logs); missing config throws before any request', async () => {
  const bad = { calls: [], impl: async () => { bad.calls.push(1); return new Response('nope', { status: 422 }); } };
  await assert.rejects(w.sendWelcomeEmail({ id: ID, email: 'a@b.co' }, opts(bad)), /Resend 422/);
  const f = okFetch();
  await assert.rejects(w.sendWelcomeEmail({ id: ID, email: 'a@b.co' }, opts(f, { apiKey: '' })), /not set/);
  assert.equal(f.calls.length, 0);
});

// ── signup decisions ────────────────────────────────────────────────────────
const fakeSignup = ({ insertedId = null, insertError = null, sendError = null, allow = true } = {}) => {
  const log = []; const sent = []; const deferred = [];
  return {
    log, sent, deferred,
    run: async () => { for (const d of deferred.splice(0)) await d(); },
    deps: {
      insertIfNew: async () => ({ id: insertedId, error: insertError }),
      sendWelcome: async (sub) => { sent.push(sub); if (sendError) throw new Error(sendError); },
      defer: (task) => deferred.push(task),
      throttle: { allow: () => allow },
      log: (m) => log.push(m),
    },
  };
};

test('signup: a NEW row schedules exactly one welcome email AFTER the response', async () => {
  const n = fakeSignup({ insertedId: ID });
  assert.equal(await act.handleSignup('new@example.com', n.deps), 'created');
  assert.deepEqual(n.sent, []); // nothing sent before the response
  assert.equal(n.deferred.length, 1);
  await n.run();
  assert.deepEqual(n.sent, [{ id: ID, email: 'new@example.com' }]);
});

test('signup: an existing address gets no email and its earlier unsubscribe is NOT undone', async () => {
  const e = fakeSignup({ insertedId: null });
  assert.equal(await act.handleSignup('old@example.com', e.deps), 'existing');
  assert.equal(e.deferred.length, 0);
  assert.equal('resubscribe' in e.deps, false);
  const src = read('src/lib/email/subscription-actions.ts');
  assert.doesNotMatch(src, /unsubscribed_at/); // the signup path never touches the opt-out
  assert.doesNotMatch(SUB, /unsubscribed_at/);
});

test('signup: over the send cap the signup stands, no email is scheduled', async () => {
  const c = fakeSignup({ insertedId: ID, allow: false });
  assert.equal(await act.handleSignup('x@example.com', c.deps), 'created');
  assert.equal(c.deferred.length, 0);
  assert.deepEqual(c.log, ['[subscribe] welcome email skipped: send cap reached']);
});

test('signup: a send failure is logged once without the address and not retried', async () => {
  const f = fakeSignup({ insertedId: ID, sendError: 'Resend 422' });
  await act.handleSignup('who@example.com', f.deps);
  await f.run();
  assert.equal(f.sent.length, 1);
  assert.deepEqual(f.log, ['[subscribe] welcome email not sent: Resend 422']);
  assert.doesNotMatch(f.log.join(' '), /who@example\.com/);
});

test('signup: a DB error sends nothing and reports an error', async () => {
  const f = fakeSignup({ insertError: 'boom' });
  assert.equal(await act.handleSignup('x@example.com', f.deps), 'error');
  assert.equal(f.deferred.length, 0);
});

// ── unsubscribe decisions ───────────────────────────────────────────────────
test('unsubscribe: nothing is written unless the signed token matches the row', async () => {
  const writes = [];
  const mark = async (id) => { writes.push(id); return { error: null }; };
  const t = tok.signUnsubscribe(ID, S);
  assert.equal(await act.handleUnsubscribe(ID, 'x'.repeat(43), mark, S), 'invalid');
  assert.equal(await act.handleUnsubscribe(OTHER_ID, t, mark, S), 'invalid');
  assert.equal(await act.handleUnsubscribe(null, null, mark, S), 'invalid');
  assert.deepEqual(writes, []);
  assert.equal(await act.handleUnsubscribe(ID, t, mark, S), 'ok');
  assert.deepEqual(writes, [ID]);
  assert.equal(await act.handleUnsubscribe(ID, t, async () => ({ error: 'db' }), S), 'error');
});

test('request parsing: RFC 8058 one-click (no source field) reads id/t from the query', () => {
  const url = new URL(`https://dailyaibetting.com/api/unsubscribe?id=${ID}&t=TOKEN`);
  const oneClick = new FormData(); oneClick.set('List-Unsubscribe', 'One-Click');
  assert.deepEqual(act.parseUnsubscribeRequest(url, oneClick), { id: ID, t: 'TOKEN', fromForm: false });
  assert.deepEqual(act.parseUnsubscribeRequest(url, null), { id: ID, t: 'TOKEN', fromForm: false }); // malformed body
  const spoof = new FormData(); spoof.set('id', OTHER_ID); spoof.set('t', 'X'); // body ignored without source=page
  assert.deepEqual(act.parseUnsubscribeRequest(url, spoof), { id: ID, t: 'TOKEN', fromForm: false });
});

test('request parsing: the site form (source=page) supplies id/t in the body', () => {
  const url = new URL('https://dailyaibetting.com/api/unsubscribe');
  const page = new FormData(); page.set('source', 'page'); page.set('id', ID); page.set('t', 'TOKEN');
  assert.deepEqual(act.parseUnsubscribeRequest(url, page), { id: ID, t: 'TOKEN', fromForm: true });
  const fileField = new FormData(); fileField.set('source', 'page'); fileField.set('id', new Blob(['x'])); fileField.set('t', 'T');
  assert.equal(act.parseUnsubscribeRequest(url, fileField).id, null);
});

test('responses: form posts always 303 to the page (relative), one-click gets JSON', () => {
  assert.deepEqual(act.unsubscribeResponse('ok', true), { status: 303, location: '/unsubscribe?done=1' });
  assert.deepEqual(act.unsubscribeResponse('invalid', true), { status: 303, location: '/unsubscribe?error=invalid' });
  assert.deepEqual(act.unsubscribeResponse('error', true), { status: 303, location: '/unsubscribe?error=error' });
  assert.equal(act.unsubscribeResponse('ok', false).status, 200);
  assert.equal(act.unsubscribeResponse('invalid', false).status, 400);
  assert.equal(act.unsubscribeResponse('error', false).status, 500);
});

// ── wiring ──────────────────────────────────────────────────────────────────
test('subscribe route: scoped rate limit, strict address, insert-or-ignore + maybeSingle, send after response', () => {
  assert.match(SUB, /rateLimitGuard\(request, 5, 60_000, 'subscribe'\)/);
  assert.match(SUB, /const email = normalizeSignupAddress\(body\?\.email\)/);
  assert.match(SUB, /ignoreDuplicates: true[\s\S]*\.select\('id'\)\s*\n\s*\.maybeSingle\(\)/);
  assert.match(SUB, /defer: \(task\) => after\(task\)/);
  assert.match(SUB, /throttle: welcomeThrottle/);
  assert.doesNotMatch(SUB, /\.single\(\)|N8N_WELCOME_EMAIL_WEBHOOK|GOOGLE_SHEET_WEBHOOK|triggerWelcomeEmail|< 5000/);
});

test('unsubscribe route: POST only, soft update, only failed tokens rate-limited, exempt from session middleware', () => {
  assert.doesNotMatch(UNSUB, /export async function GET|\.delete\(/);
  assert.match(UNSUB, /\.is\('unsubscribed_at', null\)/);
  assert.match(UNSUB, /if \(result === 'invalid'\) \{\s*\n\s*const limited = rateLimitGuard\(request, 20, 60_000, 'unsubscribe-invalid'\)/);
  assert.match(UNSUB, /unsubscribeResponse\(result, req\.fromForm\)/);
  assert.match(MW, /pathname === '\/api\/unsubscribe' \|\|/);
});

test('unsubscribe page: opening it writes nothing; the button posts to the API; error state; noindex', () => {
  assert.doesNotMatch(PAGE, /getSupabaseAdmin|\.update\(/);
  assert.match(PAGE, /<form method="post" action="\/api\/unsubscribe"/);
  assert.match(PAGE, /data-testid="unsubscribe-error"/);
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

test('falsifier: the old route shape is caught by the wiring checks', () => {
  const OLD = 'const isNew = row?.subscribed_at && (Date.now() - new Date(row.subscribed_at).getTime()) < 5000; triggerWelcomeEmail(email); .single()';
  assert.match(OLD, /\.single\(\)|N8N_WELCOME_EMAIL_WEBHOOK|GOOGLE_SHEET_WEBHOOK|triggerWelcomeEmail|< 5000/);
});
