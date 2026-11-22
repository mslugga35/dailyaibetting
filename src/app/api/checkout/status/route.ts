import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import type Stripe from 'stripe';
import { rateLimitGuard } from '@/lib/api-helpers';
import { allowedPriceIds, hasDailyAiPrice } from '@/lib/stripe-prices';
import { cancelledFor } from '@/lib/cancel-reason';

export const dynamic = 'force-dynamic';

/**
 * GET /api/checkout/status?session_id=cs_...
 *
 * Tells the /pro/success page what actually happened, so it never says "Welcome to Pro"
 * after a free trial was refused because the card already had one (the webhook cancels
 * it without charge). Returns ONLY a state word; no email, name, amount or ids. The
 * Checkout Session id is unguessable and is only ever shown to the person who paid.
 *
 * state:
 *   trial_not_started  trial refused (card already had a trial); nothing charged
 *   trialing           trial running AND the one-trial-per-card check has passed (or does not apply)
 *   active             paid subscription
 *   pending            not settled yet (webhook still working): the page must not welcome yet
 *   unknown            anything else, including sessions that are not DailyAI's (no oracle)
 */
const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

function cardCheckApplies(sub: Stripe.Subscription): boolean {
  const mode = (process.env.PRICING_MODE || '').trim().toLowerCase();
  if (mode !== 'founding' && mode !== 'regular') return false;
  const newPrices = [process.env.STRIPE_PRICE_FOUNDING, process.env.STRIPE_PRICE_PRO].map((v) => (v || '').trim()).filter(Boolean);
  return sub.items.data.some((i) => newPrices.includes(i.price?.id));
}

export async function GET(request: NextRequest) {
  const limited = rateLimitGuard(request, 30, 60_000, 'checkout-status');
  if (limited) return limited;
  const id = new URL(request.url).searchParams.get('session_id') || '';
  if (!SESSION_RE.test(id)) return NextResponse.json({ state: 'unknown' }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(id, { expand: ['subscription', 'line_items'] });
    // Not a DailyAI subscription checkout: say nothing at all about it.
    const allowed = allowedPriceIds();
    const items = session.line_items?.data ?? [];
    if (session.mode !== 'subscription' || !items.some((li) => allowed.has(li.price?.id ?? ''))) return json('unknown');
    if (session.status !== 'complete') return json('pending');
    const sub = session.subscription as Stripe.Subscription | string | null;
    if (!sub || typeof sub === 'string') return json('pending');
    if (!hasDailyAiPrice(sub, allowed)) return json('unknown');
    // Server-only metadata is the trust signal; the customer-typable comment counts only for pre-cutoff cancellations (F7).
    if (sub.status === 'canceled' && cancelledFor(sub, 'trial_reuse')) return json('trial_not_started');
    if (sub.status === 'active') return json('active');
    if (sub.status === 'trialing') {
      // Until the webhook has checked the card, a refusal is still possible: do not welcome yet.
      return json(!cardCheckApplies(sub) || sub.metadata?.trial_card_checked === '1' ? 'trialing' : 'pending');
    }
    return json('pending');
  } catch {
    return json('unknown');
  }
}

function json(state: string) {
  return NextResponse.json({ state }, { headers: { 'Cache-Control': 'no-store' } });
}
