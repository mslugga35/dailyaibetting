import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Shared helpers for API routes.
 * - Rate limiting (in-memory, per-serverless instance)
 * - Email validation
 * - Auth: resolve user from Bearer token (implicit flow) or cookies
 * - Lazy Supabase admin client
 */

// --- Rate Limiting ---

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
let _lastCleanup = Date.now();

export function isRateLimited(ip: string, maxRequests = 5, windowMs = 60_000): boolean {
  const now = Date.now();

  // Time-based cleanup: sweep expired entries every 60s (not counter-based)
  if (now - _lastCleanup > 60_000) {
    _lastCleanup = now;
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > maxRequests;
}

// --- Validation ---

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Parse a query-string integer with a NaN guard and bounds.
 * Returns `fallback` when the value is missing or non-numeric,
 * then clamps to [min, max].
 */
export function parseIntParam(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = parseInt(raw ?? '', 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// Production path: Cloudflare -> Caddy (no trusted_proxies) -> Next. Caddy replaces any
// client-sent X-Forwarded-For with the address of its direct peer, which is a Cloudflare
// edge, shared by many visitors. Cloudflare puts the real visitor in CF-Connecting-IP.
// Trust that header ONLY when the peer really is Cloudflare; anyone reaching the origin
// directly could otherwise set it to dodge the per-IP limits.
// Source: https://www.cloudflare.com/ips/ (unknown peers fall back to the peer address).
const CLOUDFLARE_V4 = ['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22'];
const CLOUDFLARE_V6 = ['2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32'];

function v4ToInt(ip: string): number | null {
  const p = ip.split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (const s of p) { const x = Number(s); if (!/^\d{1,3}$/.test(s) || x > 255) return null; n = n * 256 + x; }
  return n;
}
function v6ToBigInt(ip: string): bigint | null {
  if (!/^[0-9a-f:]+$/i.test(ip) || ip.split('::').length > 2) return null;
  const [head, tail] = ip.includes('::') ? ip.split('::') : [ip, undefined];
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const fill = tail === undefined ? 0 : 8 - h.length - t.length;
  if (fill < 0) return null;
  const groups = [...h, ...Array(fill).fill('0'), ...t];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  return groups.reduce((acc, g) => (acc << BigInt(16)) + BigInt(parseInt(g, 16)), BigInt(0));
}
export function isCloudflareIp(ip: string): boolean {
  const v4 = v4ToInt(ip.replace(/^::ffff:/i, ''));
  if (v4 !== null) {
    return CLOUDFLARE_V4.some((c) => { const [base, bits] = c.split('/'); const b = v4ToInt(base)!; const m = Number(bits); return Math.floor(v4 / 2 ** (32 - m)) === Math.floor(b / 2 ** (32 - m)); });
  }
  const v6 = v6ToBigInt(ip);
  if (v6 === null) return false;
  return CLOUDFLARE_V6.some((c) => { const [base, bits] = c.split('/'); const shift = BigInt(128 - Number(bits)); return (v6 >> shift) === (v6ToBigInt(base)! >> shift); });
}

export function getClientIp(request: Request): string {
  // The right-most X-Forwarded-For entry is the one our own proxy wrote (its direct peer).
  const peer = request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || '';
  const cf = request.headers.get('cf-connecting-ip')?.trim();
  if (cf && peer && isCloudflareIp(peer) && (v4ToInt(cf) !== null || v6ToBigInt(cf) !== null)) return cf;
  return peer || 'unknown';
}

/**
 * Rate-limit guard for public API GET routes.
 * Returns a 429 JSON response when the client IP exceeds `max` requests per
 * `windowMs`, otherwise null (caller proceeds normally).
 */
function tooMany(windowMs: number): NextResponse {
  return NextResponse.json({ success: false, error: 'Too many requests. Please wait a minute and try again.' }, {
    status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) },
  });
}

/** Per-route bucket name when the caller gives none: "/api/cappers" and "/api/results" no longer share one. */
function routeScope(request: Request): string {
  try { return new URL(request.url).pathname.replace(/\/+$/, '') || '/'; } catch { return 'unknown-route'; }
}

/**
 * Default: 60 requests per minute per client IP, counted PER ROUTE (QA 2026-11-19: one 30/min
 * bucket shared by every public API let one visitor, or several people behind one shared IP,
 * lock themselves out of the whole site's data for a minute).
 */
export function rateLimitGuard(request: Request, max = 60, windowMs = 60_000, scope = ''): NextResponse | null {
  // Server-rendered pages call these APIs on the visitor's behalf; that render is
  // not the visitor's own API traffic, so it must not spend the per-IP budget
  // (a crawler or an active reader would otherwise get blank pages / 404s).
  // This skips ONLY the rate limit: entitlement still comes from the forwarded cookie.
  // Never for checkout scopes: no page renders a checkout, so the marker has no
  // business there, and a leaked marker must not lift the checkout abuse limits.
  // The render still gets its own, much larger per-visitor bucket, so one client
  // looping page loads cannot drive unbounded upstream (Sheets/ESPN/DB) work.
  if (!scope.includes('checkout') && isInternalSsrRequest(request)) {
    // (no IP at all shares one bucket rather than going unlimited)
    if (isRateLimited(`ssr:${scope || routeScope(request)}:${getClientIp(request)}`, Math.max(max * 8, 240), windowMs)) {
      return tooMany(windowMs);
    }
    return null;
  }
  // `scope` gives a route its own counter, so a strict limit (e.g. guest checkout)
  // is not consumed by, and does not consume, another route's budget.
  const key = `${scope || routeScope(request)}:${getClientIp(request)}`;
  if (isRateLimited(key, max, windowMs)) return tooMany(windowMs);
  return null;
}

// --- Internal SSR marker (rate limit only) ---

export const INTERNAL_SSR_HEADER = 'x-dailyai-ssr';

/**
 * Token our own server-side renders attach to self-fetches. Derived from
 * CRON_SECRET (never sent raw) with a fixed label, so it can only ever mean
 * "skip the per-IP rate limit"; it unlocks no data. No secret => no token.
 */
export function internalSsrToken(): string | null {
  const secret = (process.env.CRON_SECRET ?? '').trim();
  if (!secret) return null;
  return createHmac('sha256', secret).update('dailyai-ssr-rate-limit-v1').digest('hex');
}

export function isInternalSsrRequest(request: Request): boolean {
  const token = internalSsrToken();
  const got = request.headers.get(INTERNAL_SSR_HEADER);
  return !!token && !!got && safeEqual(got, token);
}

// --- Cron / internal auth ---

/** Constant-time string comparison (no early exit on the first differing char). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Fail-closed cron auth (S5/S12). Returns a response to send when the request is
 * NOT authorized, or null when it is. An unset or blank CRON_SECRET refuses
 * everything (500, misconfigured) instead of letting everything through; the
 * header must be exactly `Bearer <secret>` (a bare secret is not accepted).
 */
export function cronAuthGuard(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret.trim()) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const header = request.headers.get('authorization') ?? '';
  if (!safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** True only for a correctly authenticated cron/internal caller (see cronAuthGuard). */
export function isCronAuthorized(request: Request): boolean {
  return cronAuthGuard(request) === null;
}

// --- Auth ---

/**
 * Resolve the authenticated user from either:
 * 1. Authorization: Bearer <token> header (implicit auth flow)
 * 2. Supabase session cookies (PKCE flow)
 *
 * Returns null if not authenticated.
 */
export async function resolveUser(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data } = await sb.auth.getUser(token);
    return data.user;
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// --- Supabase Admin ---

let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

/** Lazy-initialized typed Supabase admin client (service role). */
export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      // Fail loudly — never silently fall back to the anon key for admin ops.
      throw new Error('Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    _supabaseAdmin = createClient<Database>(url, serviceKey);
  }
  return _supabaseAdmin;
}
