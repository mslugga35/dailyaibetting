/**
 * Subscription helpers — check if a user has an active premium subscription.
 * Uses the service-role Supabase client so it can read user_subscriptions
 * regardless of RLS policies.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Create a server-side Supabase client using the request cookies. */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore: called from Server Component where cookies are read-only
          }
        },
      },
    }
  );
}

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
  const supabase = createSupabaseServerClient();
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
  await supabase.from('user_subscriptions').upsert(
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
