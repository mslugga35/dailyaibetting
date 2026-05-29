import { NextResponse } from 'next/server';
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
export function rateLimitGuard(request: Request, max = 30, windowMs = 60_000): NextResponse | null {
  if (isRateLimited(getClientIp(request), max, windowMs)) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }
  return null;
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
