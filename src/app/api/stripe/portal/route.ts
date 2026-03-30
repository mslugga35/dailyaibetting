/**
 * POST /api/stripe/portal
 * Creates a Stripe Billing Portal session so premium users can
 * manage their subscription (cancel, update payment method, etc.)
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
  if (!sub.stripeCustomerId) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${baseUrl}/account`,
  });

  return NextResponse.json({ url: session.url });
}
