import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { provisionGuestAndMagicLink, sendGuestAccessEmail, isGuestCheckoutEnabled } from '@/lib/guest-checkout';
import { allowedPriceIds, hasDailyAiPrice } from '@/lib/stripe-prices';

/** DailyAI's own prices only (shared Stripe account, B2): see lib/stripe-prices. */
function isDailyAiSubscription(subscription: Stripe.Subscription): boolean {
  const allowed = allowedPriceIds();
  if (allowed.size === 0) {
    // Misconfiguration: refuse (500, Stripe retries) rather than grant blindly.
    throw new Error('STRIPE_PRICE_ID not configured');
  }
  return hasDailyAiPrice(subscription, allowed);
}

/** Stripe subscription status -> user_subscriptions.status (CHECK-constrained). */
const STATUS_MAP: Record<string, string> = {
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'past_due',
  incomplete: 'inactive',
  incomplete_expired: 'canceled',
  paused: 'inactive',
};
function mapStatus(status: string): string {
  const mapped = STATUS_MAP[status];
  if (!mapped) console.warn(`[Stripe Webhook] Unknown subscription status: ${status}`);
  return mapped || 'inactive';
}

/** Statuses for which a missing DB row means "not created yet" (retry), not "nothing to do". */
const LIVE_STATUSES = new Set(['trialing', 'active', 'past_due']);

class RetryableWebhookError extends Error {}

function logError(where: string, err: unknown) {
  const e = err as { code?: string; message?: string } | null;
  console.error(`[Stripe Webhook] ${where}:`, e?.code || '(no code)', e?.message || String(err));
}

// Lazy singleton — avoids module-load failure when env vars absent during build
let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}
// Alias used throughout this file
const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logError('Signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    logError(`Error handling ${event.type} (${event.id})`, err);
    // Non-2xx so Stripe redelivers; a retry may succeed.
    const retryable = err instanceof RetryableWebhookError;
    return NextResponse.json(
      { error: retryable ? 'Not ready, retry later' : 'Webhook handler failed' },
      { status: retryable ? 503 : 500 },
    );
  }

  return NextResponse.json({ received: true });
}

/** A live subscription with no row is retried only this long after it was created. */
const ROW_WAIT_SECONDS = 60 * 60;

function periodFields(subscription: Stripe.Subscription) {
  const periodStart = subscription.items.data[0]?.current_period_start;
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return {
    status: mapStatus(subscription.status),
    price_id: subscription.items.data[0]?.price.id,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
  };
}

/** The row that already tracks this Stripe subscription, if any. */
async function rowForSubscription(subscriptionId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; user_id: string } | null;
}

