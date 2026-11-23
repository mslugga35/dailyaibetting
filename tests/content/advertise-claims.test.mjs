/**
 * DAI-27: /advertise sold "Newsletter Sponsorship ($150-400/email)" but no newsletter is sent.
 * While no newsletter/digest sender exists, the page must not offer one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const PAGE = readFileSync(new URL('../../src/app/advertise/page.tsx', import.meta.url), 'utf8');
const offers = PAGE.slice(PAGE.indexOf('const opportunities'), PAGE.indexOf('export default'));
const SELLS = /title: '[^']*newsletter[^']*'|\/email'|email newsletter/i;

test('no newsletter product is offered while no newsletter is sent', () => {
  const cron = readdirSync(new URL('../../src/app/api/cron/', import.meta.url));
  assert.equal(cron.some((d) => /digest|newsletter/i.test(d)), false, 'a newsletter sender exists: revisit this page and test');
  assert.doesNotMatch(offers, SELLS);
  assert.match(offers, /title: 'Banner Ads'/);
});

test('falsifier: the old card is caught', () => {
  assert.match("title: 'Newsletter Sponsorship', price: '$150-400/email'", SELLS);
});
