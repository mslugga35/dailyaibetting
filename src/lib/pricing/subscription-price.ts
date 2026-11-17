/**
 * What a subscriber actually pays, for the account page: the amount comes from the
 * Stripe Price on their subscription (prices are immutable, so it is cached), never
 * from what is on sale today. A legacy $20 subscriber sees $20.
 */
import { stripe } from '@/lib/stripe';
import { planForPriceId } from '@/lib/pricing/offer';
import { PLANS, formatMonthly, formatAmount, type PlanKey } from '@/lib/pricing/plans';

const cache = new Map<string, { cents: number; interval: string }>();

export interface SubscriptionPrice { plan: PlanKey | null; label: string; amount: string | null; perPeriod: string | null }

export async function describeSubscriptionPrice(priceId: string | null): Promise<SubscriptionPrice> {
  const plan = planForPriceId(priceId);
  const name = plan === 'founding' ? 'Founding Member' : 'Pro';
  if (!priceId) return { plan, label: name, amount: null, perPeriod: null };
  let p = cache.get(priceId);
  if (!p) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (typeof price.unit_amount === 'number') {
        p = { cents: price.unit_amount, interval: price.recurring?.interval ?? 'month' };
        cache.set(priceId, p);
      }
    } catch (err) {
      console.error('[account] price lookup failed:', (err as { code?: string })?.code || (err as Error).message);
    }
  }
  if (!p && plan) p = { cents: PLANS[plan].cents, interval: 'month' };
  if (!p) return { plan, label: name, amount: null, perPeriod: null };
  const perPeriod = p.interval === 'month' ? formatMonthly(p.cents) : `${formatAmount(p.cents)}/${p.interval}`;
  return { plan, label: name, amount: formatAmount(p.cents), perPeriod };
}
