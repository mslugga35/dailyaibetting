import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createHash } from 'crypto';
import { resolveUser, getSupabaseAdmin, rateLimitGuard, isRateLimited, getClientIp } from '@/lib/api-helpers';
import { holdLimitReached, recordHold } from '@/lib/pricing/hold-limit';
import { isProStatus } from '@/lib/constants/subscription';
import { getUserSubscription, EntitlementUnavailableError } from '@/lib/auth/subscription';
import {
  isGuestCheckoutEnabled,
  isValidGuestEmail,
  findOrCreateStripeCustomer,
  hasActiveSubscription,
  hasEverSubscribed,
  hasEverSubscribedByEmail,
  findLiveSubscriptionCustomerByEmail,
} from '@/lib/guest-checkout';
import {
  chooseCheckoutPlan,
  transitionFoundingSeat,
  FOUNDING_SESSION_SECONDS,
  FOUNDING_HOLD_GRACE_SECONDS,
  PricingConfigError,
} from '@/lib/pricing/offer';
import { offerCopy, formatMonthly, PLANS, CANCEL_POLICY } from '@/lib/pricing/plans';

/** Optional `expectedCents` from the page (bounded integer), else null. */
function parseExpectedCents(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 100000 ? n : null;
}
import type Stripe from 'stripe';

const BUSY = 'Founding Member checkouts are busy right now. Please try again in a few minutes, or subscribe at the regular price.';
const IP_BUSY = 'Too many Founding Member checkouts were started from your network. Please try again later, or subscribe at the regular price.';

/**
 * Create the Checkout Session for the plan on sale. Founding: a seat is reserved
 * first (atomic, capped); the session expires in 31 minutes and the hold outlives it,
 * so an abandoned checkout frees its seat and a session can never complete on a
 * released seat. Returns a NextResponse.
 */
