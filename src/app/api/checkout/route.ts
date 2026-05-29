import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { resolveUser, getSupabaseAdmin } from '@/lib/api-helpers';
import { isProStatus, TRIAL_DAYS } from '@/lib/constants/subscription';
import {
  isGuestCheckoutEnabled,
  isValidGuestEmail,
  findOrCreateStripeCustomer,
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
      const guestEmail = String(body?.guestEmail || '').trim().toLowerCase();
      if (!isValidGuestEmail(guestEmail)) {
        return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
      }
      const customerId = await findOrCreateStripeCustomer(stripe, guestEmail);
      const guestSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        // Omit payment_method_types so Stripe auto-enables Apple Pay / Google Pay / Link.
        line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
        subscription_data: {
          trial_period_days: TRIAL_DAYS,
          metadata: { guest_email: guestEmail },
        },
        metadata: { guest_email: guestEmail },
        success_url: `${baseUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}&guest=1`,
        cancel_url: `${baseUrl}/pro`,
        allow_promotion_codes: true,
      });
      return NextResponse.json({ url: guestSession.url, guest: true });
    }

    const db = getSupabaseAdmin();
    const { data: existing } = await db
      .from('user_subscriptions')
      .select('status, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (isProStatus(existing?.status)) {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 });
    }

    let customerId = existing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await db.from('user_subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: 'incomplete',
      }, { onConflict: 'user_id' });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      // Omit payment_method_types so Stripe auto-enables Apple Pay, Google Pay,
      // and Link (one-tap) per the Dashboard's automatic payment methods setting.
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { user_id: user.id },
      },
      metadata: { user_id: user.id },
      success_url: `${baseUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pro`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
