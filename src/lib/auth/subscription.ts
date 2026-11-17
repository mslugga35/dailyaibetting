import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { isProStatus, type SubscriptionStatus } from '@/lib/constants/subscription';
import { isSignedOutAuthError } from '@/lib/auth/apply-entitlement-response';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export { isSignedOutAuthError };

/** The signed-in user, null when signed out. Throws EntitlementUnavailableError on an auth outage. */
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user) return user;
  if (error && !isSignedOutAuthError(error)) {
    logUnavailable('AUTH', error.message || 'auth lookup failed');
    throw new EntitlementUnavailableError('AUTH', error.message || 'auth lookup failed');
  }
  return null;
}

export interface UserSubscription {
  userId: string;
  plan: 'free' | 'premium';
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Stripe price of the tracked subscription (founding / regular / legacy $20 / other). */
  priceId: string | null;
}

/** How long one entitlement read may take before it is treated as unavailable. */
export const ENTITLEMENT_TIMEOUT_MS = 4000;

/**
 * The subscription could not be read (database error, outage or timeout).
 * Entitlement is UNKNOWN: callers must neither treat the user as free (a silent
 * downgrade of a paying subscriber) nor as premium (fail-open).
 */
export class EntitlementUnavailableError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`Entitlement unavailable: ${message}`);
    this.name = 'EntitlementUnavailableError';
    this.code = code;
  }
}

interface ReadOptions {
  /** Override for tests; defaults to ENTITLEMENT_TIMEOUT_MS. */
  timeoutMs?: number;
}

function logUnavailable(code: string, message: string) {
  // Code and message only: never the row, the user's data or any key.
  console.error('Entitlement read failed:', code || '(no code)', message);
}

export async function getUserSubscription(userId: string, opts: ReadOptions = {}): Promise<UserSubscription> {
  const timeoutMs = opts.timeoutMs ?? ENTITLEMENT_TIMEOUT_MS;
  const supabase = createServiceClient();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const query = supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .abortSignal(controller.signal)
    // Not .single(): its PGRST116 means both "no row" and "several rows". Two rows
    // for one user is ambiguous and must not read as "no subscription".
    .limit(2);

  // The race is the authoritative decision; the abort only cancels the request.
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new EntitlementUnavailableError('TIMEOUT', `no answer within ${timeoutMs}ms`));
    }, timeoutMs);
  });

  let result: { data: Record<string, unknown>[] | null; error: { code?: string; message?: string } | null };
  try {
    result = (await Promise.race([Promise.resolve(query), timeout])) as typeof result;
  } catch (err) {
    if (err instanceof EntitlementUnavailableError) {
      logUnavailable(err.code, err.message);
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    logUnavailable('', message);
    throw new EntitlementUnavailableError('', message);
  } finally {
    if (timer) clearTimeout(timer);
  }

  const { data: rows, error } = result;
  if (error || !Array.isArray(rows)) {
    const code = error?.code || '';
    const message = error?.message || 'no data returned';
    logUnavailable(code, message);
    throw new EntitlementUnavailableError(code, message);
  }
  if (rows.length > 1) {
    logUnavailable('DUPLICATE', `${rows.length} subscription rows for one user`);
    throw new EntitlementUnavailableError('DUPLICATE', 'more than one subscription row for this user');
  }
  const data = rows[0];

  if (!data) {
    return {
      userId,
      plan: 'free',
      status: 'inactive',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      priceId: null,
    };
  }

  return {
    userId,
    plan: isProStatus(data.status as string) ? 'premium' : 'free',
    status: data.status as SubscriptionStatus,
    stripeCustomerId: (data.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (data.stripe_subscription_id as string | null) ?? null,
    currentPeriodEnd: (data.current_period_end as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    priceId: (data.price_id as string | null) ?? null,
  };
}

/**
 * True/false only when entitlement was actually read. Throws
 * EntitlementUnavailableError when it could not be: never converted to true or false.
 */
export async function isPremium(userId: string, opts: ReadOptions = {}): Promise<boolean> {
  const sub = await getUserSubscription(userId, opts);
  return sub.plan === 'premium';
}
