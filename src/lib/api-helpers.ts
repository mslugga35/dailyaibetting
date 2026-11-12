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

export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/**
 * Rate-limit guard for public API GET routes.
 * Returns a 429 JSON response when the client IP exceeds `max` requests per
 * `windowMs`, otherwise null (caller proceeds normally).
 */
export function rateLimitGuard(request: Request, max = 30, windowMs = 60_000, scope = ''): NextResponse | null {
  // Server-rendered pages call these APIs on the visitor's behalf; that render is
  // not the visitor's own API traffic, so it must not spend the per-IP budget
  // (a crawler or an active reader would otherwise get blank pages / 404s).
  // This skips ONLY the rate limit: entitlement still comes from the forwarded cookie.
  // Never for checkout scopes: no page renders a checkout, so the marker has no
  // business there, and a leaked marker must not lift the checkout abuse limits.
  if (!scope.includes('checkout') && isInternalSsrRequest(request)) return null;
  // `scope` gives a route its own counter, so a strict limit (e.g. guest checkout)
  // is not consumed by, and does not consume, another route's budget.
  const key = scope ? `${scope}:${getClientIp(request)}` : getClientIp(request);
  if (isRateLimited(key, max, windowMs)) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }
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
