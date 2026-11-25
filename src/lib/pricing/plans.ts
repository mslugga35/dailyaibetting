/**
 * Pro plan definitions and ALL customer-facing price / trial / renewal / cancellation
 * wording. Client-safe (no env, no I/O).
 *
 * The amounts here are display copy; Stripe charges the configured Price. Each
 * amount MUST equal its Stripe Price's unit_amount (checked by the test-mode e2e and
 * the launch checklist). Which plan is on sale comes from the server
 * (src/lib/pricing/offer.ts, exposed at GET /api/pricing/offer), so the page, the
 * checkout and the webhook all read one decision.
 */

export type PlanKey = 'founding' | 'regular' | 'legacy';
export type PricingMode = 'legacy' | 'founding' | 'regular';

export const PLANS: Record<PlanKey, { cents: number; name: string }> = {
  founding: { cents: 999, name: 'Founding Member' },
  regular: { cents: 1999, name: 'Pro' },
  /** The price existing subscribers hold (STRIPE_PRICE_ID). Never changed. */
  legacy: { cents: 2000, name: 'Pro' },
};

/** $20 -> "$20", 999 -> "$9.99". */
export function formatAmount(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}
export function formatMonthly(cents: number): string {
  return `${formatAmount(cents)}/mo`;
}

/** What is on sale right now. Public data only (no user data). */
export interface PublicOffer {
  mode: PricingMode;
  /** null = nothing on sale (founding spots full and the regular price not switched on yet). */
  plan: PlanKey | null;
  amountCents: number | null;
  /** Free-trial length for FIRST-TIME subscribers on this plan (0 = no trial). */
  trialDays: number;
  /** Founding mode only. remaining is null when the count could not be read. */
  /** paid = seats paid for (the public counter); remaining = seats still open after live checkout holds and trials. */
  founding: { cap: number; remaining: number | null; soldOut: boolean; paid?: number | null } | null;
}

export interface OfferCopy {
  /** "$9.99/mo", or null while unknown. */
  price: string | null;
  planName: string;
  /** Main CTA for someone who has never subscribed (mentions the trial when there is one). */
  ctaNew: string;
  /** CTA for a returning subscriber (no trial). */
  ctaReturning: string;
  /** Short "7-day free trial" label, or null when there is no trial. */
  trialLabel: string | null;
  /** One line under the price: what happens after the trial / at renewal. */
  after: string;
  /** Full trial + billing terms sentence (FAQ, pricing cards). */
  terms: string;
  /** When the first charge happens for a trial started now (dated, for pages), or null without a trial. */
  firstCharge: string | null;
  /** The same without a calendar date (Stripe Checkout shows the live date itself). */
  firstChargeRelative: string | null;
  /** Who gets the trial (one per customer). Null without a trial. */
  trialRule: string | null;
  /** Renewal + cancellation policy. */
  renewal: string;
  /** Founding only: the terms of the locked rate. */
  lock: string | null;
  /** Founding mode only: honest seat count line. */
  seats: string | null;
}

export const CANCEL_POLICY =
  'Cancel anytime from Account > Manage Subscription. Cancelling stops future charges; you keep Pro until the end of the period you already paid for.';

/**
 * Neutral refund pointer. Deliberately makes no promise either way: refunds follow the
 * cancellation and refund policy (draft for legal review: docs/legal-drafts/) and the law.
 */
export const REFUND_NOTE =
  // Until the reviewed policy page is published, do not point at a page that does not exist.
  'Questions about a charge or a refund? Email support@dailyaibetting.com and we will review your request.';

/** "November 24, 2026" (US Eastern). */
export function formatChargeDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
}

