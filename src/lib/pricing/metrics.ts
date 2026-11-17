/**
 * Internal billing metrics computed from Stripe (source of truth for money) plus the
 * founding-seat table. Counts and amounts only: no customer ids, emails or names.
 */
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { allowedPriceIds } from '@/lib/stripe-prices';
import { planForPriceId, pricingConfig, foundingSeatStats, type SeatStats } from '@/lib/pricing/offer';

type Bucket = { active: number; trialing: number; past_due: number; canceled_30d: number; mrr_cents: number };
const empty = (): Bucket => ({ active: 0, trialing: 0, past_due: 0, canceled_30d: 0, mrr_cents: 0 });

export interface BillingMetrics {
  generated_at: string;
  mode: string;
  by_plan: Record<string, Bucket>;
  totals: Bucket;
  /** MRR counts only status=active (trials and past_due are not revenue yet). */
  trials: { ended: number; now_active: number; conversion_rate: number | null };
  /** canceled in the last 30 days / (active + those canceled). Approximate monthly churn. */
  churn_30d_rate: number | null;
  founding_seats: (SeatStats & { cap: number; count_mode: string }) | { error: string } | null;
}

export function summarize(subs: Stripe.Subscription[], nowSec = Math.floor(Date.now() / 1000)): Omit<BillingMetrics, 'generated_at' | 'mode' | 'founding_seats'> {
  const allowed = allowedPriceIds();
  const by: Record<string, Bucket> = {};
  const totals = empty();
  let trialsEnded = 0;
  let trialsNowActive = 0;
  for (const s of subs) {
    const item = s.items.data.find((i) => allowed.has(i.price?.id));
    if (!item) continue;
    const plan = planForPriceId(item.price.id) ?? 'other_dailyai';
    const b = (by[plan] ||= empty());
    const amount = (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
    const add = (k: keyof Bucket, v = 1) => { b[k] += v; totals[k] += v; };
    if (s.status === 'active') { add('active'); add('mrr_cents', amount); }
    else if (s.status === 'trialing') add('trialing');
    else if (s.status === 'past_due' || s.status === 'unpaid') add('past_due');
    else if (s.status === 'canceled' && (s.ended_at ?? s.canceled_at ?? 0) >= nowSec - 30 * 86400) add('canceled_30d');
    if (s.trial_end && s.trial_end <= nowSec) {
      trialsEnded += 1;
      if (s.status === 'active') trialsNowActive += 1;
    }
  }
  const churnBase = totals.active + totals.canceled_30d;
  return {
    by_plan: by,
    totals,
    trials: { ended: trialsEnded, now_active: trialsNowActive, conversion_rate: trialsEnded ? +(trialsNowActive / trialsEnded).toFixed(4) : null },
    churn_30d_rate: churnBase ? +(totals.canceled_30d / churnBase).toFixed(4) : null,
  };
}

export async function computeBillingMetrics(): Promise<BillingMetrics> {
  const subs: Stripe.Subscription[] = [];
  for (const price of allowedPriceIds()) {
    // Per DailyAI price, so other products on the shared Stripe account are never read.
    const page = stripe.subscriptions.list({ price, status: 'all', limit: 100 });
    for await (const s of page) subs.push(s);
  }
  let mode = 'unknown';
  let founding: BillingMetrics['founding_seats'] = null;
  try {
    const cfg = pricingConfig();
    mode = cfg.mode;
    if (cfg.prices.founding) {
      try {
        founding = { ...(await foundingSeatStats(cfg.countEnded)), cap: cfg.seatCap, count_mode: cfg.countEnded ? 'historical' : 'live' };
      } catch (err) {
        founding = { error: (err as Error).message };
      }
    }
  } catch (err) {
    mode = `config error: ${(err as Error).message}`;
  }
  return { generated_at: new Date().toISOString(), mode, ...summarize(subs), founding_seats: founding };
}
