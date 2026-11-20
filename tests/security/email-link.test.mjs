/**
 * Email sign-in / sign-up links (Nov 19 break-test: no way for a new customer to register,
 * Supabase-sent links never arrive). DailyAI generates the link and sends it via Resend.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lib = await import('../../src/lib/auth/email-link.ts');
const LOGIN = readFileSync(new URL('../../src/app/login/page.tsx', import.meta.url), 'utf8');

test('normalizeEmail accepts real addresses and rejects junk', () => {
  assert.equal(lib.normalizeEmail('  New.Person+tag@Example.COM '), 'new.person+tag@example.com');
  for (const bad of [null, 42, '', 'a@b', 'no-at.example.com', 'a b@example.com', 'x@example.com<script>', 'a@b.c', `${'a'.repeat(250)}@example.com`]) {
    assert.equal(lib.normalizeEmail(bad), null, String(bad));
  }
});

test('callbackUrl only ever lands on our own /auth/callback with a same-site next', () => {
  assert.equal(lib.callbackUrl(undefined), 'https://dailyaibetting.com/auth/callback');
  assert.equal(lib.callbackUrl('/pricing'), 'https://dailyaibetting.com/auth/callback?next=%2Fpricing');
  for (const evil of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', { x: 1 }]) {
    assert.equal(lib.callbackUrl(evil), 'https://dailyaibetting.com/auth/callback', JSON.stringify(evil));
  }
});

test('generateEmailLink: emails OUR confirm page (token_hash), never the consumable Supabase verify URL (DAI-05)', async () => {
  const calls = [];
  const admin = (result) => ({ auth: { admin: { generateLink: async (a) => { calls.push(a); return result; } } } });
  const H = 'a'.repeat(56);
  const ok = await lib.generateEmailLink(admin({ data: { properties: { action_link: 'https://x.supabase.co/auth/v1/verify?t=1', hashed_token: H, verification_type: 'signup' } }, error: null }), 'n@example.com', '/pricing');
  assert.deepEqual(ok, { actionLink: `https://dailyaibetting.com/auth/confirm?token_hash=${H}&type=signup&next=%2Fpricing`, isNew: true });
  assert.doesNotMatch(ok.actionLink, /supabase|\/verify/);
  assert.equal(calls[0].type, 'magiclink');
  const existing = await lib.generateEmailLink(admin({ data: { properties: { hashed_token: H, verification_type: 'magiclink' } }, error: null }), 'e@example.com');
  assert.equal(existing.isNew, false);
  assert.equal(existing.actionLink, `https://dailyaibetting.com/auth/confirm?token_hash=${H}&type=magiclink`);
  await assert.rejects(lib.generateEmailLink(admin({ data: null, error: { message: 'boom' } }), 'e@example.com'));
  await assert.rejects(lib.generateEmailLink(admin({ data: { properties: { action_link: 'https://x/v' } }, error: null }), 'e@example.com'), /no token/);
  await assert.rejects(lib.generateEmailLink(admin({ data: { properties: { hashed_token: H, verification_type: 'recovery' } }, error: null }), 'e@example.com'));
  await assert.rejects(lib.generateEmailLink(admin({ data: { properties: { hashed_token: 'x"><script>', verification_type: 'magiclink' } }, error: null }), 'e@example.com'));
  for (const evil of ['https://evil.com', '//evil.com', 'javascript:alert(1)']) assert.doesNotMatch(lib.confirmUrl(H, 'magiclink', evil), /evil|javascript/);
});

test('email content escapes the link and uses sign-up wording only for new accounts', () => {
  const n = lib.linkEmailContent('https://x/v?a=1&b="2"', true);
  assert.match(n.subject, /finish creating/);
  assert.match(n.html, /href="https:\/\/x\/v\?a=1&amp;b=&quot;2&quot;"/);
  assert.match(lib.linkEmailContent('https://x/v', false).subject, /sign-in link/);
});

test('sendLinkEmail posts to Resend and throws on failure or missing config', async () => {
  const saved = { fetch: globalThis.fetch, key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM };
  try {
    delete process.env.RESEND_API_KEY;
    await assert.rejects(lib.sendLinkEmail('a@example.com', 'https://x/v', false), /not set/);
    process.env.RESEND_API_KEY = 're_test'; process.env.EMAIL_FROM = 'noreply@example.com';
    let sent;
    globalThis.fetch = async (url, init) => { sent = { url, body: JSON.parse(init.body) }; return { ok: true, status: 200 }; };
    await lib.sendLinkEmail('a@example.com', 'https://x/v', true);
    assert.equal(sent.url, 'https://api.resend.com/emails');
    assert.deepEqual(sent.body.to, ['a@example.com']);
    assert.match(sent.body.text, /https:\/\/x\/v/);
    globalThis.fetch = async () => ({ ok: false, status: 403 });
    await assert.rejects(lib.sendLinkEmail('a@example.com', 'https://x/v', true), /Resend 403/);
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = saved.key;
    if (saved.from === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = saved.from;
  }
});

test('route rejects bad input and limits per address before touching Supabase', async () => {
  const { POST } = await import('../../src/app/api/auth/email-link/route.ts');
  const req = (body, ip) => new Request('https://dailyaibetting.com/api/auth/email-link', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify({ elapsedMs: 5000, ...body }),
  });
  assert.equal((await POST(req({ email: 'nope' }, '10.0.0.1'))).status, 400);
  // 3 per address per hour: the 4th request (from different IPs) sends nothing.
  // The first three get past the limit and fail at Supabase (network is blocked in tests) → 502.
  const statuses = [];
  for (const ip of ['10.0.0.2', '10.0.0.3', '10.0.0.4', '10.0.0.5']) statuses.push((await POST(req({ email: 'limit@example.com' }, ip))).status);
  // Over the limit the route answers ok without trying to send (no 502 from the blocked network).
  assert.deepEqual(statuses, [502, 502, 502, 200]);
  // 10 per IP per 15 minutes (shared household/office IPs), with Retry-After on the 11th.
  const ipStatuses = [];
  let last;
  for (let i = 0; i < 11; i++) { last = await POST(req({ email: `ip${i}@example.com` }, '10.0.0.9')); ipStatuses.push(last.status); }
  assert.equal(ipStatuses.slice(0, 10).includes(429), false);
  assert.equal(ipStatuses[10], 429);
  assert.equal(last.headers.get('Retry-After'), '900');
});

test('bot checks: honeypot or a form filled in under 1.5 s gets ok with no send (never reaches Supabase)', async () => {
  const { POST } = await import('../../src/app/api/auth/email-link/route.ts');
  const req = (body, ip) => new Request('https://dailyaibetting.com/api/auth/email-link', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body),
  });
  // A real send attempt fails at Supabase in tests (network blocked) → 502; a bot-trip answers 200 without trying.
  const cases = [
    [{ email: 'bot1@example.com', website: 'http://spam', elapsedMs: 9000 }, 200],
    [{ email: 'bot2@example.com', elapsedMs: 200 }, 200],
    [{ email: 'bot3@example.com' }, 200],
    [{ email: 'human@example.com', website: '', elapsedMs: 4000 }, 502],
  ];
  let i = 20;
  for (const [body, want] of cases) {
    const r = await POST(req(body, `10.1.0.${i++}`));
    assert.equal(r.status, want, JSON.stringify(body));
    if (want === 200) assert.deepEqual(await r.json(), { ok: true });
  }
  const login = readFileSync(new URL('../../src/app/login/page.tsx', import.meta.url), 'utf8');
  assert.match(login, /JSON\.stringify\(\{ email, next, website, elapsedMs: Date\.now\(\) - shownAt \}\)/);
  assert.match(login, /id="website"[^>]*tabIndex=\{-1\}/);
});

test('login page no longer relies on the Supabase mailer and offers sign-up', () => {
  assert.doesNotMatch(LOGIN, /signInWithOtp/);
  assert.match(LOGIN, /fetch\('\/api\/auth\/email-link'/);
  assert.match(LOGIN, /Create your free account/);
  assert.match(readFileSync(new URL('../../src/app/signup/page.tsx', import.meta.url), 'utf8'), /redirect\('\/login\?mode=signup'\)/);
});
