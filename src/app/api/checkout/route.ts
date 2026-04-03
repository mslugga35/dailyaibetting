import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { resolveUser, getSupabaseAdmin } from '@/lib/api-helpers';
import { isProStatus, TRIAL_DAYS } from '@/lib/constants/subscription';

export async function POST(request: Request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';

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
      payment_method_types: ['card'],
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
