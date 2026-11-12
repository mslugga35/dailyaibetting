export const SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'inactive'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export function isProStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * Display copy for the Pro plan. The charged amount comes from the Stripe price
 * STRIPE_PRICE_ID; PRO_PRICE_DISPLAY must match it (verify in Stripe before launch).
 * The trial is applied by /api/checkout (trial_period_days), to FIRST-TIME
 * subscribers only, so all trial copy says so.
 */
export const PRO_PRICE_DISPLAY = '$20/mo';
export const TRIAL_DAYS = 7;
export const TRIAL_LABEL = `${TRIAL_DAYS}-day free trial`;
export const TRIAL_CTA = `Try ${TRIAL_DAYS} Days Free (New Members)`;
export const UPGRADE_CTA = `Upgrade to Pro – ${PRO_PRICE_DISPLAY}`;
export const TRIAL_AFTER = `Then ${PRO_PRICE_DISPLAY}. Cancel anytime before the trial ends and you won't be charged.`;
export const TRIAL_TERMS = `${TRIAL_DAYS}-day free trial for first-time members, then ${PRO_PRICE_DISPLAY}. Cancel anytime before the trial ends and you won't be charged.`;
