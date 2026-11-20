// DAI-05 production sign-in test (test accounts only). Usage: node signin-prod.cjs <label> [delayMinutes]
// Links are generated in-process with the service role and never printed or saved.
// A: opening the link (scanner/preview) does not spend it; a later click signs in.
// B: the same link a second time -> "no longer works".  C: an older link after a newer one -> fails; newest works.
// D: delayed use (N minutes) still works.  E: password sign-in works.  F: the real emailed link points at /auth/confirm#.
const { chromium } = require('C:/Users/mpmmo/ETETEST/node_modules/playwright');
const { createClient } = require('C:/Users/mpmmo/wt/dai-integrate/node_modules/@supabase/supabase-js');
const fs = require('fs'); const path = require('path');
const label = process.argv[2] || 'run'; const DELAY_MIN = Number(process.argv[3] || 6);
const B = 'https://dailyaibetting.com';
const OUT = path.join(__dirname, '..', '..', 'docs', 'launch-evidence', `DAI-05-${label}`); fs.mkdirSync(OUT, { recursive: true });
const envFile = (f) => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.trim().replace(/^"|"$/g, '')]));
const env = envFile('C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/.env.local');
const acct = envFile('C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/local-test/TEST-ACCOUNTS.env');
const FREE = acct.DAI_TEST_FREE_EMAIL; const PRO = acct.DAI_TEST_PRO_EMAIL;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const res = []; const ok = (n, p, i = '') => { res.push({ check: n, pass: !!p, info: i, at: new Date().toISOString() }); console.log(`${p ? 'PASS' : 'FAIL'} ${n}${i ? ' :: ' + i : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function link(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw new Error('generateLink: ' + error.message);
  return `${B}/auth/confirm#${new URLSearchParams({ token_hash: data.properties.hashed_token, type: data.properties.verification_type })}`;
}
async function signedInAs(pg) {
  await pg.goto(B + '/account', { waitUntil: 'domcontentloaded' }); await pg.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  if (/\/login/.test(pg.url())) return null;
  const t = await pg.locator('body').innerText();
  return (t.match(/mpm\.morales\+dai\w+@gmail\.com/) || [null])[0];
}
async function clickLink(browser, url, shot) {
  const ctx = await browser.newContext(); const pg = await ctx.newPage();
  await pg.goto(url, { waitUntil: 'domcontentloaded' }); await pg.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const btn = pg.getByTestId('confirm-signin');
  let outcome = 'no-button';
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await Promise.race([pg.waitForURL((u) => !/\/auth\/confirm/.test(String(u)), { timeout: 20000 }).catch(() => {}), pg.getByTestId('confirm-failed').waitFor({ timeout: 20000 }).catch(() => {})]);
    outcome = (await pg.getByTestId('confirm-failed').isVisible().catch(() => false)) ? 'failed' : 'navigated';
  } else if (await pg.getByTestId('confirm-failed').isVisible().catch(() => false)) outcome = 'failed';
  if (shot) await pg.screenshot({ path: path.join(OUT, shot) });
  const who = outcome === 'navigated' ? await signedInAs(pg) : null;
  const urlNoToken = !/token_hash/.test(pg.url());
  await ctx.close();
  return { outcome, who, urlNoToken };
}
(async () => {
  const browser = await chromium.launch();
  // A: scanner opens the link (no click), person clicks later
  const a = await link(FREE);
  { const ctx = await browser.newContext(); const pg = await ctx.newPage(); await pg.goto(a, { waitUntil: 'networkidle' }).catch(() => {}); await sleep(3000); await pg.screenshot({ path: path.join(OUT, 'A-landing.png') }); ok('A landing page shows a Sign in button (token not spent on load)', await pg.getByTestId('confirm-signin').isVisible()); await ctx.close(); }
  const ra = await clickLink(browser, a, 'A-after-click.png');
  ok('A link still works after a scanner-style open, signs in as FREE', ra.outcome === 'navigated' && ra.who === FREE, JSON.stringify(ra));
  ok('A token removed from the address bar', ra.urlNoToken);
  // B: reuse
  const rb = await clickLink(browser, a, 'B-reuse.png');
  ok('B reused link shows "no longer works"', rb.outcome === 'failed', rb.outcome);
  // C: superseded
  const c1 = await link(FREE); await sleep(1500); const c2 = await link(FREE);
  const rc1 = await clickLink(browser, c1, 'C-older.png');
  ok('C older link after a newer one -> clear failure message', rc1.outcome === 'failed', rc1.outcome);
  const rc2 = await clickLink(browser, c2, null);
  ok('C newest link works', rc2.outcome === 'navigated' && rc2.who === FREE, JSON.stringify(rc2));
  // E: password sign-in (PRO account; password read from the git-ignored file, never printed)
  { const ctx = await browser.newContext(); const pg = await ctx.newPage();
    await pg.goto(B + '/login', { waitUntil: 'domcontentloaded' }); await pg.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await pg.getByText(/sign in with a password instead/i).click();
    await pg.locator('input[type="email"]').first().fill(PRO);
    await pg.locator('input[type="password"]').first().fill(acct.PRO_PASSWORD);
    await pg.locator('form button[type="submit"]').last().click();
    await pg.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 20000 }).catch(() => {});
    ok('E password sign-in works (PRO)', (await signedInAs(pg)) === PRO);
    await ctx.close(); }
  // D: delayed click
  const d = await link(FREE);
  console.log(`waiting ${DELAY_MIN} min for the delayed-use check...`);
  await sleep(DELAY_MIN * 60_000);
  const rd = await clickLink(browser, d, 'D-delayed.png');
  ok(`D link used after ${DELAY_MIN} minutes still works`, rd.outcome === 'navigated' && rd.who === FREE, JSON.stringify(rd));
  await browser.close();
  // F: the real emailed link (POST the same endpoint the login form uses; the email itself is checked separately)
  const r = await fetch(B + '/api/auth/email-link', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: FREE, elapsedMs: 4000, website: '' }) });
  ok('F email-link endpoint accepts a real request', r.status === 200, `status ${r.status}`);
  const sum = { label, at: new Date().toISOString(), pass: res.filter((x) => x.pass).length, fail: res.filter((x) => !x.pass).length, results: res };
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(sum, null, 1));
  console.log(`== ${sum.pass} pass / ${sum.fail} fail -> ${OUT}`);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
