import { NextResponse } from 'next/server';
import { rateLimitGuard, isRateLimited, getSupabaseAdmin } from '@/lib/api-helpers';
import { normalizeEmail, generateEmailLink, sendLinkEmail, LINK_COOLDOWN_MS } from '@/lib/auth/email-link';
import { createLinkCooldown } from '@/lib/auth/link-token';

export const dynamic = 'force-dynamic';

/**
 * POST { email, next? } → emails a one-time sign-in link (creates the free account
 * on first use). Same response for new and existing addresses.
 * Limits: 10 requests / 15 min per IP; 1 link / minute and 3 emails / hour per address (extra requests get ok, no email);
 * at most SITE_HOURLY_LINK_CAP emails / hour site-wide (protects the sender's reputation).
 * Bot checks (no third-party captcha): a hidden `website` field a person never fills in,
 * and `elapsedMs` (time the form was on screen) must be at least 1.5 s. A bot that trips
 * either gets the normal ok answer and no email, so it learns nothing.
 */
const SITE_HOURLY_LINK_CAP = 120;
const MIN_FORM_MS = 1500;
// Per process (pm2 runs one instance), like the other limits here.
const cooldown = createLinkCooldown(LINK_COOLDOWN_MS);
export async function POST(request: Request) {
  // 10 per 15 min per IP (was 5): households and offices share one IP. Per-address (3/h) and
  // site-wide (120/h) caps below still bound the email volume.
  const limited = rateLimitGuard(request, 10, 15 * 60_000, 'email-link');
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
  // One link per address per minute (DAI-05): a double click or a quick resend would cancel
  // the first link while its email is still on the way, and the two emails can arrive in
  // either order. Checked before the hourly limit so a duplicate click uses no quota.
  // Same ok answer as a send; the first email (still valid) is the one to use.
  const slot = cooldown.claim(email);
  if (!slot) {
    return NextResponse.json({ ok: true });
  }
  // Over the per-address limit: answer exactly like a send (no lockout signal, no
  // hint that the address was requested recently) but send nothing.
  if (isRateLimited(`email-link-addr:${email}`, 3, 60 * 60_000)) {
    return NextResponse.json({ ok: true });
  }
  if (isRateLimited('email-link-site', SITE_HOURLY_LINK_CAP, 60 * 60_000)) {
    console.error('email-link: site-wide hourly cap reached');
    cooldown.release(email, slot);
    return NextResponse.json({ ok: false, error: 'We could not send the email right now. Please try again in a few minutes.' }, { status: 503 });
  }

  try {
    const { actionLink, isNew, issuedAt } = await generateEmailLink(getSupabaseAdmin(), email, body?.next);
    await sendLinkEmail(email, actionLink, isNew, issuedAt);
  } catch (err) {
    cooldown.release(email, slot); // nothing reached the inbox: let the person retry right away
    console.error('email-link failed:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ ok: false, error: 'We could not send the email right now. Please try again in a few minutes.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
