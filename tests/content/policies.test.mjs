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
const withFlag = (v, fn) => { const o = process.env.POLICY_PAGES_PUBLISHED; if (v == null) delete process.env.POLICY_PAGES_PUBLISHED; else process.env.POLICY_PAGES_PUBLISHED = v; try { return fn(); } finally { if (o === undefined) delete process.env.POLICY_PAGES_PUBLISHED; else process.env.POLICY_PAGES_PUBLISHED = o; } };

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
  assert.match(html, /nothing on the site guarantees a profit/);
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
  assert.match(terms, /7-day free trial/); assert.match(terms, /One free trial per customer/);
  assert.match(terms, /at least 21/);
  assert.match(refunds, /not charged/); assert.match(refunds, /Manage Subscription/); assert.match(refunds, /keep Pro until the end of the period/);
  assert.match(text(P.PRIVACY), /never reach our servers/);
  assert.match(text(P.PRIVACY), /do not sell/);
  assert.doesNotMatch(all, /lawyer|attorney|legal(ly)? review|reviewed by counsel/i);
  assert.doesNotMatch(all, /guaranteed (profit|win|return)|risk[- ]free|sure thing|lock of the/i);
});

test('root metadata sets metadataBase so per-page share images are absolute dailyaibetting.com URLs', async () => {
  const { readFileSync } = await import('node:fs');
  assert.match(readFileSync(new URL('../../src/app/layout.tsx', import.meta.url), 'utf8'), /metadataBase: new URL\('https:\/\/dailyaibetting\.com'\)/);
});
