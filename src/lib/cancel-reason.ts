import type Stripe from 'stripe';

/**
 * Why WE cancelled a subscription is recorded in SERVER-ONLY subscription metadata (`dai_cancel_reason`).
 * cancellation_details.comment is customer-typable in the Billing Portal, so the old 'trial_reuse'
 * comment prefix is honoured only for subscriptions cancelled BEFORE the code that writes the metadata
 * marker was deployed.
 *
 * Env DAI_TRIAL_REUSE_COMMENT_CUTOFF (ISO-8601 timestamp, e.g. 2026-11-25T18:00:00Z): set it to the
 * deploy time of this change. With it set, the comment counts only when canceled_at is before it (a
 * missing canceled_at never qualifies). Unset or invalid: the OLD behaviour (the comment is honoured;
 * a customer typing it only affects their own subscription), with one warning per process.
 */
export const CANCEL_REASON_KEY = 'dai_cancel_reason';
export const COMMENT_CUTOFF_ENV = 'DAI_TRIAL_REUSE_COMMENT_CUTOFF';

let warned = false;
/** For tests. */
export function resetCutoffWarning() { warned = false; }

/** The configured cutoff in Unix seconds, or null (unset/invalid: old behaviour). */
export function commentFallbackCutoff(): number | null {
  const raw = (process.env[COMMENT_CUTOFF_ENV] || '').trim();
  const ms = raw && /^\d{4}-\d{2}-\d{2}T/.test(raw) ? Date.parse(raw) : NaN;
  if (Number.isFinite(ms)) return Math.floor(ms / 1000);
  if (!warned) {
    warned = true;
    console.warn(`[billing] ${COMMENT_CUTOFF_ENV} ${raw ? 'is not a valid ISO timestamp' : 'is not set'}: a 'trial_reuse' cancellation comment is honoured whenever it was written (set it to this deploy's time)`);
  }
  return null;
}

export function cancelledFor(sub: Stripe.Subscription, reason: 'duplicate_trial' | 'trial_reuse'): boolean {
  if (sub.metadata?.[CANCEL_REASON_KEY] === reason) return true;
  if (reason !== 'trial_reuse') return false; // duplicate cancellations are new: metadata only
  if (!/^trial_reuse\b/.test(sub.cancellation_details?.comment || '')) return false;
  const cutoff = commentFallbackCutoff();
  if (cutoff === null) return true;
  const at = typeof sub.canceled_at === 'number' ? sub.canceled_at : null;
  return at !== null && at < cutoff;
}
