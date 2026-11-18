import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import type Stripe from 'stripe';
import { rateLimitGuard } from '@/lib/api-helpers';
import { hasDailyAiPrice } from '@/lib/stripe-prices';

export const dynamic = 'force-dynamic';

/**
 * GET /api/checkout/status?session_id=cs_...
 *
 * Tells the /pro/success page what actually happened, so it never says "Welcome to Pro"
 * after a free trial was cancelled because the card already had one (the webhook cancels
 * it without charge). Returns ONLY a state word; no email, name, amount or ids. The
 * Checkout Session id is unguessable and is only ever shown to the person who paid.
 *
 * state: pending | trialing | active | trial_not_started | unknown
 */
const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

export async function GET(request: NextRequest) {
  const limited = rateLimitGuard(request, 30, 60_000, 'checkout-status');
  if (limited) return limited;
  const id = new URL(request.url).searchParams.get('session_id') || '';
  if (!SESSION_RE.test(id)) return NextResponse.json({ state: 'unknown' }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(id, { expand: ['subscription'] });
    if (session.mode !== 'subscription' || session.status !== 'complete') return json('pending');
    const sub = session.subscription as Stripe.Subscription | string | null;
    if (!sub || typeof sub === 'string') return json('pending');
    if (!hasDailyAiPrice(sub)) return json('unknown');
    if (sub.status === 'canceled' && /^trial_reuse\b/.test(sub.cancellation_details?.comment || '')) return json('trial_not_started');
    if (sub.status === 'trialing') return json('trialing');
    if (sub.status === 'active') return json('active');
    return json('pending');
  } catch {
    return json('unknown');
  }
}

function json(state: string) {
  return NextResponse.json({ state }, { headers: { 'Cache-Control': 'no-store' } });
}
