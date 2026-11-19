import { NextResponse } from 'next/server';
import { rateLimitGuard, isRateLimited, getSupabaseAdmin } from '@/lib/api-helpers';
import { normalizeEmail, generateEmailLink, sendLinkEmail } from '@/lib/auth/email-link';

export const dynamic = 'force-dynamic';

/**
 * POST { email, next? } → emails a one-time sign-in link (creates the free account
 * on first use). Same response for new and existing addresses.
 * Limits: 5 requests / 15 min per IP; 3 emails / hour per address (extra requests get ok, no email);
 * at most SITE_HOURLY_LINK_CAP emails / hour site-wide (protects the sender's reputation).
 * Bot checks (no third-party captcha): a hidden `website` field a person never fills in,
 * and `elapsedMs` (time the form was on screen) must be at least 1.5 s. A bot that trips
 * either gets the normal ok answer and no email, so it learns nothing.
 */
const SITE_HOURLY_LINK_CAP = 120;
const MIN_FORM_MS = 1500;
export async function POST(request: Request) {
  const limited = rateLimitGuard(request, 5, 15 * 60_000, 'email-link');
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  }
  const honeypot = typeof body?.website === 'string' && body.website.trim() !== '';
  const elapsed = Number(body?.elapsedMs);
  const tooFast = !Number.isFinite(elapsed) || elapsed < MIN_FORM_MS;
  if (honeypot || tooFast) {
    console.warn('email-link: bot check tripped', honeypot ? 'honeypot' : 'too fast');
    return NextResponse.json({ ok: true });
  }
  // Over the per-address limit: answer exactly like a send (no lockout signal, no
  // hint that the address was requested recently) but send nothing.
  if (isRateLimited(`email-link-addr:${email}`, 3, 60 * 60_000)) {
    return NextResponse.json({ ok: true });
  }
  if (isRateLimited('email-link-site', SITE_HOURLY_LINK_CAP, 60 * 60_000)) {
    console.error('email-link: site-wide hourly cap reached');
    return NextResponse.json({ ok: false, error: 'We could not send the email right now. Please try again in a few minutes.' }, { status: 503 });
  }

  try {
    const { actionLink, isNew } = await generateEmailLink(getSupabaseAdmin(), email, body?.next);
    await sendLinkEmail(email, actionLink, isNew);
  } catch (err) {
    console.error('email-link failed:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ ok: false, error: 'We could not send the email right now. Please try again in a few minutes.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
