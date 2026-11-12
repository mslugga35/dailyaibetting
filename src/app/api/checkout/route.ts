import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { resolveUser, getSupabaseAdmin, rateLimitGuard, isRateLimited } from '@/lib/api-helpers';
import { isProStatus, TRIAL_DAYS } from '@/lib/constants/subscription';
import { getUserSubscription, EntitlementUnavailableError } from '@/lib/auth/subscription';
import {
  isGuestCheckoutEnabled,
  isValidGuestEmail,
  findOrCreateStripeCustomer,
  hasActiveSubscription,
  hasEverSubscribed,
} from '@/lib/guest-checkout';

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
      const guestTrial = (await hasEverSubscribed(stripe, customerId)) ? undefined : TRIAL_DAYS;
      const guestSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        // Omit payment_method_types so Stripe auto-enables Apple Pay / Google Pay / Link.
        line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
        subscription_data: {
          ...(guestTrial ? { trial_period_days: guestTrial } : {}),
          metadata: { guest_email: guestEmail },
        },
        metadata: { guest_email: guestEmail },
        success_url: `${baseUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}&guest=1`,
        cancel_url: `${baseUrl}/pro`,
        allow_promotion_codes: true,
      });
      return NextResponse.json({ url: guestSession.url, guest: true });
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
    const trialDays = existing.stripeSubscriptionId || (await hasEverSubscribed(stripe, customerId))
      ? undefined
      : TRIAL_DAYS;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      // Omit payment_method_types so Stripe auto-enables Apple Pay, Google Pay,
      // and Link (one-tap) per the Dashboard's automatic payment methods setting.
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      subscription_data: {
        ...(trialDays ? { trial_period_days: trialDays } : {}),
        metadata: { user_id: user.id },
      },
      metadata: { user_id: user.id },
      success_url: `${baseUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pro`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const e = error as { code?: string; message?: string } | null;
    console.error('Checkout error:', e?.code || '(no code)', e?.message || String(error));
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
