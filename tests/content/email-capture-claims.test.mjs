/**
 * DAI-25: the signup box promised "Top consensus picks delivered to your inbox every morning" and
 * "Check your inbox", but no job sends subscriber email (the n8n welcome webhook 404s and no daily digest
 * exists). Until a real sender ships, the copy must not promise delivery.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const SRC = readFileSync(new URL('../../src/components/monetization/EmailCapture.tsx', import.meta.url), 'utf8');
const PROMISES = /every morning|delivered to your inbox|check your inbox/i;

test('the signup box does not promise email delivery that does not exist', () => {
  assert.doesNotMatch(SRC, PROMISES);
  assert.match(SRC, /coming soon/i);
});

test('no scheduled job sends subscriber email yet (if one is added, update the copy and this test)', () => {
  const cron = readdirSync(new URL('../../src/app/api/cron/', import.meta.url));
  assert.equal(cron.some((d) => /digest|newsletter|subscriber|welcome/i.test(d)), false, `cron routes: ${cron.join(', ')}`);
});

test('falsifier: the old copy is caught', () => {
  assert.match('Top consensus picks delivered to your inbox every morning.', PROMISES);
  assert.match("You're subscribed! Check your inbox.", PROMISES);
});
