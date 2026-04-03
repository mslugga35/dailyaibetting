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

export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
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
    _supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}