async function createCheckout(opts: {
  customerId: string;
  userId: string | null;
  guestEmail: string | null;
  trialEligible: boolean;
  successUrl: string;
  cancelUrl: string;
  /** Monthly cents the page showed the customer; checkout refuses to charge anything else. */
  expectedCents: number | null;
  /** Client asked for the regular price instead of a Founding seat. */
  forceRegular?: boolean;
  /** Client IP, for the per-IP limit on new seat holds. */
  ip?: string;
}): Promise<NextResponse> {
  const choice = await chooseCheckoutPlan(opts.customerId, opts.userId, { forceRegular: opts.forceRegular });
  if (!choice.ok) {
    // regularPriceAvailable: the UI can offer the regular price (POST again with plan: 'regular').
    return NextResponse.json({ error: BUSY, busy: true, regularPriceAvailable: true }, { status: 409 });
  }
  if (opts.expectedCents != null && opts.expectedCents !== PLANS[choice.plan].cents) {
    // The price changed since the page loaded (mode flipped, spots ran out, returning member).
    if (choice.seatId != null && choice.newSeat) {
      await transitionFoundingSeat({ event: 'abandon', seatId: choice.seatId }).catch(() => {});
    }
    return NextResponse.json({
      error: `The price is now ${formatMonthly(PLANS[choice.plan].cents)}. Please review it and try again.`,
      priceChanged: true,
      amountCents: PLANS[choice.plan].cents,
    }, { status: 409 });
  }
  // DAI-14: one network cannot park many unpaid Founding seats. Only NEW holds count (an existing
  // hold of this customer is reused, not added), which is only known after the atomic reserve, so the
  // check follows it and gives back a seat it refuses. The hold is RECORDED only after the Checkout
  // Session exists. Unknown client IP: no limit (it would put every unknown client in one bucket).
  // Residual: concurrent requests can pass the check together, overshooting by a request or two.
  const limitIp = choice.seatId != null && choice.newSeat && opts.ip && opts.ip !== 'unknown' ? opts.ip : null;
  if (choice.seatId != null && choice.newSeat && !limitIp) console.warn('[checkout] founding hold limit skipped: client IP unknown');
  if (limitIp && holdLimitReached(limitIp)) {
    await transitionFoundingSeat({ event: 'abandon', seatId: choice.seatId }).catch(() => {});
    return NextResponse.json({ error: IP_BUSY, busy: true, regularPriceAvailable: true }, { status: 429, headers: { 'Retry-After': '1800' } });
  }
  const trialDays = opts.trialEligible && choice.firstTimeTrialDays > 0 ? choice.firstTimeTrialDays : undefined;
  const ids: Record<string, string> = opts.userId ? { user_id: opts.userId } : { guest_email: opts.guestEmail || '' };
  const founding = choice.plan === 'founding';
  // Legacy mode keeps exactly the metadata it always had.
  const metadata: Record<string, string> = {
    ...ids,
    ...(choice.plan !== 'legacy' ? { plan: choice.plan } : {}),
    ...(choice.seatId != null ? { founding_seat_id: String(choice.seatId) } : {}),
  };

  const params: Stripe.Checkout.SessionCreateParams = {
    customer: opts.customerId,
    mode: 'subscription',
    // Omit payment_method_types so Stripe auto-enables Apple Pay, Google Pay,
    // and Link (one-tap) per the Dashboard's automatic payment methods setting.
    line_items: [{ price: choice.priceId, quantity: 1 }],
    subscription_data: {
      ...(trialDays ? { trial_period_days: trialDays } : {}),
      metadata,
    },
    // app: marks DailyAI sessions on the shared Stripe account so expiry never touches another product's.
    metadata: { ...metadata, app: 'dailyai' },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    // A promotion code on top of the founding price is not part of the offer, and a
    // 100%-off code would make a "paying" seat that never pays.
    allow_promotion_codes: !founding,
    // Names the product at the top of Checkout; the Stripe account is shared with other products.
    branding_settings: { display_name: 'DailyAI Betting' },
  };
  if (founding) {
    const copy = offerCopy({ mode: 'founding', plan: 'founding', amountCents: PLANS.founding.cents, trialDays: trialDays ?? 0, founding: null });
    params.expires_at = Math.floor(Date.now() / 1000) + FOUNDING_SESSION_SECONDS;
    params.subscription_data!.description = `DailyAI Pro – Founding Member (${copy.price}, locked while your subscription stays active)`;
    params.custom_text = { submit: { message: [CHECKOUT_BRAND_LINE, copy.terms, copy.firstChargeRelative, copy.trialRule, copy.lock, CANCEL_POLICY].filter(Boolean).join(' ').slice(0, 1200) } };
  } else if (choice.plan === 'regular') {
    const copy = offerCopy({ mode: 'regular', plan: 'regular', amountCents: PLANS.regular.cents, trialDays: trialDays ?? 0, founding: null });
    params.custom_text = { submit: { message: [CHECKOUT_BRAND_LINE, copy.terms, copy.firstChargeRelative, copy.trialRule, copy.renewal].filter(Boolean).join(' ').slice(0, 1200) } };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(params);
  } catch (err) {
    // Give back a seat this request just reserved (not one an earlier open checkout holds).
    if (choice.seatId != null && choice.newSeat) {
      await transitionFoundingSeat({ event: 'abandon', seatId: choice.seatId }).catch(() => {});
    }
    throw err;
  }
  if (limitIp) recordHold(limitIp);
  if (choice.seatId != null) {
    const expires = (session.expires_at ?? params.expires_at ?? 0) + FOUNDING_HOLD_GRACE_SECONDS;
    await transitionFoundingSeat({
      event: 'session', seatId: choice.seatId, sessionId: session.id,
      holdUntil: new Date(expires * 1000).toISOString(),
    });
  }
  // DAI-11: one open Checkout per user. Older open sessions of this customer are expired AFTER the new
  // one is bound to the seat (an expiry event releases a seat only for the session bound to it).
  // Only sessions older than this one, so two concurrent requests leave exactly one open.
  // Residual race (documented, not fixed): two requests whose list calls run before either session is
  // created can both leave their session open for a sub-second window; the webhook's duplicate-subscription
  // alert (and optional trial cancel) is the backstop if both are completed.
  if (opts.userId) await expireOlderOpenSessions(opts.customerId, opts.userId, session).catch((e) => console.error('[checkout] expire older sessions failed:', (e as { message?: string })?.message));
  return NextResponse.json(opts.guestEmail ? { url: session.url, guest: true } : { url: session.url });
}

async function expireOlderOpenSessions(customerId: string, userId: string, keep: Stripe.Checkout.Session) {
  const open = await stripe.checkout.sessions.list({ customer: customerId, status: 'open', limit: 100 });
  for (const s of open.data) {
    if (s.id === keep.id || s.mode !== 'subscription' || s.metadata?.app !== 'dailyai' || s.metadata?.user_id !== userId) continue;
    const older = (s.created ?? 0) < (keep.created ?? 0) || ((s.created ?? 0) === (keep.created ?? 0) && s.id < keep.id);
    if (!older) continue;
    try { await stripe.checkout.sessions.expire(s.id); } catch { /* already expired or completed */ }
  }
}

