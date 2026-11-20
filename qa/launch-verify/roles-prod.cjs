// Role regression on production (test accounts; read-only: no grading buttons, no checkout, no billing changes).
// Sign-in uses in-process links through /auth/confirm (never printed). Usage: node roles-prod.cjs <label>
const { chromium, devices } = require('C:/Users/mpmmo/ETETEST/node_modules/playwright');
const { createClient } = require('C:/Users/mpmmo/wt/dai-integrate/node_modules/@supabase/supabase-js');
const fs = require('fs'); const path = require('path');
const label = process.argv[2] || 'run'; const B = 'https://dailyaibetting.com';
const OUT = path.join(__dirname, '..', '..', 'docs', 'launch-evidence', `ROLES-${label}`); fs.mkdirSync(OUT, { recursive: true });
const envFile = (f) => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.trim().replace(/^"|"$/g, '')]));
const env = envFile('C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/.env.local');
const acct = envFile('C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/local-test/TEST-ACCOUNTS.env');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const res = []; const ok = (n, p, i = '') => { res.push({ check: n, pass: !!p, info: i }); console.log(`${p ? 'PASS' : 'FAIL'} ${n}${i ? ' :: ' + i : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = async (pg) => (await pg.locator('body').innerText()).replace(/\s+/g, ' ');
async function go(pg, p) { await sleep(900); await pg.goto(B + p, { waitUntil: 'domcontentloaded' }); await pg.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); }
async function signIn(browser, email, opts = {}) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email }); if (error) throw error;
  const ctx = await browser.newContext(opts); const pg = await ctx.newPage();
  await pg.goto(`${B}/auth/confirm#${new URLSearchParams({ token_hash: data.properties.hashed_token, type: data.properties.verification_type })}`);
  await pg.getByTestId('confirm-signin').click();
  await pg.waitForURL((u) => !/\/auth\/confirm/.test(String(u)), { timeout: 20000 });
  return { ctx, pg };
}
(async () => {
  const browser = await chromium.launch();
  // DAI-08: fire counts agree between home and /picks (signed out)
  { const ctx = await browser.newContext(); const pg = await ctx.newPage();
    await go(pg, '/'); const h = await text(pg); await go(pg, '/picks'); const p = await text(pg);
    const num = (t, re) => { const m = t.match(re); return m ? Number(m[1].replace(/,/g, '')) : null; };
    const hf = num(h, /(\d+)\s*fire picks?/i) ?? num(h, /fire picks?[^\d]{0,20}(\d+)/i); const pf = num(p, /(\d+)\s*fire picks?/i) ?? num(p, /fire picks?[^\d]{0,20}(\d+)/i);
    const hr = (h.match(/\d{1,3}(,\d{3})*-\d{1,3}(,\d{3})*-\d+/) || [null])[0];
    ok('DAI-08 home and /picks report the same fire-pick count', hf !== null && hf === pf, `home ${hf} / picks ${pf}`);
    await go(pg, '/admin/grading').catch(() => {}); ok('signed-out /admin/grading does not show the grader', !/Run Auto-Grader/i.test(await text(pg)));
    fs.writeFileSync(path.join(OUT, 'home-record.txt'), String(hr)); await ctx.close(); }
  // FREE
  { const { ctx, pg } = await signIn(browser, acct.DAI_TEST_FREE_EMAIL);
    await go(pg, '/admin'); const t = await text(pg);
    ok('FREE /admin -> access denied page, no grader', /don.t have access/i.test(t) && !/Run Auto-Grader/i.test(t));
    await go(pg, '/account'); const a = await text(pg); ok('FREE /account shows the free plan, signed in', /daifree/.test(a) && !/Complimentary Pro/i.test(a));
    await pg.screenshot({ path: path.join(OUT, 'free-account.png') }); await ctx.close(); }
  // PRO (complimentary)
  { const { ctx, pg } = await signIn(browser, acct.DAI_TEST_PRO_EMAIL);
    await go(pg, '/admin/grading'); const t = await text(pg);
    ok('DAI-09 PRO /admin/grading -> "You don\'t have access" page', /don.t have access to this page/i.test(t) && !/Run Auto-Grader/i.test(t));
    await pg.screenshot({ path: path.join(OUT, 'pro-admin-denied.png') });
    await go(pg, '/account'); const a = await text(pg);
    ok('DAI-10 PRO /account: complimentary Pro, no portal hang', /complimentary/i.test(a) && !/Opening portal/i.test(a), (a.match(/[^.]*complimentary[^.]*\./i) || [''])[0].slice(0, 160));
    await pg.screenshot({ path: path.join(OUT, 'pro-account.png') }); await ctx.close(); }
  // ADMIN (view only)
  { const { ctx, pg } = await signIn(browser, acct.DAI_TEST_ADMIN_EMAIL);
    await go(pg, '/admin/grading'); const t = await text(pg);
    ok('ADMIN /admin/grading loads (buttons present, NOT clicked)', /Run Auto-Grader/i.test(t), (t.match(/PENDING\s*\d+/i) || [''])[0]);
    await pg.screenshot({ path: path.join(OUT, 'admin-grading.png'), fullPage: true }); await ctx.close(); }
  // signed-in /account at phone width (DAI-07 gap)
  { const { ctx, pg } = await signIn(browser, acct.DAI_TEST_PRO_EMAIL, { ...devices['iPhone 13'] });
    await go(pg, '/account');
    const m = await pg.evaluate(() => ({ vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth }));
    ok('DAI-07 signed-in /account @390 no horizontal scroll', m.sw <= m.vw + 1, JSON.stringify(m));
    await pg.screenshot({ path: path.join(OUT, 'pro-account-390.png'), fullPage: true }); await ctx.close(); }
  await browser.close();
  const sum = { label, at: new Date().toISOString(), pass: res.filter((x) => x.pass).length, fail: res.filter((x) => !x.pass).length, results: res };
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(sum, null, 1));
  console.log(`== ${sum.pass} pass / ${sum.fail} fail -> ${OUT}`);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
