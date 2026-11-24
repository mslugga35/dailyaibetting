/** Policy pages: unpublished until the owner approves; content matches how billing works. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

const P = await import('../../src/lib/legal/policies.ts');
const pages = {
  terms: await import('../../src/app/terms/page.tsx'),
  privacy: await import('../../src/app/privacy/page.tsx'),
  'refund-policy': await import('../../src/app/refund-policy/page.tsx'),
};
const rg = await import('../../src/app/responsible-gambling/page.tsx');
const { Footer } = await import('../../src/components/layout/Footer.tsx');
const text = (p) => p.sections.flatMap((s) => [s.heading, ...s.paragraphs]).join('\n');
const withEnv = (vars, fn) => { const old = {}; for (const k of Object.keys(vars)) { old[k] = process.env[k]; if (vars[k] == null) delete process.env[k]; else process.env[k] = vars[k]; } try { return fn(); } finally { for (const k of Object.keys(vars)) { if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k]; } } };
const OP = { POLICY_LEGAL_NAME: 'Example Co LLC', POLICY_GOVERNING_STATE: 'Florida' };
const withFlag = (v, fn) => withEnv({ POLICY_PAGES_PUBLISHED: v, ...(v === 'true' ? OP : { POLICY_LEGAL_NAME: null, POLICY_GOVERNING_STATE: null }) }, fn);

test('terms/privacy/refunds 404 until POLICY_PAGES_PUBLISHED=true, then render', () => {
  for (const [slug, mod] of Object.entries(pages)) {
    for (const v of [null, '', 'false', 'yes']) assert.throws(() => withFlag(v, () => mod.default()), /NEXT_(HTTP_ERROR_FALLBACK;404|NOT_FOUND)/, `${slug} ${v}`);
    const html = withFlag('true', () => renderToString(mod.default()));
    assert.match(html, /Last updated/, slug);
  }
});

test('responsible-gambling is always published: 21+, helpline, no guarantee', () => {
  const html = withFlag(null, () => renderToString(rg.default()));
  assert.match(html, /21 or older/);
  assert.match(html, /1-800-GAMBLER/);
  assert.match(html, /Past performance does not guarantee future results/);
  assert.match(html, /possible loss of the entire amount wagered/);
});

test('footer links only published policies; disclaimer always shown', () => {
  const off = withFlag(null, () => renderToString(createElement(Footer)));
  assert.doesNotMatch(off, /href="\/terms"|href="\/privacy"|href="\/refund-policy"/);
  assert.match(off, /href="\/responsible-gambling"/);
  assert.match(off, /21\+ only/);
  const on = withFlag('true', () => renderToString(createElement(Footer)));
  for (const h of ['/terms', '/privacy', '/refund-policy', '/responsible-gambling']) assert.match(on, new RegExp(`href="${h}"`));
});

test('policy text matches the real billing rules and makes no forbidden claims', () => {
  const all = P.ALL_POLICIES.map(text).join('\n');
  const terms = text(P.TERMS); const refunds = text(P.REFUNDS);
  assert.match(terms, /\$9\.99\/mo/); assert.match(terms, /\$19\.99\/mo/);
  assert.match(terms, /seven-day free trial/); assert.match(terms, /Free trials are limited to eligible first-time customers/);
  assert.match(terms, /automatically renew each month until cancelled/);
  // DAI_AUTO_CANCEL_DUPLICATE_TRIAL is off in production: never promise an automatic no-charge cancellation.
  assert.doesNotMatch(all, /cancelled right away without a charge/);
  assert.match(terms, /may deny or cancel duplicate or ineligible trials/);
  // The fixed record statement was removed (owner correction 2026-11-24).
  assert.doesNotMatch(all, /losing slightly at standard -110 odds/);
  assert.match(terms, /do not accept wagers, hold funds for wagering or operate as a sportsbook/);
  assert.match(terms, /AI-generated reports and picks are available only when the required systems and data are operational/);
  assert.match(terms, /at least 21/);
  assert.match(refunds, /Cancel before the trial ends to avoid the first subscription charge/); assert.match(refunds, /Manage Subscription/);
  assert.match(refunds, /access continues through the applicable paid billing period/); assert.match(refunds, /access continues until the trial ends/);
  assert.match(text(P.PRIVACY), /do not pass through our application servers/);
  assert.match(text(P.PRIVACY), /card fingerprints supplied by our payment processor/);
  assert.match(text(P.PRIVACY), /do not sell account email addresses or payment information for money/);
  assert.match(text(P.PRIVACY), /Google Ad Settings/);
  // No on-site consent/privacy control exists: it must not be claimed.
  assert.doesNotMatch(text(P.PRIVACY), /website privacy controls/i);
  assert.match(text(P.PRIVACY), /change to your account email address/);
  assert.match(text(P.PRIVACY), /Marketing emails include an unsubscribe mechanism/);
  assert.doesNotMatch(all, /lawyer|attorney|legal(ly)? review|reviewed by counsel/i);
  assert.doesNotMatch(all, /guaranteed (profit|win|return)|risk[- ]free|sure thing|lock of the/i);
});

test('root metadata sets metadataBase so per-page share images are absolute dailyaibetting.com URLs', async () => {
  const { readFileSync } = await import('node:fs');
  assert.match(readFileSync(new URL('../../src/app/layout.tsx', import.meta.url), 'utf8'), /metadataBase: new URL\('https:\/\/dailyaibetting\.com'\)/);
});

test('flag alone does not publish: legal name AND governing state are required', () => {
  for (const vars of [{ POLICY_LEGAL_NAME: null, POLICY_GOVERNING_STATE: 'Florida' }, { POLICY_LEGAL_NAME: 'Example Co LLC', POLICY_GOVERNING_STATE: null }, { POLICY_LEGAL_NAME: ' ', POLICY_GOVERNING_STATE: ' ' }]) {
    assert.throws(() => withEnv({ POLICY_PAGES_PUBLISHED: 'true', ...vars }, () => pages.terms.default()), /NEXT_(HTTP_ERROR_FALLBACK;404|NOT_FOUND)/, JSON.stringify(vars));
  }
  const html = withFlag('true', () => renderToString(pages.terms.default()));
  assert.match(html, /operated by Example Co LLC/);
  assert.match(html, /laws of the State of Florida/);
});

test('owner decisions 2026-11-19: 21+, refunds subject to law, price-change notice, founding price kept', () => {
  const terms = text(P.TERMS); const refunds = text(P.REFUNDS);
  assert.match(refunds, /Nothing in this policy limits refund or other consumer rights provided by applicable law/);
  assert.match(terms, /email affected subscribers before the change takes effect/);
  assert.match(terms, /Founding Member pricing is kept for as long as the founding subscription stays active/);
  assert.match(text(P.PRIVACY), /21 and over/);
});

test('confirmed operator 2026-11-19: individual trading as DailyAI Betting, DAILYAI descriptor', () => {
  const ind = withEnv({ POLICY_LEGAL_NAME: 'Matthew Morales', POLICY_GOVERNING_STATE: 'Florida', POLICY_OPERATOR_TYPE: 'individual' }, () => text(P.termsPolicy()));
  assert.match(ind, /operated by Matthew Morales, an individual doing business as DailyAI Betting/);
  assert.match(ind, /mean Matthew Morales operating as DailyAI Betting\./);
  assert.match(ind, /except where applicable law provides consumer rights that cannot be waived/);
  assert.match(ind, /laws of the State of Florida/);
  // Without the type flag the operator is not described as an individual.
  const co = withEnv({ ...OP, POLICY_OPERATOR_TYPE: null }, () => text(P.termsPolicy()));
  assert.doesNotMatch(co, /an individual doing business/);
  assert.match(text(P.TERMS), /Charges show on your card statement with DAILYAI in the description\./);
});

test('privacy names the operator and the terms link the responsible-gambling page (owner corrections 2026-11-24)', async () => {
  const env = { POLICY_PAGES_PUBLISHED: 'true', POLICY_LEGAL_NAME: 'Matthew Morales', POLICY_GOVERNING_STATE: 'Florida', POLICY_OPERATOR_TYPE: 'individual' };
  const priv = withEnv(env, () => text(P.privacyPolicy()));
  assert.match(priv, /operated by Matthew Morales, an individual doing business as DailyAI Betting/);
  const termsHtml = withEnv(env, () => renderToString(pages.terms.default()));
  assert.match(termsHtml, /href="\/responsible-gambling"/);
  assert.match(termsHtml, /intended for adults aged 21 and older/);
  assert.equal(P.POLICY_LAST_UPDATED, 'November 24, 2026');
});
