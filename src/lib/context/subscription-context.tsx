'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  applyEntitlementResponse,
  initialEntitlementState,
  isSignedOutAuthError,
  type EntitlementStatus,
} from '@/lib/auth/apply-entitlement-response';

/** How long one client entitlement check may take before it is shown as unknown. */
const CLIENT_ENTITLEMENT_TIMEOUT_MS = 8000;
/** Re-check after an unknown result: 15s, 30s, 60s, then every 120s. */
const retryDelayMs = (attempt: number) => Math.min(15000 * 2 ** attempt, 120000);

interface SubscriptionState {
  /** 'unknown' = could not be verified (error or timeout). Treat it like loading. */
  status: EntitlementStatus;
  isPro: boolean;
  user: { id: string; email: string } | null;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionState>({
  status: 'loading',
  isPro: false,
  user: null,
  loading: true,
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(applyEntitlementResponse, initialEntitlementState);

  useEffect(() => {
    const supabase = createClient();
    let seq = 0;
    let unmounted = false;
    let inFlight: { controller: AbortController; timer: ReturnType<typeof setTimeout> } | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryAttempt = 0;

    function scheduleRetry() {
      if (unmounted || retryTimer) return;
      retryTimer = setTimeout(() => { retryTimer = null; retryAttempt += 1; check(); }, retryDelayMs(retryAttempt));
    }
    function settled() {
      retryAttempt = 0;
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    }

    function cancelInFlight() {
      if (!inFlight) return;
      clearTimeout(inFlight.timer);
      inFlight.controller.abort();
      inFlight = null;
    }

    async function check() {
      // A new check (mount, sign-in, sign-out, user change) supersedes the previous one.
      cancelInFlight();
      const mySeq = ++seq;
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        if (!unmounted) { dispatch({ kind: 'timeout', seq: mySeq }); scheduleRetry(); }
      }, CLIENT_ENTITLEMENT_TIMEOUT_MS);
      inFlight = { controller, timer };
      dispatch({ kind: 'begin', seq: mySeq });

      let userId: string | null = null;
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (unmounted || controller.signal.aborted) return;
        if (!user && !isSignedOutAuthError(authError)) {
          // Auth server/network failure: we do not know who this is. Never "signed out".
          dispatch({ kind: 'timeout', seq: mySeq });
          scheduleRetry();
          return;
        }
        userId = user?.id ?? null;
        dispatch({ kind: 'auth', seq: mySeq, userId, email: user?.email ?? '' });
        if (!user) { settled(); return; }

        const { data: sub, error } = await supabase
          .from('user_subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .abortSignal(controller.signal)
          .maybeSingle();
        if (unmounted || controller.signal.aborted) return;
        if (error) {
          // Never "inactive" on error: we do not know.
          dispatch({ kind: 'unknown', seq: mySeq, userId: user.id });
          scheduleRetry();
          return;
        }
        dispatch({ kind: 'resolved', seq: mySeq, userId: user.id, status: sub?.status ?? null });
        settled();
      } catch {
        // Aborted by timeout (already reported), unmount or a newer check: nothing to do.
        if (unmounted || timedOut || controller.signal.aborted) return;
        if (userId) dispatch({ kind: 'unknown', seq: mySeq, userId });
        else dispatch({ kind: 'timeout', seq: mySeq });
        scheduleRetry();
      } finally {
        clearTimeout(timer);
        if (inFlight?.controller === controller) inFlight = null;
      }
    }

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        check();
      }
    });

    return () => {
      unmounted = true;
      if (retryTimer) clearTimeout(retryTimer);
      cancelInFlight();
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SubscriptionState>(
    () => ({ status: state.status, isPro: state.isPro, user: state.user, loading: state.loading }),
    [state.status, state.isPro, state.user, state.loading],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
