/**
 * Subscription helpers — check if a user has an active premium subscription.
 * Uses the service-role Supabase client so it can read user_subscriptions
 * regardless of RLS policies.
 */

import { createServerClient } from '@supabase/ssr';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** Create a service-role Supabase client (bypasses RLS). */
function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

/** Get the current authenticated user (or null). */
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export interface UserSubscription {
  userId: string;
  plan: 'free' | 'premium';
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/** Fetch subscription record for a user. Returns free-tier defaults if none found. */
export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!data) {
    return {
      userId,
      plan: 'free',
      status: 'inactive',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  return {
    userId,
    plan: data.status === 'active' || data.status === 'trialing' ? 'premium' : 'free',
    status: data.status,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  };
}

/** Returns true if the user has an active premium subscription. */
export async function isPremium(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  return sub.plan === 'premium';
}

/** Upsert a subscription record (used by Stripe webhook handler). */
export async function upsertSubscription(data: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('user_subscriptions').upsert(
    {
      user_id: data.userId,
      stripe_customer_id: data.stripeCustomerId,
      stripe_subscription_id: data.stripeSubscriptionId,
      status: data.status,
      plan: data.status === 'active' || data.status === 'trialing' ? 'premium' : 'free',
      current_period_end: data.currentPeriodEnd.toISOString(),
      cancel_at_period_end: data.cancelAtPeriodEnd,
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    console.error('[Subscription] upsert error:', error);
    throw error;
  }
}

/** Get userId from a Stripe customer ID (used in webhook). */
export async function getUserIdByStripeCustomer(stripeCustomerId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();
  return data?.user_id ?? null;
}
