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
  founding: { cap: number; remaining: number | null; soldOut: boolean } | null;
}

export interface OfferCopy {
  /** "$9.99/mo", or null while unknown / closed. */
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
  /** Renewal + cancellation policy. */
  renewal: string;
  /** Founding only: the terms of the locked rate. */
  lock: string | null;
  /** Founding only: honest seat count line. */
  seats: string | null;
}

export const CANCEL_POLICY =
  'Cancel anytime from Account > Manage Subscription. Cancelling stops future charges; you keep Pro until the end of the period you already paid for.';

export function offerCopy(offer: PublicOffer | null): OfferCopy {
  if (!offer) {
    // Not loaded yet: never show a price we have not confirmed.
    return {
      price: null, planName: 'Pro', ctaNew: 'See Pro plans', ctaReturning: 'Upgrade to Pro',
      trialLabel: null, after: CANCEL_POLICY, terms: CANCEL_POLICY, renewal: CANCEL_POLICY, lock: null, seats: null,
    };
  }
  if ((!offer.plan || offer.amountCents == null) && !offer.founding) {
    return {
      price: null, planName: 'Pro', ctaNew: 'Pro is unavailable right now', ctaReturning: 'Pro is unavailable right now',
      trialLabel: null, after: 'New Pro signups are paused right now. Please check back soon.',
      terms: 'New Pro signups are paused right now. Please check back soon.', renewal: CANCEL_POLICY, lock: null, seats: null,
    };
  }
  if (!offer.plan || offer.amountCents == null) {
    return {
      price: null, planName: 'Pro', ctaNew: 'Founding spots are full', ctaReturning: 'Founding spots are full',
      trialLabel: null,
      after: 'All Founding Member spots are taken. New Pro signups reopen soon.',
      terms: 'All Founding Member spots are taken. New Pro signups reopen soon.',
      renewal: CANCEL_POLICY, lock: null,
      seats: offer.founding ? `All ${offer.founding.cap} Founding Member spots are taken.` : null,
    };
  }

  const price = formatMonthly(offer.amountCents);
  const amount = formatAmount(offer.amountCents);
  const founding = offer.plan === 'founding';
  const t = offer.trialDays;
  const trialLabel = t > 0 ? `${t}-day free trial` : null;
  const planName = founding ? 'Founding Member' : 'Pro';

  if (!founding) {
    // Wording kept identical to the pre-founding site for the legacy $20 plan.
    return {
      price, planName,
      ctaNew: t > 0 ? `Try ${t} Days Free (New Members)` : `Upgrade to Pro – ${price}`,
      ctaReturning: `Upgrade to Pro – ${price}`,
      trialLabel,
      after: t > 0 ? `Then ${price}. Cancel anytime before the trial ends and you won't be charged.` : `${price}, billed monthly. Cancel anytime.`,
      terms: t > 0
        ? `${t}-day free trial for first-time members, then ${price}. Cancel anytime before the trial ends and you won't be charged.`
        : `${price}, billed monthly until you cancel.`,
      renewal: `Renews every month at ${amount} until you cancel. ${CANCEL_POLICY}`,
      lock: null, seats: null,
    };
  }

  const f = offer.founding;
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
    renewal: `Renews every month at ${amount} until you cancel. ${CANCEL_POLICY}`,
    lock: `Your ${amount}/month Founding Member price stays locked for as long as your subscription stays active. If the subscription ends (you cancel and the paid period runs out, or a payment can't be collected after Stripe's retries), the founding price ends with it, and rejoining later is at the regular price.`,
    seats: f
      ? f.remaining == null
        ? `Limited to the first ${f.cap} paying members.`
        : f.remaining > 0
          ? `${f.remaining} of ${f.cap} Founding Member spots left (limited to the first ${f.cap} paying members).`
          : `All ${f.cap} Founding Member spots are taken.`
      : null,
  };
}
