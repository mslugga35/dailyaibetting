/**
 * Server-to-server calls into this app must reach the port the process listens on.
 * Production runs on PORT=3103 with NEXT_PUBLIC_BASE_URL unset; a hard-coded
 * 'http://localhost:3000' fallback made every capper profile page 404 there.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { setup } from '../harness/helpers.mjs';

const { internalBaseUrl } = await import('../../src/lib/data/server-fetch.ts');

beforeEach(() => { setup(); });

test('internalBaseUrl: without NEXT_PUBLIC_BASE_URL it targets this process\'s PORT (prod: 3103), never a guessed 3000', () => {
  const saved = { base: process.env.NEXT_PUBLIC_BASE_URL, port: process.env.PORT };
  try {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    process.env.PORT = '3103';
    assert.equal(internalBaseUrl(), 'http://127.0.0.1:3103');
    process.env.NEXT_PUBLIC_BASE_URL = 'https://dailyai.test';
    assert.equal(internalBaseUrl(), 'https://dailyai.test');
  } finally {
    if (saved.base === undefined) delete process.env.NEXT_PUBLIC_BASE_URL; else process.env.NEXT_PUBLIC_BASE_URL = saved.base;
    if (saved.port === undefined) delete process.env.PORT; else process.env.PORT = saved.port;
  }
});

test('no source file falls back to a hard-coded localhost:3000 for internal fetches', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name) && /['"`]https?:\/\/(localhost|127\.0\.0\.1)(:|\/|['"`])/.test(readFileSync(p, 'utf8'))) offenders.push(p);
    }
  };
  walk(new URL('../../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  assert.deepEqual(offenders.filter((p) => !p.replace(/\\/g, '/').endsWith('src/lib/data/server-fetch.ts')), []);
});

test('every server-side fetch of this app\'s own /api goes through internalBaseUrl() (no public-URL hairpin)', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(ts|tsx)$/.test(name)) continue;
      const src = readFileSync(p, 'utf8');
      if (/^['"]use client['"]/m.test(src)) continue; // browser fetches are relative, not server self-fetches
      for (const m of src.matchAll(/fetch\(\s*`\$\{([^}]+)\}\/api\//g)) {
        const v = m[1].trim();
        if (v === 'internalBaseUrl()') continue;
        // a local variable is fine only if it was assigned from internalBaseUrl()
        if (new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*internalBaseUrl\\(\\)`).test(src)) continue;
        offenders.push(`${p.replace(/\\/g, '/').split('/src/')[1]}: \${${v}}`);
      }
    }
  };
  walk(new URL('../../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  assert.deepEqual(offenders, []);
});

// ---- internal SSR marker: skips ONLY the per-IP rate limit

const { rateLimitGuard, internalSsrToken, INTERNAL_SSR_HEADER } = await import('../../src/lib/api-helpers.ts');
const { req, body, quietly } = await import('../harness/helpers.mjs');

test('SSR marker: a valid token skips the per-IP limit; a wrong or missing one does not', () => {
  const token = internalSsrToken();
  assert.ok(token && token !== process.env.CRON_SECRET, 'token exists and is not the raw cron secret');
  const mk = (h) => new Request('https://dailyai.test/api/x', { headers: { 'x-forwarded-for': '198.51.100.7', ...h } });
  for (let i = 0; i < 30; i++) assert.equal(rateLimitGuard(mk({})), null);
  assert.equal(rateLimitGuard(mk({}))?.status, 429, 'plain visitor is limited after 30');
  assert.equal(rateLimitGuard(mk({ [INTERNAL_SSR_HEADER]: 'f'.repeat(64) }))?.status, 429, 'forged token is limited');
  for (let i = 0; i < 50; i++) assert.equal(rateLimitGuard(mk({ [INTERNAL_SSR_HEADER]: token })), null, 'our own render is never limited');
});

test('SSR marker unlocks no data: /api/picks stays 401 and /api/consensus stays the free tier', async () => {
  const h = { [INTERNAL_SSR_HEADER]: internalSsrToken() };
  const { GET: picks } = await import('../../src/app/api/picks/route.ts');
  const { GET: consensus } = await import('../../src/app/api/consensus/route.ts');
  assert.equal((await quietly(() => picks(req('/api/picks', { headers: h })))).status, 401);
  const c = await body(await quietly(() => consensus(req('/api/consensus', { headers: h }))));
  assert.equal(c.tier, 'free');
});

test('SSR marker: no CRON_SECRET means no token, so nothing can skip the limit', () => {
  const saved = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = '   ';
    assert.equal(internalSsrToken(), null);
    const r = new Request('https://dailyai.test/api/x', { headers: { 'x-forwarded-for': '198.51.100.8', [INTERNAL_SSR_HEADER]: '' } });
    for (let i = 0; i < 30; i++) rateLimitGuard(r);
    assert.equal(rateLimitGuard(r)?.status, 429);
  } finally { process.env.CRON_SECRET = saved; }
});

test('SSR marker never lifts a checkout-scoped limit', () => {
  const mk = () => new Request('https://dailyai.test/api/checkout', { headers: { 'x-forwarded-for': '198.51.100.9', [INTERNAL_SSR_HEADER]: internalSsrToken() } });
  for (let i = 0; i < 5; i++) assert.equal(rateLimitGuard(mk(), 5, 60_000, 'guest-checkout'), null);
  assert.equal(rateLimitGuard(mk(), 5, 60_000, 'guest-checkout')?.status, 429);
});

test('capper profile API: unknown slug is 404, a database failure is 500 (never a false "not found")', async () => {
  const { GET } = await import('../../src/app/api/cappers/route.ts');
  const { harness: h } = await import('../harness/helpers.mjs');
  const missing = await quietly(() => GET(req('/api/cappers?view=profile&slug=nobody')));
  assert.equal(missing.status, 404);
  h().db.fail({ table: 'hb_capper_stats', op: 'select', error: { message: 'fetch failed: connect ETIMEDOUT', code: '' } });
  const down = await quietly(() => GET(req('/api/cappers?view=profile&slug=dave-price')));
  assert.equal(down.status, 500);
});
