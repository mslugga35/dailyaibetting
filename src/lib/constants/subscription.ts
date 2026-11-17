export const SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'inactive'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export function isProStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * Free-trial length for FIRST-TIME subscribers (applied by /api/checkout via
 * trial_period_days). Founding Member trials use FOUNDING_TRIAL_DAYS (default: this).
 *
 * Prices and all price / trial / renewal wording live in src/lib/pricing/plans.ts
 * (offerCopy) and are chosen by the server (src/lib/pricing/offer.ts). Do not
 * hardcode a price string anywhere else.
 */
export const TRIAL_DAYS = 7;
