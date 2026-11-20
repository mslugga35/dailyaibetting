// Opens the TEST-mode portal session in a visible Chromium window and records what a paying member sees.
// Never solves or bypasses a captcha: if one appears, it is recorded and the run stops.
const { chromium } = require('C:/Users/mpmmo/ETETEST/node_modules/playwright');
const fs = require('fs'); const path = require('path');
const OUT = 'C:/Users/mpmmo/wt/dai-integrate/docs/launch-evidence/DAI-03-portal-testmode'; fs.mkdirSync(OUT, { recursive: true });
const url = fs.readFileSync(__dirname + '/portal-url.txt', 'utf8').trim();
const res = []; const ok = (n, p, i = '') => { res.push({ check: n, pass: !!p, info: i }); console.log(`${p ? 'PASS' : 'FAIL'} ${n}${i ? ' :: ' + i : ''}`); };
(async () => {
  const browser = await chromium.launch({ headless: false });
  const pg = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await pg.goto(url, { waitUntil: 'domcontentloaded' });
  let text = '';
  for (let i = 0; i < 40; i++) { await pg.waitForTimeout(1000); text = await pg.locator('body').innerText().catch(() => ''); if (/9\.99/.test(text) && /cancel/i.test(text)) break; }
  const captcha = pg.frames().some((f) => /hcaptcha|captcha|challenge/i.test(f.url()));
  await pg.screenshot({ path: path.join(OUT, '1-portal-overview.png'), fullPage: true });
  if (captcha && !/9\.99/.test(text)) { ok('portal UI reachable', false, 'Stripe bot challenge shown (external, not bypassed)'); }
  else {
    ok('portal shows the founding plan at $9.99/month', /\$9\.99/.test(text), (text.match(/[^\n]*9\.99[^\n]*/) || [''])[0]);
    ok('portal shows the card on file (4242)', /4242/.test(text));
    ok('portal shows invoice history with a paid invoice', /invoice history/i.test(text) && /paid/i.test(text));
    ok('portal offers Cancel subscription', /cancel (subscription|plan)/i.test(text));
    ok('portal offers NO plan change/upgrade (founding price locked)', !/update (plan|subscription)|change plan|switch plan/i.test(text));
    ok('portal offers payment-method update', /(add|update|change) payment method|payment method/i.test(text));
    const back = await pg.locator('a[href*="dailyaibetting.com"]').first().getAttribute('href').catch(() => null);
    ok('return link goes back to dailyaibetting.com/account', back && /dailyaibetting\.com\/account/.test(back), back || 'none');
    // open the cancel flow to confirm options, then back out WITHOUT confirming
    const cancel = pg.getByRole('link', { name: /cancel (subscription|plan)/i }).or(pg.getByRole('button', { name: /cancel (subscription|plan)/i })).first();
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click(); await pg.waitForTimeout(3000);
      const t2 = await pg.locator('body').innerText();
      await pg.screenshot({ path: path.join(OUT, '2-cancel-review-not-confirmed.png'), fullPage: true });
      ok('cancel flow explains access continues until period end (not confirmed)', /until|end of|period|will be cancel/i.test(t2), (t2.match(/[^\n]*(until|end of)[^\n]*/i) || [''])[0].slice(0, 160));
    }
    const inv = pg.getByText(/invoice history/i).first();
    if (await inv.isVisible().catch(() => false)) { await pg.goto(url).catch(() => {}); }
  }
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ at: new Date().toISOString(), mode: 'stripe-test', captcha, results: res }, null, 1));
  await browser.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
