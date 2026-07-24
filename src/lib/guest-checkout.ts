/**
 * Guest checkout helpers — "pay first, account created after, magic-link to access".
 *
 * Gated behind GUEST_CHECKOUT_ENABLED so nothing changes until ops flips it on
 * AND the Resend sending domain is verified (see docs/GUEST-CHECKOUT-LAUNCH.md).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

/** Feature flag — guest checkout is OFF unless explicitly enabled. */
export function isGuestCheckoutEnabled(): boolean {
  return process.env.GUEST_CHECKOUT_ENABLED === 'true';
}

/** Reuse the same lightweight email check used elsewhere in the app. */
export function isValidGuestEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Find the existing Stripe customer for this email or create one.
 * Stripe does NOT dedupe by email, so we must look up first (per Stripe docs).
 */
export async function findOrCreateStripeCustomer(stripe: Stripe, email: string): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const created = await stripe.customers.create({ email });
  return created.id;
}

/**
 * True if this Stripe customer already has a subscription that is billing them
 * (active or trialing). Stripe lets you stack multiple subs on one customer, so
 * without this guard a repeat checkout silently double-charges the same card
 * (this happened on 2026-05-29 — two live $20/mo subs on one customer).
 */
export async function hasActiveSubscription(stripe: Stripe, customerId: string): Promise<boolean> {
  for (const status of ['active', 'trialing'] as const) {
    const subs = await stripe.subscriptions.list({ customer: customerId, status, limit: 1 });
    if (subs.data.length > 0) return true;
  }
  return false;
}

/**
 * Ensure a Supabase auth user exists for this email and mint a one-time magic
 * link they can use to sign in. Works whether the user is brand-new or already
 * exists (idempotent — safe across Stripe webhook retries).
 *
 * Returns the user id (for granting the subscription) + the magic-link URL.
 */
export async function provisionGuestAndMagicLink(
  admin: SupabaseClient,
  email: string,
  redirectTo: string,
): Promise<{ userId: string; actionLink: string }> {
  // Create the user (auto-confirmed). If they already exist, this errors — that's fine,
  // generateLink below still returns the existing user.
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  let userId = created.data?.user?.id ?? null;

  const link = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });
  if (link.error) {
    throw new Error(`generateLink failed for ${email}: ${link.error.message}`);
  }
  if (!userId) userId = link.data?.user?.id ?? null;
  const actionLink = link.data?.properties?.action_link ?? null;

  if (!userId || !actionLink) {
    throw new Error(`Could not provision guest user for ${email}`);
  }
  return { userId, actionLink };
}

/**
 * Send the magic-link access email via Resend's REST API (no SDK dependency).
 * NOTE: until the sending domain is verified in Resend, EMAIL_FROM must be the
 * sandbox address and delivery only works to your own Resend account email.
 */
export async function sendGuestAccessEmail(email: string, actionLink: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `DailyAI Betting <${from}>`,
      to: [email],
      subject: 'Your DailyAI Pro access is ready 🔥',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
          <h2>You're in. Welcome to DailyAI Pro.</h2>
          <p>Your payment went through — tap below to access your picks. No password needed.</p>
          <p style="margin:28px 0">
            <a href="${actionLink}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Access your picks</a>
          </p>
          <p style="color:#666;font-size:13px">This link signs you in automatically and expires soon. If it expires, just request a new one from the sign-in page.</p>
        </div>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend send failed (${res.status}): ${await res.text()}`);
  }
}
