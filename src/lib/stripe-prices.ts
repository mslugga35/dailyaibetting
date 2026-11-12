import type Stripe from 'stripe';

/**
 * DailyAI's own prices. The Stripe account is shared with other products, so a
 * subscription for any other price must never create a DailyAI account, grant
 * Pro, block a DailyAI checkout or use up the DailyAI trial (B2).
 * STRIPE_PRICE_ID is the current price; STRIPE_ALLOWED_PRICE_IDS
 * (comma-separated) lists older DailyAI prices that existing subscribers may hold.
 */
export function allowedPriceIds(): Set<string> {
  const ids = [process.env.STRIPE_PRICE_ID, ...(process.env.STRIPE_ALLOWED_PRICE_IDS || '').split(',')]
    .map((v) => (v || '').trim())
    .filter(Boolean);
  return new Set(ids);
}

/** True when any item of the subscription is on a DailyAI price. */
export function hasDailyAiPrice(subscription: Stripe.Subscription, allowed = allowedPriceIds()): boolean {
  return subscription.items.data.some((item) => allowed.has(item.price?.id));
}