export function offerCopy(offer: PublicOffer | null, now: Date = new Date()): OfferCopy {
  if (!offer || !offer.plan || offer.amountCents == null) {
    // Not loaded yet, or misconfigured: never show a price we have not confirmed.
    const loading = !offer;
    return {
      price: null, planName: 'Pro',
      ctaNew: loading ? 'See Pro plans' : 'Pro is unavailable right now',
      ctaReturning: loading ? 'Upgrade to Pro' : 'Pro is unavailable right now',
      trialLabel: null,
      after: loading ? CANCEL_POLICY : 'New Pro signups are paused right now. Please check back soon.',
      terms: loading ? CANCEL_POLICY : 'New Pro signups are paused right now. Please check back soon.',
      firstCharge: null, firstChargeRelative: null, trialRule: null, renewal: CANCEL_POLICY, lock: null, seats: null,
    };
  }

  const price = formatMonthly(offer.amountCents);
  const amount = formatAmount(offer.amountCents);
  const founding = offer.plan === 'founding';
  const t = offer.trialDays;
  const trialLabel = t > 0 ? `${t}-day free trial` : null;
  const planName = founding ? 'Founding Member' : 'Pro';
  const firstCharge = t > 0
    ? `First-time members who start the free trial today get their first charge of ${amount} on ${formatChargeDate(new Date(now.getTime() + t * 86400000))} (${t} days later), unless they cancel before then.`
    : null;
  const firstChargeRelative = t > 0
    ? `Your first charge of ${amount} is ${t} days after you start the free trial, unless you cancel before then.`
    : null;
  // The card check is part of the founding/regular launch (it needs the founding migration).
  const trialRule = t > 0
    ? offer.mode === 'legacy'
      ? 'One free trial per customer: first-time members only.'
      : 'One free trial per customer: free trials are limited to eligible first-time customers. We may deny or cancel duplicate or ineligible trials.'
    : null;
  const f = offer.founding;
  const seats = f ? foundingSeatsCopy(f) : null;

  if (!founding) {
    // Price wording kept identical to the pre-founding site for the legacy $20 plan.
    return {
      price, planName,
      ctaNew: t > 0 ? `Try ${t} Days Free (New Members)` : `Upgrade to Pro – ${price}`,
      ctaReturning: `Upgrade to Pro – ${price}`,
      trialLabel,
      after: t > 0 ? `Then ${price}. Cancel anytime before the trial ends and you won't be charged.` : `${price}, billed monthly. Cancel anytime.`,
      terms: t > 0
        ? `${t}-day free trial for first-time members, then ${price}. Cancel anytime before the trial ends and you won't be charged.`
        : `${price}, billed monthly until you cancel.`,
      firstCharge, firstChargeRelative, trialRule,
      renewal: `Renews every month at ${amount} until you cancel. ${CANCEL_POLICY}`,
      lock: null,
      seats: f?.soldOut ? seats : null,
    };
  }

  return {
    price, planName,
    ctaNew: t > 0 ? `Try ${t} Days Free – then ${price}` : `Claim Founding Price – ${price}`,
    ctaReturning: `Get Pro – ${price}`,
    trialLabel,
    after: t > 0
      ? `Then ${price} Founding Member price. Cancel before the trial ends and you won't be charged.`
      : `${price} Founding Member price, billed monthly. Cancel anytime.`,
    terms: t > 0
      ? `${t}-day free trial for first-time members, then ${price} (Founding Member price), billed monthly. Cancel anytime before the trial ends and you won't be charged.`
      : `${price} (Founding Member price), billed monthly until you cancel.`,
    firstCharge, firstChargeRelative, trialRule,
    renewal: `Renews every month at ${amount} until you cancel. ${CANCEL_POLICY}`,
    lock: `Your ${amount}/month Founding Member price stays locked for as long as your subscription stays active. If the subscription ends (you cancel and the paid period runs out, or a payment can't be collected after Stripe's retries), the founding price ends with it, and rejoining later is at the regular price of ${formatMonthly(PLANS.regular.cents)}. Once the Founding Member spots are gone, new members pay the regular ${formatMonthly(PLANS.regular.cents)}.`,
    seats,
  };
}

/**
 * Seat counter wording. The number shown is the same "remaining" the API and checkout use
 * (cap minus paid minus live holds), so pages never contradict /api/pricing/offer
 * (QA 2026-11-19: "100 of 100 left, 1 held" vs remaining 99). Seats held by an open checkout
 * or an unpaid trial are named separately: they reopen if not paid. Only paid seats are permanent.
 */
export function foundingSeatsCopy(f: { cap: number; remaining: number | null; soldOut: boolean; paid?: number | null }): string {
  // Callers that do not pass `paid` (older shape): every taken seat counts as paid.
  const paid = f.paid === undefined ? (f.remaining == null ? null : f.cap - f.remaining) : f.paid;
  if (f.remaining == null || paid == null) return `Limited to the first ${f.cap} paying members.`;
  const left = Math.max(0, f.cap - paid);
  if (left === 0) return `All ${f.cap} Founding Member spots are taken.`;
  const held = Math.max(0, left - f.remaining);
  const base = `${f.remaining} of ${f.cap} Founding Member spots left (limited to the first ${f.cap} paying members).`;
  if (held === 0) return base;
  const reserved = `${held} ${held === 1 ? 'spot is' : 'spots are'} reserved by members in checkout or a free trial and ${held === 1 ? 'reopens' : 'reopen'} if not paid.`;
  if (f.remaining === 0) return `No Founding Member spots are open right now. ${reserved}`;
  return `${base} ${reserved}`;
}
