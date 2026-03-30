import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user already has an active subscription
    const { data: existing } = await supabase
      .from('user_subscriptions')
      .select('status, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (existing?.status === 'active' || existing?.status === 'trialing') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';

    // Create or reuse Stripe customer
    let customerId = existing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      // Persist customer ID immediately to prevent duplicate customers on retry
      await supabase.from('user_subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: 'incomplete',
      }, { onConflict: 'user_id' });
    }

    // Create Checkout Session — 7-day free trial, then $20/mo
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
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
