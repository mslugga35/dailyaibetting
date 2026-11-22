import type Stripe from 'stripe';

/**
 * Why WE cancelled a subscription is recorded in SERVER-ONLY subscription metadata (`dai_cancel_reason`).
 * cancellation_details.comment is customer-typable in the Billing Portal, so the old 'trial_reuse'
 * comment prefix is honoured only for subscriptions cancelled BEFORE the metadata marker existed
 * (canceled_at earlier than this cutoff). A missing canceled_at never qualifies.
 */
export const CANCEL_REASON_KEY = 'dai_cancel_reason';
export const COMMENT_FALLBACK_CUTOFF = Math.floor(Date.UTC(2026, 10, 22) / 1000); // 2026-11-22T00:00:00Z

export function cancelledFor(sub: Stripe.Subscription, reason: 'duplicate_trial' | 'trial_reuse'): boolean {
  if (sub.metadata?.[CANCEL_REASON_KEY] === reason) return true;
  if (reason !== 'trial_reuse') return false; // duplicate cancellations are new: metadata only
  const at = typeof sub.canceled_at === 'number' ? sub.canceled_at : null;
  return at !== null && at < COMMENT_FALLBACK_CUTOFF && /^trial_reuse\b/.test(sub.cancellation_details?.comment || '');
}
