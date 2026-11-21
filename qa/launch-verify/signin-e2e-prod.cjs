// DAI-05 end-to-end on PRODUCTION through the real user path (replaces the in-process shortcut checks).
//   phase "request": real /login form in a real browser (no forged API body), per role.
//   (between phases the operator reads the delivered emails and writes links.json: role -> [{subject, threadId, href}])
//   phase "use": opens the delivered links in fresh browsers and checks every page-lifecycle case.
// Every run: refuses to start unless the deployed commit matches, clears its evidence dir, captures console
// errors and all network traffic (fails if the token reaches anything but Supabase's /verify), cross-checks
// auth.audit_log_entries, and exits 1 on any FAIL or a wrong check count. Tokens are never printed.
// Usage:
//   node signin-e2e-prod.cjs request <label> <sha> TWO=<FREE|ADMIN> ONE=<FREE|ADMIN> [DELAY=PRO]
//   node signin-e2e-prod.cjs use     <label> <sha> <links.json> TWO=.. ONE=.. [DELAY=PRO DELAY_MIN=20]
const { chromium } = require('C:/Users/mpmmo/ETETEST/node_modules/playwright');
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const [phase, label, sha, ...rest] = process.argv.slice(2);
const kv = Object.fromEntries(rest.filter((a) => a.includes('=')).map((a) => a.split('=')));
const linksFile = rest.find((a) => !a.includes('='));
const B = 'https://dailyaibetting.com';
const OUT = path.join(__dirname, '..', '..', 'docs', 'launch-evidence', `DAI-05-e2e-${label}-${phase}`);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const envFile = (f) => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.trim().replace(/^"|"$/g, '')]));
const acct = envFile('C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/local-test/TEST-ACCOUNTS.env');
process.loadEnvFile('C:/Users/mpmmo/hiddenbag-v2/.env.local'); // SUPABASE_ACCESS_TOKEN for the read-only audit query
const emailOf = (role) => acct[`DAI_TEST_${role === 'PRO' ? 'PRO' : role}_EMAIL`];
const res = []; const ok = (n, p, i = '') => { res.push({ check: n, pass: !!p, info: String(i).slice(0, 240) }); console.log(`${p ? 'PASS' : 'FAIL'} ${n}${i ? ' :: ' + String(i).slice(0, 240) : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = (t) => crypto.createHash('sha256').update(String(t)).digest('hex').slice(0, 8);
const tokenOf = (href) => new URLSearchParams(String(href).split('#')[1] || '').get('token_hash') || '';
const sentOf = (href) => Number(new URLSearchParams(String(href).split('#')[1] || '').get('sent')) || null;

async function audit(email, sinceIso) {
  const q = `select payload->>'action' a, count(*) n from auth.audit_log_entries where created_at >= '${sinceIso}' and payload->>'actor_username' = '${email}' group by 1`;
  const r = await fetch('https://api.supabase.com/v1/projects/aeeykasmymitzbuhdlfe/database/query', { method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `begin transaction read only; ${q}; rollback;` }) });
  return Object.fromEntries((await r.json()).map((x) => [x.a, Number(x.n)]));
}
// Fresh context per scenario (no shared cookies/storage), with console + network capture.
const tokens = new Set(); const leaks = []; const consoleErrors = [];
async function newCtx(browser, name) {
  const ctx = await browser.newContext();
  ctx.on('request', (rq) => {
    const host = new URL(rq.url()).host; const blob = `${rq.url()} ${rq.headers().referer || ''} ${rq.postData() || ''}`;
    for (const t of tokens) if (t && blob.includes(t)) {
      const allowed = /\.supabase\.co$/.test(host) && /\/auth\/v1\/verify/.test(rq.url()) && !rq.url().includes(t) && !(rq.headers().referer || '').includes(t);
      if (!allowed) leaks.push(`${name}: ${rq.method()} ${host}${new URL(rq.url()).pathname}`);
    }
  });
  ctx.on('page', (p) => { p.on('pageerror', (e) => consoleErrors.push(`${name}: ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${name}: ${m.text().slice(0, 120)} @ ${(m.location().url || '').replace(/[#?].*$/, '').slice(0, 80)}`); }); });
  return ctx;
}
const testid = (pg, id) => pg.getByTestId(id).first().waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false);
async function whoAmI(pg) {
  await pg.goto(`${B}/account`, { waitUntil: 'domcontentloaded' }); await pg.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const t = (await pg.locator('body').innerText()).replace(/\s+/g, ' ');
  return (t.match(/mpm\.morales\+dai[a-z]+@gmail\.com/) || [''])[0];
}

(async () => {
  // Gate: the deployed build must be the one under test.
  const ci = await (await fetch(`${B}/.well-known/commit-info.json`, { cache: 'no-store' })).json();
  if (!sha || !String(ci.commitHash || '').startsWith(sha)) { console.error(`ABORT deployed ${ci.commitHash} != expected ${sha}`); process.exit(2); }
  ok('deployed build is the one under test', true, ci.commitHash);
  const browser = await chromium.launch();
  const started = new Date(Date.now() - 2000).toISOString();
  let EXPECTED;

  if (phase === 'request') {
    // Real form: type the address, wait like a person, press the button. Hidden honeypot left empty.
    async function ask(role, name) {
      const ctx = await newCtx(browser, name); const pg = await ctx.newPage();
      await pg.goto(`${B}/login`, { waitUntil: 'domcontentloaded' }); await pg.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await pg.locator('#email').waitFor({ state: 'visible', timeout: 45000 });
      await pg.locator('#email').fill(emailOf(role));
      await sleep(2500);
      await pg.locator('form button[type="submit"]').first().click();
      const shown = await pg.getByText('Check your inbox').first().waitFor({ timeout: 20000 }).then(() => true, () => false);
      const at = await pg.getByTestId('login-sent-at').first().innerText().catch(() => '');
      await pg.screenshot({ path: path.join(OUT, `${name}.png`) });
      return { ctx, pg, shown, at };
    }
    const two = kv.TWO; const one = kv.ONE;
    // TWO: request, an immediate second request ("Use a different email" -> same address), then a third after 65 s.
    const r1 = await ask(two, `${two}-1`);
    ok(`${two}: real /login form -> "Check your inbox" with the request time`, r1.shown && /Requested at \d{1,2}:\d{2} [AP]M ET/.test(r1.at), r1.at);
    await r1.pg.getByRole('button', { name: 'Use a different email' }).click();
    await r1.pg.locator('#email').waitFor({ state: 'visible', timeout: 20000 }); await r1.pg.locator('#email').fill(emailOf(two)); await sleep(2500);
    await r1.pg.locator('form button[type="submit"]').first().click();
    ok(`${two}: immediate second request shows the same screen (no hint, nothing new sent)`, await r1.pg.getByText('Check your inbox').first().waitFor({ timeout: 20000 }).then(() => true, () => false));
    await r1.ctx.close();
    const r0 = await ask(one, `${one}-1`); ok(`${one}: real /login form -> "Check your inbox"`, r0.shown, r0.at); await r0.ctx.close();
    if (kv.DELAY) { const rd = await ask(kv.DELAY, `${kv.DELAY}-1`); ok(`${kv.DELAY}: real /login form -> "Check your inbox"`, rd.shown, rd.at); await rd.ctx.close(); }
    await sleep(65000);
    const r2 = await ask(two, `${two}-2`); ok(`${two}: request after 65 s accepted`, r2.shown, r2.at); await r2.ctx.close();
    await sleep(4000);
    const a2 = await audit(emailOf(two), started); const a1 = await audit(emailOf(one), started);
    ok(`${two}: audit shows exactly 2 links minted for 3 requests (duplicate suppressed)`, a2.user_recovery_requested === 2, JSON.stringify(a2));
    ok(`${one}: audit shows exactly 1 link minted`, a1.user_recovery_requested === 1, JSON.stringify(a1));
    EXPECTED = 7 + (kv.DELAY ? 1 : 0);
  } else if (phase === 'use') {
    const links = JSON.parse(fs.readFileSync(linksFile, 'utf8'));
    for (const role of Object.keys(links)) for (const m of links[role]) tokens.add(tokenOf(m.href));
    const two = kv.TWO; const one = kv.ONE;
    // Delivered-email checks: our confirm page, sent time present, every email its own subject and Gmail conversation.
    const all = Object.values(links).flat();
    ok('every delivered link is https://dailyaibetting.com/auth/confirm#token_hash=..&sent=..', all.every((m) => /^https:\/\/dailyaibetting\.com\/auth\/confirm#token_hash=[A-Za-z0-9_-]{16,}&type=(magiclink|signup)&sent=\d{10}$/.test(m.href)), all.map((m) => tag(tokenOf(m.href))).join(','));
    // Subjects only need to differ per ADDRESS (one link a minute each); different accounts may share a minute.
    ok('no two emails to the same address share a subject', Object.values(links).every((ms) => new Set(ms.map((m) => m.subject)).size === ms.length), Object.entries(links).map(([r, ms]) => `${r}: ${ms.map((m) => m.subject.replace(/^.*\(sent /, '').replace(')', '')).join(', ')}`).join(' | '));
    ok('no two emails share a Gmail conversation', new Set(all.map((m) => m.threadId)).size === all.length, all.map((m) => m.threadId).join(','));
    const [older, newer] = [...links[two]].sort((x, y) => sentOf(x.href) - sentOf(y.href));
    // Scanner-style GET first (no JS, like a mail security scanner): must not spend anything.
    for (const m of all) await fetch(m.href.split('#')[0] + '?scan=1', { redirect: 'follow' });
    // Muse's exact sequence, in ONE tab: older link -> pressed -> refused; newer link opened in the same tab -> works.
    { const ctx = await newCtx(browser, `${two}-same-tab`); const pg = await ctx.newPage();
      await pg.goto(older.href); ok(`${two}: older link shows its own send time`, await testid(pg, 'confirm-sent'), await pg.getByTestId('confirm-sent').innerText().catch(() => ''));
      ok(`${two}: token scrubbed from the address bar on load`, !pg.url().includes('token_hash'), pg.url());
      await pg.getByTestId('confirm-signin').click();
      ok(`${two}: older link refused with the clear message`, await testid(pg, 'confirm-failed'));
      await pg.screenshot({ path: path.join(OUT, `${two}-older-refused.png`) });
      await pg.goto(newer.href); // same document: only the #fragment changes
      ok(`${two}: newer link opened in the SAME tab shows the sign-in button again`, await testid(pg, 'confirm-signin'));
      await pg.getByTestId('confirm-signin').click();
      await pg.waitForURL((u) => !/\/auth\/confirm/.test(String(u)), { timeout: 20000 }).catch(() => {});
      ok(`${two}: newer link signs in`, (await whoAmI(pg)) === emailOf(two));
      // Signed-in browser + an OLDER (superseded) link: must say "no longer works", never "already signed in".
      await pg.goto(older.href); await testid(pg, 'confirm-signin'); await pg.getByTestId('confirm-signin').click();
      ok(`${two}: signed-in browser opening the older link is told it no longer works (not "already signed in")`, await testid(pg, 'confirm-failed'));
      await ctx.close(); }
    // ONE link: reload (tab restore), simulated network failure + retry, then a second tab -> "already signed in".
    { const [m] = links[one]; const ctx = await newCtx(browser, `${one}-lifecycle`); const pg = await ctx.newPage();
      await pg.goto(m.href); await testid(pg, 'confirm-signin');
      await pg.reload(); ok(`${one}: after a reload the link still offers sign-in (no false "no longer works")`, await testid(pg, 'confirm-signin'));
      let blocked = 0;
      await pg.route('**/auth/v1/verify**', (route) => (blocked++ === 0 ? route.abort('failed') : route.continue()));
      await pg.getByTestId('confirm-signin').click();
      ok(`${one}: a network failure says "couldn't reach", keeps the link`, await testid(pg, 'confirm-unreachable'));
      const pg2 = await ctx.newPage(); await pg2.goto(m.href); await testid(pg2, 'confirm-signin');
      await pg.getByTestId('confirm-retry').click();
      await pg.waitForURL((u) => !/\/auth\/confirm/.test(String(u)), { timeout: 20000 }).catch(() => {});
      ok(`${one}: retry signs in`, (await whoAmI(pg)) === emailOf(one));
      await pg2.getByTestId('confirm-signin').click();
      ok(`${one}: the same link in a second tab -> "already signed in", not an error`, await testid(pg2, 'confirm-already'));
      await ctx.close(); }
    // Reused link from a different browser: refused.
    { const ctx = await newCtx(browser, `${one}-reuse`); const pg = await ctx.newPage(); await pg.goto(links[one][0].href);
      await pg.getByTestId('confirm-signin').click(); ok(`${one}: used link from another browser is refused`, await testid(pg, 'confirm-failed')); await ctx.close(); }
    // Optional: Muse's delay. Open the newest link now, leave the page, press after DELAY_MIN minutes.
    if (kv.DELAY) {
      const [m] = links[kv.DELAY]; const min = Number(kv.DELAY_MIN || 20);
      const ctx = await newCtx(browser, `${kv.DELAY}-delay`); const pg = await ctx.newPage(); await pg.goto(m.href); await testid(pg, 'confirm-signin');
      console.log(`waiting ${min} min with the page open...`); await sleep(min * 60000);
      await pg.getByTestId('confirm-signin').click();
      await pg.waitForURL((u) => !/\/auth\/confirm/.test(String(u)), { timeout: 20000 }).catch(() => {});
      ok(`${kv.DELAY}: link pressed ${min} min after opening signs in`, (await whoAmI(pg)) === emailOf(kv.DELAY));
      await ctx.close();
    }
    await sleep(4000);
    const a2 = await audit(emailOf(two), started); const a1 = await audit(emailOf(one), started);
    ok(`${two}: audit shows exactly 1 login and no new link minted during use`, a2.login === 1 && !a2.user_recovery_requested, JSON.stringify(a2));
    ok(`${one}: audit shows exactly 1 login and no new link minted during use`, a1.login === 1 && !a1.user_recovery_requested, JSON.stringify(a1));
    ok('token never sent anywhere except Supabase /verify (body only)', leaks.length === 0, leaks.join('; '));
    EXPECTED = 18 + (kv.DELAY ? 1 : 0);
  } else { console.error('phase must be request|use'); process.exit(2); }
  await browser.close();
  // Expected noise: Supabase answers 403 to refused links (by design), favicon 404s.
  const unexpected = consoleErrors.filter((e) => !/favicon|Failed to load resource.*(403|404)/i.test(e));
  fs.writeFileSync(path.join(OUT, 'console-errors.txt'), consoleErrors.join(String.fromCharCode(10)));
  ok('no unexpected page errors in any browser context', unexpected.length === 0, unexpected.slice(0, 3).join(' | '));
  EXPECTED += 1;
  const sum = { label, phase, sha: ci.commitHash, at: new Date().toISOString(), expected: EXPECTED, ran: res.length, pass: res.filter((x) => x.pass).length, fail: res.filter((x) => !x.pass).length, results: res };
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(sum, null, 1));
  console.log(`== ${sum.pass} pass / ${sum.fail} fail (expected ${EXPECTED}, ran ${sum.ran}) -> ${OUT}`);
  process.exit(sum.fail || sum.ran !== EXPECTED ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
