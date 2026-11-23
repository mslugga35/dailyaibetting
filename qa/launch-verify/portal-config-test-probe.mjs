// DAI-03: functional check of the DailyAI-only portal configuration, TEST mode only (refuses a live key).
// Builds a TEST config with the same features as live bpc_1UdauM… (DailyAI), a test customer with a trialing
// subscription, opens the portal in headless Chromium, checks what it offers, cancels in TEST mode, verifies
// cancel_at_period_end, then deletes the test customer and deactivates the test config.
// Usage: node qa/launch-verify/portal-config-test-probe.mjs
//   STRIPE_TEST_ENV  env file with STRIPE_SECRET_KEY (sk_test_) + STRIPE_PRICE_ID (default: PC1 local-test file)
//   PLAYWRIGHT_FROM  any package.json whose node_modules has playwright (default: ~/ETETEST)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.env.PLAYWRIGHT_FROM || 'C:/Users/mpmmo/ETETEST/package.json');
const { chromium } = require('playwright');

const env = Object.fromEntries(readFileSync(process.env.STRIPE_TEST_ENV || 'C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/local-test/stripe-test.env', 'utf8')
  .split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]));
if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('not a test key; refusing');
const H = { Authorization: 'Basic ' + Buffer.from(env.STRIPE_SECRET_KEY + ':').toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2026-03-25.dahlia' };
const call = async (method, path, form) => {
  const r = await fetch('https://api.stripe.com/v1/' + path, { method, headers: H, body: form ? new URLSearchParams(form) : undefined });
  const j = await r.json(); if (j.error) throw new Error(`${path}: ${j.error.message}`); return j;
};

// Same features as live DailyAI config (read 2026-11-23): no customer edits, cancel at period end, no proration,
// no reason survey, invoices on, payment method on, no plan switching, no legal links.
const config = await call('POST', 'billing_portal/configurations', {
  'business_profile[headline]': 'DailyAI Betting: manage your DailyAI Pro subscription',
  default_return_url: 'https://dailyaibetting.com/account',
  'features[customer_update][enabled]': 'false',
  'features[invoice_history][enabled]': 'true',
  'features[payment_method_update][enabled]': 'true',
  'features[subscription_cancel][enabled]': 'true',
  'features[subscription_cancel][mode]': 'at_period_end',
  'features[subscription_cancel][proration_behavior]': 'none',
  'features[subscription_cancel][cancellation_reason][enabled]': 'false',
  // The API requires at least 2 reasons even when the survey is disabled (they are never shown).
  'features[subscription_cancel][cancellation_reason][options][0]': 'too_expensive',
  'features[subscription_cancel][cancellation_reason][options][1]': 'other',
  'features[subscription_update][enabled]': 'false',
  'metadata[app]': 'dailyai', 'metadata[probe]': 'portal-test',
});
let customer;
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`); };
const browser = await chromium.launch();
try {
  customer = await call('POST', 'customers', { email: 'portal-probe@example.com', name: 'Portal Probe', payment_method: 'pm_card_visa', 'invoice_settings[default_payment_method]': 'pm_card_visa', 'metadata[probe]': 'portal-test' });
  const sub = await call('POST', 'subscriptions', { customer: customer.id, 'items[0][price]': env.STRIPE_PRICE_ID, trial_period_days: '7', 'metadata[probe]': 'portal-test' });
  check('test subscription trialing', sub.status === 'trialing', sub.status);
  const ps = await call('POST', 'billing_portal/sessions', { customer: customer.id, configuration: config.id, return_url: 'https://dailyaibetting.com/account' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(ps.url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => /cancel/i.test(document.body.innerText), null, { timeout: 45000 });
  await page.waitForTimeout(1500);
  const text = await page.evaluate(() => document.body.innerText);
  console.log('tab title:', JSON.stringify(await page.title()));
  console.log('page text (first 600):', JSON.stringify(text.slice(0, 600)));
  check('headline shown', /DailyAI Betting: manage your DailyAI Pro subscription/.test(text));
  check('cancel offered', /cancel (subscription|plan)/i.test(text));
  check('payment method section', /payment method/i.test(text));
  check('invoice history section', /invoice history/i.test(text));
  check('no plan switching', !/update (subscription|plan)|change plan|switch plan/i.test(text));
  check('no customer info editing', !/(update|edit) (information|details|email|billing address)/i.test(text));
  check('no terms/privacy links', !/terms of service|privacy policy/i.test(text));
  // Cancel (TEST mode) and confirm it takes effect at period end, with no reason survey.
  await page.getByText(/cancel (subscription|plan)/i).first().click();
  await page.waitForTimeout(2500);
  const cancelText = await page.evaluate(() => document.body.innerText);
  check('no cancellation-reason survey', !/reason|why are you cancel|tell us why/i.test(cancelText), JSON.stringify(cancelText.slice(0, 200)));
  const buttons = await page.getByRole('button').allInnerTexts();
  console.log('confirm-page buttons:', JSON.stringify(buttons));
  await page.getByRole('button', { name: /^\s*cancel (subscription|plan)\s*$/i }).last().click();
  await page.waitForFunction(() => /cancels on|will be canceled|cancell?ed|renew/i.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  let after;
  for (let i = 0; i < 10; i++) {
    after = await call('GET', `subscriptions/${sub.id}`);
    if (after.cancel_at_period_end || after.cancel_at) break;
    await page.waitForTimeout(1500);
  }
  console.log('after cancel page text:', JSON.stringify((await page.evaluate(() => document.body.innerText)).slice(0, 300)));
  // Newer API versions report a period-end cancel as cancel_at (= period end) rather than cancel_at_period_end.
  const atEnd = after.cancel_at_period_end === true || (after.cancel_at && after.cancel_at === (after.trial_end || after.items?.data?.[0]?.current_period_end));
  check('cancel takes effect at period end (access kept until then)', atEnd && after.status === 'trialing', `status=${after.status} cancel_at_period_end=${after.cancel_at_period_end} cancel_at=${after.cancel_at} trial_end=${after.trial_end}`);
  await page.close();
} finally {
  await browser.close();
  if (customer) await call('DELETE', `customers/${customer.id}`).then(() => console.log('cleanup: test customer deleted')).catch(e => console.log('cleanup failed:', e.message));
  await call('POST', `billing_portal/configurations/${config.id}`, { active: 'false' }).then(() => console.log('cleanup: test config deactivated')).catch(e => console.log('cleanup failed:', e.message));
}
console.log(`RESULT ${results.filter(Boolean).length}/${results.length} pass`);
