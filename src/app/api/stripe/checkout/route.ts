/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for the premium plan.
 * Requires the user to be authenticated via Supabase Auth.
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser, getUserSubscription } from '@/lib/auth/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sub = await getUserSubscription(user.id);
  if (sub.plan === 'premium') {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/account?upgraded=1`,
    cancel_url: `${baseUrl}/pricing`,
    client_reference_id: user.id,
    customer_email: user.email,
    subscription_data: {
      metadata: { userId: user.id },
    },
    metadata: { userId: user.id },
  };

  // Reuse existing Stripe customer if we have one
  if (sub.stripeCustomerId) {
    sessionParams.customer = sub.stripeCustomerId;
    delete sessionParams.customer_email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return NextResponse.json({ url: session.url });
}
