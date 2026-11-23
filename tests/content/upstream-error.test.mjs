/**
 * DAI-23: capper profile 500s came from Supabase's Cloudflare firewall block page ("Sorry, you have been
 * blocked") surfacing as the error message. It was logged whole (~90 lines) and returned in the JSON body.
 * Fix: one short line with the Ray ID, a generic client message, and one bounded retry for transient 5xx.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { describeUpstreamError, fetchWithOneRetry } = await import('../../src/lib/data/upstream-error.ts');
const API = readFileSync(new URL('../../src/app/api/cappers/route.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const PAGE = readFileSync(new URL('../../src/app/cappers/[slug]/page.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

// Same shape as the production log (title, block wording, Ray ID markup).
const BLOCK_PAGE = 'Failed to fetch capper: <!DOCTYPE html>\n<html><head><title>Attention Required! | Cloudflare</title></head>'
  + '<body><h1>Sorry, you have been blocked</h1><p>This website is using a security service to protect itself from online attacks.</p>'
  + '<span class="cf-footer-item">Cloudflare Ray ID: <strong class="font-semibold">a5d223430e2fe627</strong></span></body></html>';

test('a Cloudflare block page becomes one short line with the Ray ID and no HTML', () => {
  const d = describeUpstreamError(new Error(BLOCK_PAGE));
  assert.equal(d.blocked, true);
  assert.equal(d.rayId, 'a5d223430e2fe627');
  assert.doesNotMatch(d.summary, /</);
  assert.ok(d.summary.length <= 300);
  assert.match(d.summary, /^Failed to fetch capper: blocked by the database provider's firewall \(Cloudflare ray a5d223430e2fe627\)$/);
});

test('an ordinary database error is kept (short, unchanged meaning) and not marked blocked', () => {
  const d = describeUpstreamError(new Error('Failed to fetch capper: relation "x" does not exist'));
  assert.equal(d.blocked, false);
  assert.equal(d.rayId, null);
  assert.equal(d.summary, 'Failed to fetch capper: relation "x" does not exist');
});

test('the cappers API logs the summary and never returns the raw upstream message', () => {
  assert.match(API, /const upstream = describeUpstreamError\(error\);/);
  assert.match(API, /console\.error\(`Cappers API error: \$\{upstream\.summary\}`\)/);
  assert.match(API, /upstream\.blocked \? 'Capper data is temporarily unavailable\.' : upstream\.summary/);
  assert.doesNotMatch(API, /console\.error\('Cappers API error:', error\)/);
  assert.doesNotMatch(API, /error instanceof Error \? error\.message : 'Unknown error'/);
});

const res = (status) => new Response('{}', { status });
const seq = (...steps) => {
  const calls = [];
  const impl = async () => { const s = steps[calls.length]; calls.push(1); if (s instanceof Error) throw s; return res(s); };
  return { impl, calls };
};

test('retry: a 5xx then 200 succeeds on the single retry', async () => {
  const f = seq(503, 200);
  const r = await fetchWithOneRetry('u', {}, { fetchImpl: f.impl, delayMs: 1 });
  assert.equal(r.status, 200); assert.equal(f.calls.length, 2);
});

test('retry: a persistent 5xx is NOT masked (second 500 returned, only 2 calls)', async () => {
  const f = seq(500, 500, 200);
  const r = await fetchWithOneRetry('u', {}, { fetchImpl: f.impl, delayMs: 1 });
  assert.equal(r.status, 500); assert.equal(f.calls.length, 2);
});

test('retry: 404 and other 4xx return at once (no retry)', async () => {
  for (const s of [404, 403, 429]) {
    const f = seq(s, 200);
    const r = await fetchWithOneRetry('u', {}, { fetchImpl: f.impl, delayMs: 1 });
    assert.equal(r.status, s); assert.equal(f.calls.length, 1);
  }
});

test('retry: a network error is retried once; a second network error is thrown', async () => {
  const ok = seq(new Error('ECONNRESET'), 200);
  assert.equal((await fetchWithOneRetry('u', {}, { fetchImpl: ok.impl, delayMs: 1 })).status, 200);
  const bad = seq(new Error('ECONNRESET'), new Error('ECONNRESET'));
  await assert.rejects(fetchWithOneRetry('u', {}, { fetchImpl: bad.impl, delayMs: 1 }), /ECONNRESET/);
  assert.equal(bad.calls.length, 2);
});

test('the profile page uses the bounded retry and still throws on failure (no fake 404)', () => {
  assert.match(PAGE, /await fetchWithOneRetry\(url, \{ headers: await authHeaders\(\), cache: 'no-store' \}\)/);
  assert.match(PAGE, /if \(response\.status === 404\) return null;/);
  assert.match(PAGE, /throw new Error\(`Capper profile unavailable \(HTTP \$\{response\.status\}\)`\)/);
});
