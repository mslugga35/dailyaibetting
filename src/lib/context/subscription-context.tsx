'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isProStatus, SUBSCRIPTION_STATUSES, type SubscriptionStatus } from '@/lib/constants/subscription';

interface SubscriptionState {
  status: SubscriptionStatus | 'loading';
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
  const [state, setState] = useState<SubscriptionState>({
    status: 'loading',
    isPro: false,
    user: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setState({ status: 'inactive', isPro: false, user: null, loading: false });
          return;
        }

        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .single();

        const rawStatus = sub?.status;
        const status: SubscriptionStatus = rawStatus && SUBSCRIPTION_STATUSES.includes(rawStatus as SubscriptionStatus) ? rawStatus as SubscriptionStatus : 'inactive';
        setState({
          status,
          isPro: isProStatus(status),
          user: { id: user.id, email: user.email || '' },
          loading: false,
        });
      } catch {
        setState({ status: 'inactive', isPro: false, user: null, loading: false });
      }
    }

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        check();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SubscriptionContext.Provider value={state}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