/**
 * The Stripe account's public name is shared with other businesses (it reads as the
 * owner's name), so Checkout names the product itself in the text under the button.
 */
const CHECKOUT_BRAND_LINE = 'You are subscribing to DailyAI Pro from DailyAI Betting (dailyaibetting.com).';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await resolveUser(request);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';

    // Owner decision 2026-11-19: checkout (and with it a Founding seat hold) needs a signed-in
    // account with a confirmed email. Anonymous "guest" checkout is off regardless of
    // GUEST_CHECKOUT_ENABLED, so visitors cannot reserve seats without an account.
    if (!user) {
      return NextResponse.json({ error: 'Sign in to start your free trial.', signIn: true }, { status: 401 });
    }
    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: 'Confirm your email address before subscribing.' }, { status: 403 });
    }

    // Signed-in users: cap checkout attempts per account (each can create a Stripe session).
    if (isRateLimited(`checkout-user:${user.id}`, 10, 10 * 60_000)) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '600' } });
    }

    const db = getSupabaseAdmin();
    // If the subscription cannot be read we do not know whether this user already
    // pays: stop before any Stripe call rather than risk a second subscription.
    let existing;
    try {
      existing = await getUserSubscription(user.id);
    } catch (err) {
      if (err instanceof EntitlementUnavailableError) {
        return NextResponse.json(
          { error: 'We could not verify your subscription right now. Please try again in a moment.', entitlement: 'unknown' },
          { status: 503, headers: { 'Retry-After': '30' } },
        );
      }
      throw err;
    }

    if (isProStatus(existing.status)) {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 });
    }
    // B11: a subscriber with a failed payment keeps their subscription; they need to
    // update their card, not start a second subscription.
    if (existing.status === 'past_due') {
      return NextResponse.json(
        { error: 'Your subscription has a payment problem. Update your card under Account > Manage Subscription.', manage: true },
        { status: 409 },
      );
    }

    // DAI-13: the login may not be mapped to the payer's Stripe customer. If any Stripe customer with
    // this email already holds a live DailyAI subscription, a second one must not be sold.
    const holder = await findLiveSubscriptionCustomerByEmail(stripe, user.email, existing.stripeCustomerId);
    if (holder) {
      console.error(`[billing-alert] checkout_refused_existing_subscription user=${user.id} customer=${holder}`);
      return NextResponse.json(
        { error: 'This email already has a DailyAI subscription. Manage it under Account > Manage Subscription, or contact support@dailyaibetting.com and we will link it to your login.', manage: true, existingSubscription: true },
        { status: 409 },
      );
    }

    let customerId = existing.stripeCustomerId;
    if (!customerId) {
      // DAI-11: idempotency key from the user id, so two concurrent first checkouts get ONE customer.
      const emailTag = createHash('sha256').update((user.email || '').toLowerCase()).digest('hex').slice(0, 12);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      }, { idempotencyKey: `dai-customer:${user.id}:${emailTag}` });
      customerId = customer.id;

      // Persist the customer id so a retried checkout reuses it (B3). 'inactive' is the
      // valid not-yet-paying status ('incomplete' violates the status CHECK constraint
      // and the write used to fail silently, creating a new customer on every retry).
      const { error: placeholderError } = await db.from('user_subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: 'inactive',
      }, { onConflict: 'user_id' });
      if (placeholderError) throw placeholderError;
    }

    // DB status can lag the webhook — verify against Stripe before creating a
    // second session so we never stack duplicate subs on the same customer.
    if (await hasActiveSubscription(stripe, customerId)) {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 });
    }

    // The free trial is for first-time subscribers only (no new trial after cancelling).
    const trialEligible = !(existing.stripeSubscriptionId
      || (await hasEverSubscribed(stripe, customerId))
      || (await hasEverSubscribedByEmail(stripe, user.email)));
    return await createCheckout({
      customerId,
      userId: user.id,
      guestEmail: null,
      trialEligible,
      successUrl: `${baseUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pro`,
      expectedCents: parseExpectedCents(body?.expectedCents),
      forceRegular: body?.plan === 'regular',
      ip: getClientIp(request),
    });
  } catch (error) {
    const e = error as { code?: string; message?: string } | null;
    if (error instanceof PricingConfigError) console.error('Checkout pricing config error:', e?.message);
    console.error('Checkout error:', e?.code || '(no code)', e?.message || String(error));
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
