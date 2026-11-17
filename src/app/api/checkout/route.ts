import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { resolveUser, getSupabaseAdmin, rateLimitGuard, isRateLimited } from '@/lib/api-helpers';
import { isProStatus } from '@/lib/constants/subscription';
import { getUserSubscription, EntitlementUnavailableError } from '@/lib/auth/subscription';
import {
  isGuestCheckoutEnabled,
  isValidGuestEmail,
  findOrCreateStripeCustomer,
  hasActiveSubscription,
  hasEverSubscribed,
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

const SOLD_OUT = {
  sold_out: 'All Founding Member spots are taken. New Pro signups reopen soon.',
  returning: 'The Founding Member price is for new founding members. New Pro signups at the regular price open soon.',
  busy: 'Founding Member checkouts are busy right now. Please try again in a few minutes.',
} as const;

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
}): Promise<NextResponse> {
  const choice = await chooseCheckoutPlan(opts.customerId, opts.userId);
  if (!choice.ok) {
    return NextResponse.json({ error: SOLD_OUT[choice.reason], soldOut: choice.reason !== 'busy' }, { status: 409 });
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
    metadata,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    // A promotion code on top of the founding price is not part of the offer, and a
    // 100%-off code would make a "paying" seat that never pays.
    allow_promotion_codes: !founding,
  };
  if (founding) {
    const copy = offerCopy({ mode: 'founding', plan: 'founding', amountCents: PLANS.founding.cents, trialDays: trialDays ?? 0, founding: null });
    params.expires_at = Math.floor(Date.now() / 1000) + FOUNDING_SESSION_SECONDS;
    params.subscription_data!.description = `DailyAI Pro – Founding Member (${copy.price}, locked while your subscription stays active)`;
    params.custom_text = { submit: { message: `${copy.terms} ${copy.lock} ${CANCEL_POLICY}`.slice(0, 1200) } };
  } else if (choice.plan === 'regular') {
    const copy = offerCopy({ mode: 'regular', plan: 'regular', amountCents: PLANS.regular.cents, trialDays: trialDays ?? 0, founding: null });
    params.custom_text = { submit: { message: `${copy.terms} ${copy.renewal}`.slice(0, 1200) } };
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
  if (choice.seatId != null) {
    const expires = (session.expires_at ?? params.expires_at ?? 0) + FOUNDING_HOLD_GRACE_SECONDS;
    await transitionFoundingSeat({
      event: 'session', seatId: choice.seatId, sessionId: session.id,
      holdUntil: new Date(expires * 1000).toISOString(),
    });
  }
  return NextResponse.json(opts.guestEmail ? { url: session.url, guest: true } : { url: session.url });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await resolveUser(request);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';

    // --- Guest checkout: pay first, account created by the webhook afterward ---
    if (!user) {
      if (!isGuestCheckoutEnabled()) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      // B10: each guest attempt creates/looks up a Stripe customer; cap it per client.
      const limited = rateLimitGuard(request, 5, 10 * 60_000, 'guest-checkout');
      if (limited) return limited;
      const guestEmail = String(body?.guestEmail || '').trim().toLowerCase();
      if (!isValidGuestEmail(guestEmail)) {
        return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
      }
      // ...and per email, so rotating IPs cannot spray Stripe customers for one address.
      const emailKey = guestEmail.replace(/\+[^@]*(?=@)/, ''); // a+1@x and a+2@x share one budget
      if (isRateLimited(`guest-checkout-email:${emailKey}`, 3, 60 * 60_000)) {
        return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
      }
      const customerId = await findOrCreateStripeCustomer(stripe, guestEmail);
      // Block a repeat checkout on a customer that's already paying — prevents
      // stacking duplicate subscriptions (double-charge) on the same card.
      if (await hasActiveSubscription(stripe, customerId)) {
        return NextResponse.json({ error: 'This email already has an active subscription' }, { status: 400 });
      }
      // The free trial is for first-time subscribers only.
      return await createCheckout({
        customerId,
        userId: null,
        guestEmail,
        trialEligible: !(await hasEverSubscribed(stripe, customerId)),
        successUrl: `${baseUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}&guest=1`,
        cancelUrl: `${baseUrl}/pro`,
        expectedCents: parseExpectedCents(body?.expectedCents),
      });
    }

    // Signed-in users: cap checkout attempts per account (each can create a Stripe session).
    if (isRateLimited(`checkout-user:${user.id}`, 10, 10 * 60_000)) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
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

    let customerId = existing.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
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
    const trialEligible = !(existing.stripeSubscriptionId || (await hasEverSubscribed(stripe, customerId)));
    return await createCheckout({
      customerId,
      userId: user.id,
      guestEmail: null,
      trialEligible,
      successUrl: `${baseUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pro`,
      expectedCents: parseExpectedCents(body?.expectedCents),
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
