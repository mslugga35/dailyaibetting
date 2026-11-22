/**
 * Guest checkout helpers — "pay first, account created after, magic-link to access".
 *
 * Gated behind GUEST_CHECKOUT_ENABLED so nothing changes until ops flips it on
 * AND the Resend sending domain is verified (see docs/GUEST-CHECKOUT-LAUNCH.md).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { allowedPriceIds, hasDailyAiPrice } from '@/lib/stripe-prices';

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

/** True when this Stripe customer has EVER had a DailyAI subscription (any status): no second free trial. */
export async function hasEverSubscribed(stripe: Stripe, customerId: string): Promise<boolean> {
  return (await dailyAiSubscriptions(stripe, customerId)).length > 0;
}

/**
 * True when ANY Stripe customer with this email has ever had a DailyAI subscription.
 * Stripe does not dedupe customers by email: a guest checkout and a later signed-in
 * checkout create two customers for one person, and each alone looks "new". One free
 * trial per person means checking all of them. (Different email addresses for one
 * person are caught later by the card-fingerprint check in the webhook.)
 */
export async function hasEverSubscribedByEmail(
  stripe: Stripe,
  email: string | null | undefined,
  callerUserId?: string | null,
  userExists?: UserExists,
): Promise<boolean> {
  // G1: a customer of ANOTHER existing user (its email edited to this one) does not use up this user's trial.
  const ids: string[] = [];
  for (const c of await customersByEmail(stripe, email)) {
    if (await ownedByOtherExistingUser(c, callerUserId, userExists)) {
      console.error(`[billing-alert] email_conflict_other_user customer=${c.id} user=${callerUserId} context=trial`);
      continue;
    }
    ids.push(c.id);
  }
  const subs = await Promise.all(ids.map((id) => dailyAiSubscriptions(stripe, id)));
  return subs.some((x) => x.length > 0);
}

/** Resolves whether a Supabase user id still exists; throws when that cannot be determined. */
export type UserExists = (userId: string) => Promise<boolean>;

/**
 * F3/G1/N4: true when the customer belongs to a DIFFERENT user (server-set metadata.user_id) who still
 * exists. A customer email is editable by its owner, so such a match proves nothing about the caller. A
 * tag naming a user that no longer exists (account deleted and re-created with the same email) is the
 * caller's own history: false. No user_id (guest/legacy), the caller's own id, or no lookup: false.
 * A lookup error throws (callers fail closed).
 */
async function ownedByOtherExistingUser(c: Stripe.Customer, callerUserId?: string | null, userExists?: UserExists): Promise<boolean> {
  const owner = (c.metadata?.user_id || '').trim();
  if (!owner || !callerUserId || owner === callerUserId || !userExists) return false;
  return userExists(owner);
}

/** A value for a single-quoted Stripe search string: backslash and quote escaped with a backslash. */
export function stripeSearchQuote(value: string): string {
  return `'${value.replace(/[\\']/g, (c) => `\\${c}`)}'`;
}

/**
 * Every Stripe customer id whose email equals this one, ignoring case.
 * customers.list's email filter is case-sensitive, so the exact and lower-cased values are listed
 * (immediately consistent) AND customers.search `email:'...'` is asked (case-insensitive, finds
 * "John@X.com" for "john@x.com", but eventually consistent, ~1 minute). Search's `:` on a string
 * field also matches values that merely CONTAIN the words, so its hits are kept only on an exact
 * case-insensitive match. Any failure throws: callers fail closed.
 */
export async function customersByEmail(stripe: Stripe, email: string | null | undefined): Promise<Stripe.Customer[]> {
  const e = (email || '').trim();
  if (!e) return [];
  const want = e.toLowerCase();
  const variants = Array.from(new Set([e, want]));
  const [lists, found] = await Promise.all([
    Promise.all(variants.map((v) => stripe.customers.list({ email: v, limit: 100 }))),
    stripe.customers.search({ query: `email:${stripeSearchQuote(want)}`, limit: 100 }),
  ]);
  const searched = found.data.filter((c) => (c.email || '').trim().toLowerCase() === want);
  const byId = new Map<string, Stripe.Customer>();
  for (const c of [...lists.flatMap((l) => l.data), ...searched]) if (!byId.has(c.id)) byId.set(c.id, c);
  return [...byId.values()];
}

