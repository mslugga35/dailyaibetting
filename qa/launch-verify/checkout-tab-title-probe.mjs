// Muse finding 1 (build 2265871): Checkout tab title. TEST mode only (refuses a live key).
// Creates two Checkout Sessions (with / without branding_settings.display_name), reads the
// browser tab title in headless Chromium, then expires both sessions.
// Usage: node qa/launch-verify/checkout-tab-title-probe.mjs
//   STRIPE_TEST_ENV  env file with STRIPE_SECRET_KEY (sk_test_) + STRIPE_PRICE_ID (default: PC1 local-test file)
//   PLAYWRIGHT_FROM  any package.json whose node_modules has playwright (default: ~/ETETEST)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.env.PLAYWRIGHT_FROM || 'C:/Users/mpmmo/ETETEST/package.json');
const { chromium } = require('playwright');

const env = Object.fromEntries(readFileSync(process.env.STRIPE_TEST_ENV || 'C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/local-test/stripe-test.env', 'utf8')
  .split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]));
const KEY = env.STRIPE_SECRET_KEY;
if (!KEY.startsWith('sk_test_')) throw new Error('not a test key; refusing');
const auth = { Authorization: 'Basic ' + Buffer.from(KEY + ':').toString('base64') };
const api = async (method, path, form) => {
  const r = await fetch('https://api.stripe.com/v1/' + path, { method, headers: { ...auth, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2026-03-25.dahlia' }, body: form ? new URLSearchParams(form) : undefined });
  const j = await r.json(); if (j.error) throw new Error(path + ': ' + j.error.message); return j;
};

const acct = await api('GET', 'account');
console.log('TEST account names: business_profile.name =', JSON.stringify(acct.business_profile?.name),
  '| settings.dashboard.display_name =', JSON.stringify(acct.settings?.dashboard?.display_name),
  '| settings.branding =', JSON.stringify(Object.keys(acct.settings?.branding || {})));

const base = { mode: 'subscription', 'line_items[0][price]': env.STRIPE_PRICE_ID, 'line_items[0][quantity]': '1',
  success_url: 'https://dailyaibetting.com/account', cancel_url: 'https://dailyaibetting.com/pricing', 'metadata[app]': 'dailyai', 'metadata[probe]': 'tab-title' };
const variants = {
  without_branding: base,
  with_display_name: { ...base, 'branding_settings[display_name]': 'DailyAI Betting' },
};
const open = await api('GET', 'checkout/sessions?status=open&limit=100');
for (const o of open.data.filter(o => o.metadata?.probe === 'tab-title')) {
  const x = await api('POST', `checkout/sessions/${o.id}/expire`); console.log('swept leftover probe session', o.id.slice(0, 14) + '…', x.status);
}
const browser = await chromium.launch();
try {
  for (const [name, form] of Object.entries(variants)) {
    const s = await api('POST', 'checkout/sessions', form);
    let page;
    try {
    page = await browser.newPage();
    await page.goto(s.url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => document.title && document.body.innerText.includes('$'), null, { timeout: 45000 });
    await page.waitForTimeout(2000);
    const title = await page.title();
    const heading = await page.evaluate(() => {
      const t = document.body.innerText.split('\n').map(x => x.trim()).filter(Boolean);
      return t.slice(0, 4).join(' | ');
    });
    const ogTitle = await page.evaluate(() => document.querySelector('meta[property="og:title"]')?.content ?? null);
    console.log(`${name}: document.title = ${JSON.stringify(title)} | og:title = ${JSON.stringify(ogTitle)} | top text = ${JSON.stringify(heading)}`);
    } finally {
    await page?.close().catch(() => {});
    const x = await api('POST', `checkout/sessions/${s.id}/expire`);
    console.log(`  session ${s.id.slice(0, 14)}… expired: status=${x.status}`);
    }
  }
} finally { await browser.close(); }