async function updateBySubscription(subscription: Stripe.Subscription) {
  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .update(periodFields(subscription))
    .eq('stripe_subscription_id', subscription.id);
  if (error) throw error;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Only handle subscription checkouts (not one-time payments)
  if (session.mode !== 'subscription' || !session.subscription) {
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Stripe's CURRENT view of the subscription, not the (possibly stale, redelivered)
  // event payload (B5 ordering), and only for DailyAI's own prices (B2).
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (!isDailyAiSubscription(subscription)) {
    console.warn(`[Stripe Webhook] Ignoring checkout for a non-DailyAI price (subscription ${subscriptionId})`);
    return;
  }

  // Redelivery of a checkout we already recorded: refresh its state and stop. No
  // account provisioning (a new magic link would supersede the one already emailed)
  // and no second email (B5).
  if (await rowForSubscription(subscriptionId)) {
    await updateBySubscription(subscription);
    return;
  }

  let userId = session.metadata?.user_id || null;
  let guestEmail: string | null = null;
  let guestActionLink: string | null = null;

  // --- Guest checkout: no pre-existing account; create it from the paid email ---
  if (!userId) {
    if (!isGuestCheckoutEnabled()) {
      // B2: guest provisioning is off. Do not create accounts from arbitrary checkouts.
      // A paid DailyAI subscription with no account needs a person to reconcile it.
      console.error(`[Stripe Webhook] MANUAL RECONCILE: guest checkout disabled; paid subscription ${subscriptionId} has no DailyAI account`);
      return;
    }
    guestEmail = (
      session.metadata?.guest_email ||
      session.customer_details?.email ||
      session.customer_email ||
      ''
    ).toLowerCase().trim() || null;

    if (!guestEmail) {
      console.error(`[Stripe Webhook] MANUAL RECONCILE: no user_id and no guest email for subscription ${subscriptionId}`);
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';
    // Route through the proper session handler (parses the token hash + setSession),
    // same path as normal login — landing on /pro directly would not establish the session.
    const provisioned = await provisionGuestAndMagicLink(
      getSupabaseAdmin(),
      guestEmail,
      `${baseUrl}/auth/callback`,
    );
    userId = provisioned.userId;
    guestActionLink = provisioned.actionLink;
  }

  // The user's row may already track a DIFFERENT subscription (resubscribe, a late or
  // redelivered old checkout, or a guest checkout with an existing member's email).
  // Never let it replace a live subscription (H1): only a live incoming subscription
  // may replace a dead one.
  const { data: prior, error: priorError } = await supabaseAdmin
    .from('user_subscriptions')
    .select('stripe_subscription_id, status')
    .eq('user_id', userId)
    .maybeSingle();
  if (priorError) throw priorError;
  const incoming = periodFields(subscription);
  // The row may say "live" only because the old subscription's deletion event was
  // missed. Ask Stripe: a prior subscription Stripe has already ended is replaceable.
  let priorLive = !!prior?.stripe_subscription_id && prior.stripe_subscription_id !== subscriptionId && LIVE_STATUSES.has(prior.status);
  if (priorLive && prior?.stripe_subscription_id) {
    try {
      const current = await stripe.subscriptions.retrieve(prior.stripe_subscription_id);
      priorLive = LIVE_STATUSES.has(mapStatus(current.status));
    } catch (err) {
      const e = err as { code?: string; statusCode?: number };
      if (e?.code === 'resource_missing' || e?.statusCode === 404) priorLive = false;
      else throw err; // Stripe unreachable: retry the event rather than guess
    }
  }
  if (priorLive && prior?.stripe_subscription_id) {
    if (LIVE_STATUSES.has(incoming.status)) {
      console.error(`[Stripe Webhook] MANUAL RECONCILE: user already has live subscription ${prior.stripe_subscription_id}; second live subscription ${subscriptionId} not recorded (possible double billing)`);
    } else {
      console.warn(`[Stripe Webhook] Not replacing live subscription ${prior.stripe_subscription_id} with ${incoming.status} subscription ${subscriptionId}`);
    }
    return;
  }

  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      ...incoming, // B4: Stripe's real status (incomplete is not active)
    }, { onConflict: 'user_id' });

  if (error) {
    logError('Supabase upsert error', error);
    throw error;
  }

  // Guest: access is now granted — email them the magic link to sign in.
  // Failure here must NOT throw: payment + access already succeeded, and the
  // user can request a fresh link from the sign-in page.
  if (guestEmail && guestActionLink) {
    try {
      await sendGuestAccessEmail(guestEmail, guestActionLink);
    } catch (e) {
      logError('Failed to send guest access email', e);
    }
  }
}

async function handleSubscriptionUpdated(payload: Stripe.Subscription) {
  // A subscription we already track is always processed, whatever its price now
  // (a rotated or changed price must not freeze the row) (M1).
  if (await rowForSubscription(payload.id)) {
    // Write Stripe's current state, not the event payload: a stale update delivered
    // after a cancellation must not re-grant Pro (B5 ordering).
    await updateBySubscription(await stripe.subscriptions.retrieve(payload.id));
    return;
  }
  if (!isDailyAiSubscription(payload)) return; // another product on the shared account (B2)

  // B6: a DailyAI subscription with no row yet. While checkout.session.completed may
  // still be on its way, ask Stripe to retry; after that window, acknowledge and flag
  // it instead of retrying for days.
  const subscription = await stripe.subscriptions.retrieve(payload.id);
  if (!LIVE_STATUSES.has(mapStatus(subscription.status))) return;
  const ageSeconds = typeof subscription.created === 'number' ? Date.now() / 1000 - subscription.created : 0;
  if (ageSeconds < ROW_WAIT_SECONDS) {
    throw new RetryableWebhookError(`no user_subscriptions row yet for ${subscription.id}`);
  }
  console.error(`[Stripe Webhook] MANUAL RECONCILE: live DailyAI subscription ${subscription.id} has no user_subscriptions row`);
}

async function handleSubscriptionDeleted(payload: Stripe.Subscription) {
  // Only touch a row we track (any price); nothing to cancel otherwise.
  if (!(await rowForSubscription(payload.id))) return;
  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
    })
    .eq('stripe_subscription_id', payload.id);

  if (error) {
    logError('Subscription delete error', error);
    throw error;
  }
}
