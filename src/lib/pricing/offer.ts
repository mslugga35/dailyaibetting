/**
 * Server-side pricing decisions: which Pro plan is on sale, which Stripe Price a
 * checkout uses, Founding Member seat accounting, and price-id -> plan mapping for
 * the webhook and the account page. Server only (reads env and the database).
 *
 * Env (all optional; with none set the site behaves exactly as before: $20 legacy):
 *   PRICING_MODE                 legacy (default) | founding | regular   <- the owner's switch
 *   STRIPE_PRICE_ID              legacy $20 price existing subscribers hold (always honoured)
 *   STRIPE_PRICE_FOUNDING        $9.99/mo founding price (required for PRICING_MODE=founding)
 *   STRIPE_PRICE_PRO             $19.99/mo regular price (required for PRICING_MODE=founding and
 *                                regular: once the founding seats are used, new customers get it)
 *   FOUNDING_SEAT_CAP            default 100, hard maximum 100 (owner rule: never more than 100 founders)
 *   FOUNDING_MAX_OPEN_HOLDS      default 20: at most this many unpaid founding checkouts may
 *                                hold a seat at once (limits seat squatting)
 *   (A founding member who paid keeps their seat permanently, even after cancelling: owner
 *    rule 2026-11-17. There is no setting that frees a paid seat.)
 *   FOUNDING_TRIAL_DAYS          default 7 (first-time members only; 0 = no trial)
 *   (When the founding seats are used up, $19.99 is sold automatically: Pro never closes.)
 *   FOUNDING_RETURNING           regular (default: a former paying founding member is offered
 *                                STRIPE_PRICE_PRO, not the founding price) | founding
 *   STRIPE_PORTAL_CONFIGURATION_ID  billing-portal configuration with plan switching disabled
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';
import { TRIAL_DAYS } from '@/lib/constants/subscription';
import { PLANS, type PlanKey, type PricingMode, type PublicOffer } from '@/lib/pricing/plans';

export class PricingConfigError extends Error {}

/** Stripe Checkout Sessions must live at least 30 minutes; ours lives 31. */
export const FOUNDING_SESSION_SECONDS = 31 * 60;
/**
 * A seat hold outlives its Checkout Session (released at once by checkout.session.expired),
 * so a session can never complete on a released seat, even if the completion webhook is
 * delayed by up to this long.
 */
export const FOUNDING_HOLD_GRACE_SECONDS = 60 * 60;

function intEnv(name: string, def: number, min: number, max: number): number {
  const raw = (process.env[name] ?? '').trim();
  if (raw === '') return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new PricingConfigError(`${name} must be an integer between ${min} and ${max}`);
  }
  return n;
}
const env = (name: string) => (process.env[name] ?? '').trim();

export interface PricingConfig {
  mode: PricingMode;
  prices: { legacy: string; founding: string; regular: string };
  seatCap: number;
  maxHolds: number;
  countEnded: boolean;
  foundingTrialDays: number;
  returningGetsFounding: boolean;
}

export function pricingConfig(): PricingConfig {
  const m = env('PRICING_MODE').toLowerCase();
  const mode: PricingMode = m === 'founding' || m === 'regular' ? m : 'legacy';
  if (m && m !== mode) console.warn(`[pricing] unknown PRICING_MODE "${m}", using legacy`);
  const cfg: PricingConfig = {
    mode,
    prices: { legacy: env('STRIPE_PRICE_ID'), founding: env('STRIPE_PRICE_FOUNDING'), regular: env('STRIPE_PRICE_PRO') },
    seatCap: intEnv('FOUNDING_SEAT_CAP', 100, 0, 100),
    maxHolds: intEnv('FOUNDING_MAX_OPEN_HOLDS', 20, 1, 100000),
    countEnded: true, // paid seats are permanent (no 'live' mode)
    foundingTrialDays: intEnv('FOUNDING_TRIAL_DAYS', TRIAL_DAYS, 0, 30),
    returningGetsFounding: env('FOUNDING_RETURNING').toLowerCase() === 'founding',
  };
  if (mode === 'founding' && !cfg.prices.founding) throw new PricingConfigError('PRICING_MODE=founding needs STRIPE_PRICE_FOUNDING');
  if (mode === 'founding' && !cfg.prices.regular) throw new PricingConfigError('PRICING_MODE=founding needs STRIPE_PRICE_PRO (sold once the founding seats are used)');
  if (mode === 'regular' && !cfg.prices.regular) throw new PricingConfigError('PRICING_MODE=regular needs STRIPE_PRICE_PRO');
  if (mode === 'legacy' && !cfg.prices.legacy) throw new PricingConfigError('STRIPE_PRICE_ID not configured');
  return cfg;
}