const ALIVE = new Set(['active', 'trialing', 'past_due', 'unpaid']);

/**
 * DAI-13: a live DailyAI subscription (active / trialing / past_due / unpaid) on ANY Stripe
 * customer with this email, other than `exceptCustomerId` (the user's own mapped customer, which
 * has its own check). A payer whose login is not mapped to their Stripe customer must not be
 * able to buy a second subscription. Only DailyAI prices count: the Stripe account is shared.
 * Returns the customer id holding it, or null.
 *
 * F3: a customer's email is editable by the customer (Billing Portal), so an email match alone must not
 * lock a user out. A holder customer that belongs to a DIFFERENT user (server-set metadata.user_id) is
 * logged (ids only) and skipped, but only while that user still exists (N4); the caller's own
 * mapped-customer check and the webhook's duplicate backstop still apply. A holder with no user_id
 * (guest/legacy), the caller's own user_id, or a user_id that no longer exists still blocks.
 */
export async function findLiveSubscriptionCustomerByEmail(
  stripe: Stripe,
  email: string | null | undefined,
  exceptCustomerId?: string | null,
  callerUserId?: string | null,
  userExists?: UserExists,
): Promise<string | null> {
  const customers = (await customersByEmail(stripe, email)).filter((c) => c.id !== exceptCustomerId);
  for (const c of customers) {
    if (!(await dailyAiSubscriptions(stripe, c.id)).some((s) => ALIVE.has(s.status))) continue;
    if (await ownedByOtherExistingUser(c, callerUserId, userExists)) {
      console.error(`[billing-alert] email_conflict_other_user customer=${c.id} user=${callerUserId}`);
      continue;
    }
    return c.id;
  }
  return null;
}

/**
 * The customer's DailyAI subscriptions (any status). The Stripe account is shared
 * with other products and customers are matched by email, so another product's
 * subscription must neither use up the DailyAI trial nor block a DailyAI checkout.
 * With no price configured, every subscription counts (conservative).
 */
async function dailyAiSubscriptions(stripe: Stripe, customerId: string): Promise<Stripe.Subscription[]> {
  const allowed = allowedPriceIds();
  // One customer never holds anywhere near 100 subscriptions on this account.
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
  return subs.data.filter((sub) => allowed.size === 0 || hasDailyAiPrice(sub, allowed));
}

/**
 * True when the customer already holds a subscription that is still alive:
 * active, trialing, or in payment trouble (past_due / unpaid). A customer in
 * payment trouble must fix their card in the billing portal, not buy a second
 * subscription (B11). Stripe lets you stack multiple subs on one customer, so
 * without this guard a repeat checkout silently double-charges the same card
 * (this happened on 2026-05-29 — two live $20/mo subs on one customer).
 */
export async function hasActiveSubscription(stripe: Stripe, customerId: string): Promise<boolean> {
  const alive = new Set(['active', 'trialing', 'past_due', 'unpaid']);
  return (await dailyAiSubscriptions(stripe, customerId)).some((s) => alive.has(s.status));
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
          <p>Your DailyAI Pro access is active. Tap below to see your picks. No password needed.</p>
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

/**
 * Sent when a new free trial was cancelled because its card already had a DailyAI free
 * trial. Checkout showed "$0 due today", so nothing was charged; this says so plainly and
 * points to subscribing without a trial. Wording is a draft for owner/counsel review.
 */
export async function sendTrialNotAvailableEmail(email: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `DailyAI Betting <${from}>`,
      to: [email],
      subject: 'Your DailyAI free trial could not be started (no charge)',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
          <h2>Your free trial was not started</h2>
          <p>The payment card you used has already been used for a DailyAI free trial, and each card can start one free trial.</p>
          <p><strong>We cancelled the new trial and you have not been charged.</strong> No future charge is scheduled.</p>
          <p>You can still subscribe to DailyAI Pro without a trial:</p>
          <p style="margin:28px 0">
            <a href="${baseUrl}/pricing" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">See plans</a>
          </p>
          <p style="color:#666;font-size:13px">Questions? Email support@dailyaibetting.com.</p>
        </div>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend send failed (${res.status}): ${await res.text()}`);
  }
}
