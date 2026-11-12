import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/subscription';
import { resolveUser } from '@/lib/api-helpers';

/**
 * Server-verified admin authorization (S4). Replaces the old client-side
 * public admin-password env gate, whose value shipped in the browser bundle.
 *
 * An email address alone proves nothing, so an admin must:
 *   1. hold a session the Supabase AUTH SERVER validates (auth.getUser(), not a
 *      cookie decode), so the identity comes from Supabase, not from the request;
 *   2. have a CONFIRMED email (email_confirmed_at set), so nobody can sign up
 *      with an admin's address and inherit the role;
 *   3. be listed by immutable Supabase user id in ADMIN_USER_IDS AND by email in
 *      ADMIN_EMAILS (both comma-separated, server-only env). The id is REQUIRED: an
 *      email can be pre-registered or case-folded; a user id cannot be chosen.
 * Either list unset = no admins (fails closed). Supabase "Confirm email" must be on.
 */

type AuthUser = { id: string; email?: string | null; email_confirmed_at?: string | null };

function list(name: string): Set<string> {
  return new Set(
    (process.env[name] || '')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  if (!user?.id || !user.email || !user.email_confirmed_at) return false;
  const emails = list('ADMIN_EMAILS');
  if (emails.size === 0 || !emails.has(user.email.trim().toLowerCase())) return false;
  const ids = list('ADMIN_USER_IDS');
  if (ids.size === 0 || !ids.has(user.id.toLowerCase())) return false;
  return true;
}

/** For server components/pages: the admin user, or null (also null on an auth outage). */
export async function getAdminUser() {
  try {
    const user = await getCurrentUser();
    return isAdminUser(user) ? user : null;
  } catch {
    return null;
  }
}

/**
 * For API routes. Returns a response to send when the caller is NOT an admin, or
 * null when they are. State-changing requests must also come from this site
 * (Origin check) so a logged-in admin's cookies cannot be used cross-site.
 */
export async function adminGuard(request: Request): Promise<NextResponse | null> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    let sameOrigin = false;
    try { sameOrigin = !!origin && !!host && new URL(origin).host === host; } catch { sameOrigin = false; }
    if (!sameOrigin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let user: AuthUser | null = null;
  try {
    user = await resolveUser(request);
  } catch {
    return NextResponse.json({ error: 'Could not verify identity' }, { status: 503 });
  }
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}