/** Which DailyAI plan a Stripe price id belongs to; null for anything else. */
export function planForPriceId(priceId: string | null | undefined): PlanKey | null {
  if (!priceId) return null;
  if (priceId === env('STRIPE_PRICE_FOUNDING')) return 'founding';
  if (priceId === env('STRIPE_PRICE_PRO')) return 'regular';
  if (priceId === env('STRIPE_PRICE_ID')) return 'legacy';
  return null;
}

// ---------------------------------------------------------------- seat storage (service role)

let _db: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!_db) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase service client not configured');
    _db = createClient(url, key, { auth: { persistSession: false } });
  }
  return _db;
}

export interface SeatStats { reserved: number; trialing: number; converted: number; ended: number; released: number; taken: number }

export async function foundingSeatStats(countEnded: boolean): Promise<SeatStats> {
  const { data, error } = await db().rpc('dailyai_founding_stats', { p_count_ended: countEnded });
  if (error) throw Object.assign(new Error(`founding stats: ${error.message}`), { code: error.code });
  const row = (Array.isArray(data) ? data[0] : data) as SeatStats | undefined;
  if (!row) throw new Error('founding stats: no row');
  return row;
}

export type ReserveOutcome = 'reserved' | 'existing' | 'sold_out' | 'returning' | 'busy';

export async function reserveFoundingSeat(cfg: PricingConfig, customerId: string, userId: string | null) {
  const { data, error } = await db().rpc('dailyai_founding_reserve', {
    p_customer: customerId,
    p_user: userId,
    p_cap: cfg.seatCap,
    p_hold_seconds: FOUNDING_SESSION_SECONDS + FOUNDING_HOLD_GRACE_SECONDS,
    p_count_ended: cfg.countEnded,
    p_allow_returning: cfg.returningGetsFounding,
    p_max_holds: cfg.maxHolds,
  });
  if (error) throw Object.assign(new Error(`founding reserve: ${error.message}`), { code: error.code });
  const row = (Array.isArray(data) ? data[0] : data) as { seat_id: number | null; outcome: ReserveOutcome; taken: number } | undefined;
  if (!row) throw new Error('founding reserve: no row');
  return row;
}

export type SeatEvent = 'session' | 'abandon' | 'expired' | 'started' | 'paid' | 'ended';

export async function transitionFoundingSeat(args: {
  event: SeatEvent;
  seatId?: number | null;
  sessionId?: string | null;
  subscriptionId?: string | null;
  userId?: string | null;
  holdUntil?: string | null;
}) {
  const cfg = pricingConfigSafe();
  const { data, error } = await db().rpc('dailyai_founding_transition', {
    p_event: args.event,
    p_seat: args.seatId ?? null,
    p_session: args.sessionId ?? null,
    p_subscription: args.subscriptionId ?? null,
    p_user: args.userId ?? null,
    p_hold_until: args.holdUntil ?? null,
    p_cap: cfg?.seatCap ?? null,
    p_count_ended: cfg?.countEnded ?? true,
  });
  if (error) throw Object.assign(new Error(`founding transition: ${error.message}`), { code: error.code });
  const row = (Array.isArray(data) ? data[0] : data) as { seat_id: number; status: string; over_cap: boolean } | undefined;
  return row ?? null;
}

function pricingConfigSafe(): PricingConfig | null {
  try { return pricingConfig(); } catch { return null; }
}

// ---------------------------------------------------------------- what is on sale

let cache: { at: number; offer: PublicOffer } | null = null;
const CACHE_MS = 10_000;

/** For tests. */
export function resetOfferCache() { cache = null; }

/**
 * The offer shown to visitors. Founding seats are read from the same table checkout
 * reserves from (cached 10s); checkout itself re-checks atomically, so a stale
 * display can never oversell.
 */
export async function getCurrentOffer(): Promise<PublicOffer> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.offer;
  const offer = await computeOffer();
  cache = { at: Date.now(), offer };
  return offer;
}

