import { isProStatus, SUBSCRIPTION_STATUSES, type SubscriptionStatus } from '@/lib/constants/subscription';

/**
 * Client-side entitlement state machine, kept pure so the ordering rules are
 * testable without React.
 *
 * Every entitlement check gets a monotonically increasing `seq`. A message is
 * applied only if it belongs to the LATEST check, that check has not timed out,
 * and (for entitlement answers) it is for the user that check identified. So:
 *   - a slow older response can never overwrite a newer one;
 *   - a late response for a user who has since signed out or switched is ignored;
 *   - after a timeout has set `unknown`, the timed-out check's late answer is
 *     ignored; only a newer check can resolve it.
 * `unknown` (error or timeout) is never shown as free/inactive and never as Pro:
 * consumers see it like loading (loading: true, isPro: false).
 */

export type EntitlementStatus = SubscriptionStatus | 'loading' | 'unknown';

/**
 * supabase-js answers "not signed in" with AuthSessionMissingError or a 4xx for a
 * bad/expired/revoked token or session (401/403 bad_jwt, 400 invalid_jwt or
 * refresh_token_not_found from a stale cookie, 404 user_not_found). Only a
 * 408/429 (timeout/throttle), a 5xx or a network failure (no status) means we do
 * not know who the user is, which must not be presented as "signed out / free".
 */
export function isSignedOutAuthError(err: { name?: string; status?: number } | null | undefined): boolean {
  if (!err || err.name === 'AuthSessionMissingError') return true;
  const s = err.status;
  return typeof s === 'number' && s >= 400 && s < 500 && s !== 408 && s !== 429;
}

export interface EntitlementState {
  status: EntitlementStatus;
  isPro: boolean;
  user: { id: string; email: string } | null;
  loading: boolean;
  /** Highest check started. */
  latestSeq: number;
  /** Highest check that timed out; its messages (and older ones) are void. */
  voidSeq: number;
  /** User identified by the latest check (null = signed out / not yet known). */
  authUserId: string | null;
}

export type EntitlementResponse =
  | { kind: 'begin'; seq: number }
  | { kind: 'auth'; seq: number; userId: string | null; email?: string }
  | { kind: 'resolved'; seq: number; userId: string; status: string | null | undefined }
  | { kind: 'unknown'; seq: number; userId: string }
  | { kind: 'timeout'; seq: number };

export const initialEntitlementState: EntitlementState = {
  status: 'loading',
  isPro: false,
  user: null,
  loading: true,
  latestSeq: 0,
  voidSeq: 0,
  authUserId: null,
};

function isCurrent(state: EntitlementState, seq: number): boolean {
  return seq === state.latestSeq && seq > state.voidSeq;
}

export function applyEntitlementResponse(state: EntitlementState, response: EntitlementResponse): EntitlementState {
  switch (response.kind) {
    case 'begin':
      // A newer check supersedes every older one. Display is left as is until it answers.
      return response.seq > state.latestSeq ? { ...state, latestSeq: response.seq } : state;

    case 'auth': {
      if (!isCurrent(state, response.seq)) return state;
      if (response.userId === null) {
        // Signed out: a definite, legitimate "not Pro".
        return { ...state, status: 'inactive', isPro: false, user: null, loading: false, authUserId: null };
      }
      const switched = state.authUserId !== response.userId;
      return {
        ...state,
        authUserId: response.userId,
        user: { id: response.userId, email: response.email ?? '' },
        // A different user must not inherit the previous user's entitlement.
        ...(switched ? { status: 'loading' as const, isPro: false, loading: true } : {}),
      };
    }

    case 'resolved': {
      if (!isCurrent(state, response.seq) || response.userId !== state.authUserId) return state;
      const raw = response.status;
      // No row (or an unrecognised value) is a real answer: not subscribed.
      const status: SubscriptionStatus =
        raw && (SUBSCRIPTION_STATUSES as readonly string[]).includes(raw) ? (raw as SubscriptionStatus) : 'inactive';
      return { ...state, status, isPro: isProStatus(status), loading: false };
    }

    case 'unknown':
      if (!isCurrent(state, response.seq) || response.userId !== state.authUserId) return state;
      return { ...state, status: 'unknown', isPro: false, loading: true };

    case 'timeout':
      if (!isCurrent(state, response.seq)) return state;
      return { ...state, status: 'unknown', isPro: false, loading: true, voidSeq: response.seq };

    default:
      return state;
  }
}
