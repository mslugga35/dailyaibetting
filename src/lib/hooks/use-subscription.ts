'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type SubscriptionStatus = 'loading' | 'active' | 'trialing' | 'inactive' | 'past_due' | 'canceled';

interface SubscriptionState {
  status: SubscriptionStatus;
  isPro: boolean;
  user: { id: string; email: string } | null;
  loading: boolean;
}

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    status: 'loading',
    isPro: false,
    user: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    async function checkSubscription() {
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

      const status = (sub?.status as SubscriptionStatus) || 'inactive';
      const isPro = status === 'active' || status === 'trialing';

      setState({
        status,
        isPro,
        user: { id: user.id, email: user.email || '' },
        loading: false,
      });
    }

    checkSubscription();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription();
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