async function computeOffer(): Promise<PublicOffer> {
  let cfg: PricingConfig;
  try {
    cfg = pricingConfig();
  } catch (err) {
    console.error('[pricing] config error:', (err as Error).message);
    return { mode: 'legacy', plan: null, amountCents: null, trialDays: 0, founding: null };
  }
  if (cfg.mode === 'legacy') {
    return { mode: 'legacy', plan: 'legacy', amountCents: PLANS.legacy.cents, trialDays: TRIAL_DAYS, founding: null };
  }
  if (cfg.mode === 'regular') {
    return { mode: 'regular', plan: 'regular', amountCents: PLANS.regular.cents, trialDays: TRIAL_DAYS, founding: null };
  }
  let remaining: number | null = null;
  try {
    const s = await foundingSeatStats(cfg.countEnded);
    remaining = Math.max(0, cfg.seatCap - s.taken);
  } catch (err) {
    console.error('[pricing] founding seat count unavailable:', (err as Error).message);
  }
  const soldOut = remaining === 0;
  const founding = { cap: cfg.seatCap, remaining, soldOut };
  if (!soldOut) {
    return { mode: 'founding', plan: 'founding', amountCents: PLANS.founding.cents, trialDays: cfg.foundingTrialDays, founding };
  }
  // Seats used up: the regular price, automatically (Pro never closes).
  return { mode: 'founding', plan: 'regular', amountCents: PLANS.regular.cents, trialDays: TRIAL_DAYS, founding };
}

// ---------------------------------------------------------------- checkout decision

export type CheckoutPlan =
  | { ok: true; plan: PlanKey; priceId: string; firstTimeTrialDays: number; seatId: number | null; newSeat: boolean }
  | { ok: false; reason: 'busy' };

const verified = new Map<string, number>();
/**
 * The Stripe Price must charge exactly what the site displays (USD, monthly, PLANS cents).
 * Checked once per price id per process; a mismatch fails the checkout closed.
 */
async function assertPriceMatches(priceId: string, plan: PlanKey) {
  if (verified.get(priceId) === PLANS[plan].cents) return;
  const p = await stripe.prices.retrieve(priceId);
  if (p.unit_amount !== PLANS[plan].cents || p.currency !== 'usd' || p.recurring?.interval !== 'month' || p.recurring?.interval_count !== 1 || !p.active) {
    throw new PricingConfigError(`Stripe price for plan ${plan} does not match the displayed ${PLANS[plan].cents} cents/month USD`);
  }
  verified.set(priceId, PLANS[plan].cents);
}

/**
 * Pick the Stripe Price for a checkout by this customer. In founding mode this
 * atomically reserves (or reuses) a seat. Throws on a config or database error:
 * the caller must not fall back to another price silently.
 */
export async function chooseCheckoutPlan(customerId: string, userId: string | null): Promise<CheckoutPlan> {
  const cfg = pricingConfig();
  if (cfg.mode === 'legacy') {
    return { ok: true, plan: 'legacy', priceId: cfg.prices.legacy, firstTimeTrialDays: TRIAL_DAYS, seatId: null, newSeat: false };
  }
  if (cfg.mode === 'regular') {
    await assertPriceMatches(cfg.prices.regular, 'regular');
    return { ok: true, plan: 'regular', priceId: cfg.prices.regular, firstTimeTrialDays: TRIAL_DAYS, seatId: null, newSeat: false };
  }
  await assertPriceMatches(cfg.prices.founding, 'founding');
  const r = await reserveFoundingSeat(cfg, customerId, userId);
  if ((r.outcome === 'reserved' || r.outcome === 'existing') && r.seat_id != null) {
    cache = null; // seat count changed
    return {
      ok: true, plan: 'founding', priceId: cfg.prices.founding, firstTimeTrialDays: cfg.foundingTrialDays,
      seatId: Number(r.seat_id), newSeat: r.outcome === 'reserved',
    };
  }
  // Too many unpaid founding checkouts open at once: a short wait, not a closed store.
  if (r.outcome === 'busy') return { ok: false, reason: 'busy' };
  // Seats used up, or a former paying founding member: the regular price (owner rules).
  await assertPriceMatches(cfg.prices.regular, 'regular');
  return { ok: true, plan: 'regular', priceId: cfg.prices.regular, firstTimeTrialDays: TRIAL_DAYS, seatId: null, newSeat: false };
}

/** For tests. */
export function resetPriceVerification() {
  verified.clear();
}

/**
 * The offer as it applies to one signed-in user: a former founding member is not
 * shown the founding price checkout would not give them (see chooseCheckoutPlan).
 */
export function personalizeOffer(offer: PublicOffer, lastPriceId: string | null | undefined): PublicOffer {
  if (offer.plan !== 'founding' || planForPriceId(lastPriceId) !== 'founding') return offer;
  let cfg: PricingConfig;
  try { cfg = pricingConfig(); } catch { return offer; }
  if (cfg.returningGetsFounding) return offer;
  return cfg.prices.regular
    ? { ...offer, plan: 'regular', amountCents: PLANS.regular.cents, trialDays: 0 }
    : { ...offer, plan: null, amountCents: null, trialDays: 0 };
}
