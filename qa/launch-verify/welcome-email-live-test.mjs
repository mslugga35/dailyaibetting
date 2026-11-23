// DAI-26 live test of the welcome email with ONE controlled MailSlurp inbox (ETETEST key). Never a real person.
//   node qa/launch-verify/welcome-email-live-test.mjs [baseUrl]
// Steps: new inbox -> POST /api/subscribe -> the welcome email arrives (From domain, subject, plain text,
// List-Unsubscribe headers, no daily-email promise) -> the same address again: 200 and NO second email ->
// RFC 8058 one-click POST -> 200 -> the confirm page for an invalid token shows the error text.
// Prints PASS/FAIL per check; exit 1 on any failure. The subscriber row stays (marked unsubscribed).
process.loadEnvFile(process.env.MAILSLURP_ENV || 'C:/Users/mpmmo/ETETEST/.env');
const KEY = process.env.MAILSLURP_API_KEY;
if (!KEY) throw new Error('MAILSLURP_API_KEY missing');
const BASE = (process.argv[2] || 'https://dailyaibetting.com').replace(/\/+$/, '');
const api = async (method, path) => {
  const r = await fetch('https://api.mailslurp.com' + path, { method, headers: { 'x-api-key': KEY } });
  const t = await r.text(); if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
};
let fails = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`); if (!ok) fails++; };
const subscribe = (email) => fetch(`${BASE}/api/subscribe`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
});

const inbox = await api('POST', '/inboxes?name=dai26-welcome-test&expiresIn=86400000');
console.log(`inbox ${inbox.id} created ${new Date().toISOString()}`);

const t0 = Date.now();
const r1 = await subscribe(inbox.emailAddress);
check('signup 200 + success', r1.status === 200 && (await r1.json()).success === true, `HTTP ${r1.status}, ${Date.now() - t0} ms`);

let mail = null;
try { mail = await api('GET', `/waitForLatestEmail?inboxId=${inbox.id}&timeout=120000&unreadOnly=true`); } catch (e) { console.log(String(e).slice(0, 200)); }
check('welcome email delivered within 2 min', !!mail, mail ? `received ${mail.createdAt}` : 'none');
if (mail) {
  const full = await api('GET', `/emails/${mail.id}`);
  const h = Object.fromEntries(Object.entries(full.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
  check('From is on dailyaibetting.com', /@dailyaibetting\.com>?$/i.test(full.from || ''), full.from?.replace(/^.*@/, '@'));
  check('subject', /email list/i.test(full.subject || ''), full.subject);
  check('List-Unsubscribe one-click header', /^<https:\/\/dailyaibetting\.com\/api\/unsubscribe\?id=[0-9a-f-]{36}&t=[A-Za-z0-9_-]{43}>$/.test(h['list-unsubscribe'] || ''));
  check('List-Unsubscribe-Post header', h['list-unsubscribe-post'] === 'List-Unsubscribe=One-Click');
  const body = full.body || '';
  check('no daily-email promise', /haven.t launched yet/i.test(body) && !/every morning|delivered to your inbox/i.test(body));
  check('unsubscribe link in body, no email address in it', /\/unsubscribe\?id=[0-9a-f-]{36}&(amp;)?t=/.test(body) && !/unsubscribe\?[^"\s]*(%40|@)/.test(body));
  const auth = `${h['authentication-results'] || ''} ${h['arc-authentication-results'] || ''}`;
  console.log(`info auth: dkim=${/dkim=pass/i.test(auth) ? 'pass' : '?'} spf=${/spf=pass/i.test(auth) ? 'pass' : '?'} dmarc=${(auth.match(/dmarc=(\w+)/i) || [])[1] || 'none'}`);

  const r2 = await subscribe(inbox.emailAddress);
  check('repeat signup 200 + success (same response)', r2.status === 200 && (await r2.json()).success === true, `HTTP ${r2.status}`);
  let second = null;
  try { second = await api('GET', `/waitForLatestEmail?inboxId=${inbox.id}&timeout=60000&unreadOnly=true`); } catch { /* timeout = none */ }
  check('no second email within 60 s', !second);

  const oneClick = (h['list-unsubscribe'] || '').replace(/^<|>$/g, '');
  if (oneClick) {
    const r3 = await fetch(oneClick, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
    check('one-click unsubscribe 200', r3.status === 200, `HTTP ${r3.status}`);
    const id = new URL(oneClick).searchParams.get('id');
    console.log(`info row id ${id} (check unsubscribed_at is set)`);
  }
}
const bad = await fetch(`${BASE}/unsubscribe?id=00000000-0000-0000-0000-000000000000&t=${'x'.repeat(43)}`);
check('invalid link page says invalid', /isn.t valid/.test(await bad.text()));
const fake = await fetch(`${BASE}/api/unsubscribe?id=00000000-0000-0000-0000-000000000000&t=${'x'.repeat(43)}`, { method: 'POST' });
check('forged one-click rejected 400', fake.status === 400, `HTTP ${fake.status}`);
console.log(fails ? `RESULT ${fails} FAIL` : 'RESULT ALL PASS');
process.exit(fails ? 1 : 0);
