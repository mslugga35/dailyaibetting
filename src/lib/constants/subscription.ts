export const SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'inactive'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export function isProStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

export const PRO_PRICE_DISPLAY = '$20/mo';
export const TRIAL_DAYS = 7;
