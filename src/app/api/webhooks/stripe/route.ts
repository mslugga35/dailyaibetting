import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { provisionGuestAndMagicLink, sendGuestAccessEmail, sendTrialNotAvailableEmail, isGuestCheckoutEnabled } from '@/lib/guest-checkout';
import { allowedPriceIds, hasDailyAiPrice } from '@/lib/stripe-prices';
import { transitionFoundingSeat, type SeatEvent } from '@/lib/pricing/offer';

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
      case 'invoice.paid': {
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }
      case 'charge.refunded':
      case 'charge.dispute.created': {
        await handleRefundOrDispute(event);
        break;
      }
      case 'checkout.session.expired': {
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
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
    // The Billing Portal now schedules cancellation with `cancel_at` (a date) and leaves
    // `cancel_at_period_end` false; either one means "access ends, no renewal".
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end || subscription.cancel_at),
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

function sessionEmail(session: Stripe.Checkout.Session): string | null {
  return (session.customer_details?.email || session.customer_email || session.metadata?.guest_email || '').toLowerCase().trim() || null;
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

  // A duplicate we (or an operator) cancelled is never recorded: a redelivered checkout for it must
  // not upsert it over the user's row nor touch the seat it shares with the first subscription.
  if (subscription.status === 'canceled' && isCancelledDuplicate(subscription)) {
    console.warn(`[Stripe Webhook] Ignoring checkout for cancelled duplicate subscription ${subscriptionId}`);
    return;
  }

  // Redelivery of a checkout we already recorded: refresh its state and stop. No
  // account provisioning (a new magic link would supersede the one already emailed)
  // and no second email (B5).
  if (await rowForSubscription(subscriptionId)) {
    await updateBySubscription(subscription);
    await syncFoundingSeat(subscription, session.metadata?.user_id || null);
    await enforceOneTrialPerCard(subscription, sessionEmail(session));
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
      console.error(`[billing-alert] guest_provisioning_disabled subscription=${subscriptionId} customer=${customerId} action=none (no account created, no email sent; MANUAL RECONCILE)`);
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
      await handleDuplicateSubscription(subscription, prior.stripe_subscription_id);
    } else {
      console.warn(`[Stripe Webhook] Not replacing live subscription ${prior.stripe_subscription_id} with ${incoming.status} subscription ${subscriptionId}`);
    }
    return;
  }
  // The row may not show it, but Stripe may: an older live DailyAI subscription on this customer.
  if (LIVE_STATUSES.has(incoming.status)) {
    const older = await olderLiveSubscriptionOnCustomer(subscription);
    if (older) {
      await handleDuplicateSubscription(subscription, older);
      return;
    }
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
  await expireOtherOpenSessions(customerId, session);
  await syncFoundingSeat(subscription, userId);
  // A cancelled reused-card trial gets the "no charge" email instead of the access email.
  if (await enforceOneTrialPerCard(subscription, guestEmail || sessionEmail(session))) return;

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

// ---------------------------------------------------------------- duplicate subscriptions (DAI-11)

const DUPLICATE_COMMENT = 'duplicate_trial: second live subscription cancelled without charge';

/**
 * Why WE cancelled a subscription is recorded in SERVER-ONLY subscription metadata (`dai_cancel_reason`),
 * never trusted from cancellation_details.comment, which a customer can type in the Billing Portal.
 * The old comment prefix is read only for 'trial_reuse' (cancelled before this change); duplicate
 * cancellations are new, so they have no comment fallback.
 */
const CANCEL_REASON_KEY = 'dai_cancel_reason';
function cancelReason(sub: Stripe.Subscription, reason: 'duplicate_trial' | 'trial_reuse'): boolean {
  if (sub.metadata?.[CANCEL_REASON_KEY] === reason) return true;
  return reason === 'trial_reuse' && (sub.cancellation_details?.comment || '').startsWith('trial_reuse');
}
function isCancelledDuplicate(sub: Stripe.Subscription): boolean {
  return cancelReason(sub, 'duplicate_trial');
}
const ALIVE_STRIPE_STATUSES = new Set(['trialing', 'active', 'past_due', 'unpaid']);

/**
 * After a checkout completes, the customer's other still-open DailyAI Checkout Sessions
 * (a second tab) must not be completable into a second subscription. Best effort: a
 * failure here never fails the webhook (the duplicate detection below is the backstop).
 */
async function expireOtherOpenSessions(customerId: string | null, completed: Stripe.Checkout.Session) {
  const userId = completed.metadata?.user_id;
  if (!customerId || !userId) return; // guest/unknown owner: expire nothing
  try {
    const open = await stripe.checkout.sessions.list({ customer: customerId, status: 'open', limit: 100 });
    for (const s of open.data) {
      // The Stripe account is shared with other products: only this user's DailyAI-marked sessions,
      // and never one created AFTER the completed one (a newer attempt). Sessions created before the
      // marker existed lack metadata.app and are skipped.
      if (s.id === completed.id || s.mode !== 'subscription' || s.metadata?.app !== 'dailyai' || s.metadata?.user_id !== userId) continue;
      if (typeof completed.created === 'number' && typeof s.created === 'number' && s.created > completed.created) continue;
      try { await stripe.checkout.sessions.expire(s.id); } catch (e) { logError(`expire open session ${s.id}`, e); }
    }
  } catch (e) {
    logError('list open sessions to expire', e);
  }
}

/** An OLDER live DailyAI subscription on the same Stripe customer, or null. */
async function olderLiveSubscriptionOnCustomer(subscription: Stripe.Subscription): Promise<string | null> {
  const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  if (!customer) return null;
  const subs = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 });
  const allowed = allowedPriceIds();
  const older = subs.data
    .filter((s) => s.id !== subscription.id && ALIVE_STRIPE_STATUSES.has(s.status) && hasDailyAiPrice(s, allowed))
    .filter((s) => (s.created ?? 0) < (subscription.created ?? 0) || ((s.created ?? 0) === (subscription.created ?? 0) && s.id < subscription.id))
    .sort((a, b) => (a.created ?? 0) - (b.created ?? 0));
  return older[0]?.id ?? null;
}

/**
 * A second live DailyAI subscription appeared. Always alert (ids only). A duplicate that is
 * still a free TRIAL (nothing charged yet) is cancelled without invoice or proration ONLY
 * when DAI_AUTO_CANCEL_DUPLICATE_TRIAL=true. A paid duplicate is never cancelled here.
 */
async function handleDuplicateSubscription(duplicate: Stripe.Subscription, primaryId: string) {
  const customer = typeof duplicate.customer === 'string' ? duplicate.customer : duplicate.customer?.id;
  const autoCancel = process.env.DAI_AUTO_CANCEL_DUPLICATE_TRIAL === 'true' && duplicate.status === 'trialing';
  console.error(`[billing-alert] duplicate_subscription customer=${customer} subscription=${duplicate.id} primary=${primaryId} status=${duplicate.status} action=${autoCancel ? 'cancel_trial' : 'none'}`);
  if (!autoCancel) return;
  try {
    await stripe.subscriptions.update(duplicate.id, { metadata: { [CANCEL_REASON_KEY]: 'duplicate_trial' } });
    await stripe.subscriptions.cancel(duplicate.id, {
      invoice_now: false,
      prorate: false,
      cancellation_details: { comment: DUPLICATE_COMMENT },
    });
  } catch (err) {
    // A concurrent delivery may have cancelled it first.
    const current = await stripe.subscriptions.retrieve(duplicate.id);
    if (current.status !== 'canceled') throw err;
  }
}

async function handleSubscriptionUpdated(payload: Stripe.Subscription) {
  // A subscription we already track is always processed, whatever its price now
  // (a rotated or changed price must not freeze the row) (M1).
  if (await rowForSubscription(payload.id)) {
    // Write Stripe's current state, not the event payload: a stale update delivered
    // after a cancellation must not re-grant Pro (B5 ordering).
    const current = await stripe.subscriptions.retrieve(payload.id);
    await updateBySubscription(current);
    await syncFoundingSeat(current, null);
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
  // A founding seat follows its subscription even when no row was ever written.
  // A duplicate subscription shares the first one's seat (one seat per customer) and the database moves
  // a seat by its id without checking the subscription, so ending the seat for ANY deleted subscription
  // would release the legitimate one (cancelled by us, or by hand in the Dashboard). Only the subscription the
  // seat or the user's row is bound to may end it.
  // transitionSeat also refuses to move a seat bound to another LIVE subscription (N1), for every event.
  // Defence in depth (not applied, optional): dailyai_founding_transition could refuse the same in SQL.
  if (isFoundingSubscription(payload) && (await isBoundToSeatOrRow(payload.id))) {
    await transitionSeat('ended', payload, null);
  }
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

// ---------------------------------------------------------------- Founding Member seats

/** True when this subscription is the one a user row or a founding seat is bound to. */
async function isBoundToSeatOrRow(subscriptionId: string): Promise<boolean> {
  if (await rowForSubscription(subscriptionId)) return true;
  const { data, error } = await supabaseAdmin
    .from('dailyai_founding_seats')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

function foundingPriceId(): string {
  return (process.env.STRIPE_PRICE_FOUNDING || '').trim();
}

/** A subscription on the founding price, or one created by a founding checkout. */
function isFoundingSubscription(subscription: Stripe.Subscription): boolean {
  const price = foundingPriceId();
  if (!price) return false;
  return subscription.items.data.some((i) => i.price?.id === price) || !!subscription.metadata?.founding_seat_id;
}

function seatIdOf(subscription: Stripe.Subscription): number | null {
  const n = Number(subscription.metadata?.founding_seat_id);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * N1: the live subscription a seat is bound to when it is NOT this one, else null.
 * A duplicate subscription carries the same founding_seat_id (one seat per customer), and the database
 * looks a seat up by that id and re-binds it on 'started'/'paid' (and ends it on 'ended') without
 * checking which subscription it belongs to. So no webhook path may move a seat for a subscription
 * other than the one it is bound to while that one is still alive in Stripe. A seat whose bound
 * subscription has ended (or is gone) may still be claimed, as before. Read errors throw (retry).
 */
async function liveOtherSeatOwner(subscription: Stripe.Subscription): Promise<string | null> {
  const seatId = seatIdOf(subscription);
  if (seatId == null) return null; // looked up by this subscription's own id: cannot reach another's seat
  const { data, error } = await supabaseAdmin
    .from('dailyai_founding_seats')
    .select('id, stripe_subscription_id')
    .eq('id', seatId)
    .maybeSingle();
  if (error) throw error;
  const bound = (data as { stripe_subscription_id: string | null } | null)?.stripe_subscription_id;
  if (!bound || bound === subscription.id) return null;
  try {
    const current = await stripe.subscriptions.retrieve(bound);
    return ALIVE_STRIPE_STATUSES.has(current.status) ? bound : null;
  } catch (err) {
    const e = err as { code?: string; statusCode?: number };
    if (e?.code === 'resource_missing' || e?.statusCode === 404) return null;
    throw err; // Stripe unreachable: retry rather than guess
  }
}

async function transitionSeat(event: SeatEvent, subscription: Stripe.Subscription, userId: string | null) {
  const owner = await liveOtherSeatOwner(subscription);
  if (owner) {
    const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    console.error(`[billing-alert] duplicate_subscription customer=${customer} subscription=${subscription.id} primary=${owner} status=${subscription.status} action=none (founding seat ${seatIdOf(subscription)} stays with ${owner}; seat event '${event}' not applied)`);
    return;
  }
  const r = await transitionFoundingSeat({ event, seatId: seatIdOf(subscription), subscriptionId: subscription.id, userId });
  if (!r && subscription.status !== 'canceled' && subscription.status !== 'incomplete_expired') {
    // A founding-price subscription that never had a seat (created in the Dashboard, or a
    // plan switch): it is not counted against the cap. A person must review it.
    console.error(`[Stripe Webhook] MANUAL REVIEW: founding-price subscription ${subscription.id} has no founding seat (not counted against the cap)`);
  }
  if (r?.over_cap) {
    console.error(`[Stripe Webhook] MANUAL REVIEW: founding seat ${r.seat_id} re-claimed beyond the cap for subscription ${subscription.id}`);
  }
}

/** True when the subscription's latest invoice actually collected money. */
async function latestInvoicePaid(subscription: Stripe.Subscription): Promise<boolean> {
  const ref = subscription.latest_invoice;
  if (!ref) return false;
  const inv = typeof ref === 'string' ? await stripe.invoices.retrieve(ref) : ref;
  return inv.status === 'paid' && inv.amount_paid > 0;
}

/**
 * Keep the seat in step with Stripe's CURRENT subscription state (idempotent: the
 * database only moves a seat forward). A seat converts only when money was collected:
 * when a trial ends Stripe briefly reports the subscription "active" while the first
 * invoice is still unpaid, so "active" alone is not proof of payment.
 * canceled = ended; anything else = subscription exists but unpaid.
 */
async function syncFoundingSeat(subscription: Stripe.Subscription, userId: string | null) {
  if (!isFoundingSubscription(subscription)) return;
  const st = subscription.status;
  let event: SeatEvent;
  if (st === 'canceled' || st === 'incomplete_expired') event = 'ended';
  else if ((st === 'active' || st === 'past_due') && (await latestInvoicePaid(subscription))) event = 'paid';
  else event = 'started';
  await transitionSeat(event, subscription, userId);
}

/** invoice.paid with money collected: the precise "first successful payment" signal. */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!foundingPriceId() || !(invoice.amount_paid > 0)) return;
  const inv = invoice as Stripe.Invoice & { subscription?: string | { id: string } | null };
  const ref = invoice.parent?.subscription_details?.subscription ?? inv.subscription ?? null;
  const subscriptionId = typeof ref === 'string' ? ref : ref?.id;
  if (!subscriptionId) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  // Map from the subscription's CURRENT status: a payment event that arrives after the
  // subscription already ended must not convert (re-claim) its seat.
  await syncFoundingSeat(subscription, null);
}

/** An abandoned founding checkout frees its seat at once (the hold would expire anyway). */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const n = Number(session.metadata?.founding_seat_id);
  if (!foundingPriceId() || !Number.isSafeInteger(n) || n <= 0) return;
  await transitionFoundingSeat({ event: 'expired', seatId: n, sessionId: session.id });
}

// ---------------------------------------------------------------- one free trial per card

/** Card and dispute bookkeeping need the founding migration, a prerequisite of founding/regular mode. */
function billingTablesEnabled(): boolean {
  const m = (process.env.PRICING_MODE || '').trim().toLowerCase();
  return m === 'founding' || m === 'regular';
}

/**
 * One free trial per payment card. Email checks at checkout catch the same person with
 * the same email; a different email with the same card is only visible here, once the
 * card is known. Checkout showed this customer "$0 due today", so a trial on a card that
 * already had a DailyAI trial under another customer is CANCELLED at once, without an
 * invoice: the customer is never charged for a trial they were shown as free. Access
 * ends now, the founding seat is released, and the customer is emailed that nothing was
 * charged and how to subscribe without a trial. Returns true when the trial was refused.
 *
 * Crash-safe and idempotent: the cancellation is marked on the subscription itself
 * (cancellation_details.comment = trial_reuse...), the email is marked sent with
 * metadata.trial_reuse_notified, so a redelivery (after any partial failure) finishes
 * whatever is left: email, access row, seat. A trial that passed the check is stamped
 * metadata.trial_card_checked so the success page can tell "checked" from "not yet".
 */
const TRIAL_REUSE_COMMENT = 'trial_reuse: card already used for a DailyAI free trial; cancelled without charge';

function newPlanPrices(): string[] {
  return [process.env.STRIPE_PRICE_FOUNDING, process.env.STRIPE_PRICE_PRO].map((v) => (v || '').trim()).filter(Boolean);
}

async function enforceOneTrialPerCard(subscription: Stripe.Subscription, email: string | null): Promise<boolean> {
  if (!billingTablesEnabled()) return false;
  // Only the new plans: a legacy $20 subscription is never modified automatically.
  if (!subscription.items.data.some((i) => newPlanPrices().includes(i.price?.id))) return false;
  // Redelivery after a refusal: finish what a failed attempt may have left undone.
  if (subscription.status === 'canceled' && cancelReason(subscription, 'trial_reuse')) {
    await finishTrialRefusal(subscription, email);
    return true;
  }
  if (subscription.status !== 'trialing') return false;
  // Idempotent (DAI-12): a trial that already passed the check is never re-judged. A redelivered
  // event after the customer changed card must not cancel a trial we already approved.
  if (subscription.metadata?.trial_card_checked === '1') return false;
  const markChecked = async () => {
    if (subscription.metadata?.trial_card_checked === '1') return;
    await stripe.subscriptions.update(subscription.id, { metadata: { trial_card_checked: '1' } });
  };
  const pmRef = subscription.default_payment_method;
  const pm = !pmRef ? null : typeof pmRef === 'string' ? await stripe.paymentMethods.retrieve(pmRef) : pmRef;
  const fingerprint = pm?.card?.fingerprint;
  if (!fingerprint) { await markChecked(); return false; } // no card (e.g. a wallet): cannot check
  const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const { data, error } = await supabaseAdmin.rpc('dailyai_claim_trial_fingerprint', {
    p_fingerprint: fingerprint, p_customer: customer, p_subscription: subscription.id,
  });
  if (error) throw error;
  if (data !== 'reused') { await markChecked(); return false; }
  // invoice_now:false + prorate:false: no final invoice, no charge, no credit.
  let cancelled: Stripe.Subscription;
  try {
    await stripe.subscriptions.update(subscription.id, { metadata: { [CANCEL_REASON_KEY]: 'trial_reuse' } });
    cancelled = await stripe.subscriptions.cancel(subscription.id, {
      invoice_now: false,
      prorate: false,
      cancellation_details: { comment: TRIAL_REUSE_COMMENT },
    });
  } catch (err) {
    // A concurrent delivery may have cancelled it first: carry on from Stripe's state.
    cancelled = await stripe.subscriptions.retrieve(subscription.id);
    if (cancelled.status !== 'canceled') throw err;
  }
  console.warn(`[Stripe Webhook] Trial cancelled without charge for ${subscription.id}: card already used for a DailyAI trial by another customer`);
  await finishTrialRefusal(cancelled, email);
  return true;
}

/** Email first (marked on the subscription once sent), then access row and seat. Each step is idempotent. */
async function finishTrialRefusal(cancelled: Stripe.Subscription, email: string | null) {
  let emailFailed = false;
  if (cancelled.metadata?.trial_reuse_notified !== '1') {
    if (email && !process.env.RESEND_API_KEY) {
      // configuration gap, not a transient failure: do not make Stripe retry for days
      console.error(`[Stripe Webhook] MANUAL FOLLOW-UP: trial ${cancelled.id} cancelled (card reuse); email not configured, tell the customer nothing was charged`);
    } else if (email) {
      try {
        await sendTrialNotAvailableEmail(email);
        await stripe.subscriptions.update(cancelled.id, { metadata: { trial_reuse_notified: '1' } });
      } catch (e) {
        emailFailed = true;
        logError('Failed to send trial-not-available email (will retry on redelivery)', e);
      }
    } else {
      console.error(`[Stripe Webhook] MANUAL FOLLOW-UP: trial ${cancelled.id} cancelled (card reuse) but no email to notify`);
    }
  }
  await updateBySubscription(cancelled); // access ends now, not when the deletion event arrives
  if (isFoundingSubscription(cancelled)) await transitionSeat('ended', cancelled, null); // trialing -> released
  // Ask Stripe to redeliver so the customer is told nothing was charged.
  if (emailFailed) throw new RetryableWebhookError(`trial-not-available email not sent for ${cancelled.id}`);
}

// ---------------------------------------------------------------- refunds and disputes

/**
 * Record refunds and disputes for DailyAI customers (idempotent by event id) and mark
 * the founding seat. Nothing is refunded, cancelled or downgraded here: a refund that
 * also cancels the subscription ends Pro through customer.subscription.deleted.
 */
async function handleRefundOrDispute(event: Stripe.Event) {
  let charge: Stripe.Charge;
  let dispute: Stripe.Dispute | null = null;
  if (event.type === 'charge.dispute.created') {
    dispute = event.data.object as Stripe.Dispute;
    const ref = dispute.charge;
    charge = typeof ref === 'string' ? await stripe.charges.retrieve(ref) : ref;
  } else {
    charge = event.data.object as Stripe.Charge;
  }
  const customer = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id ?? null;
  if (!customer) return;
  // Attribute the charge to the subscription it paid for, and only if that is a DailyAI
  // subscription: one Stripe customer can also hold another product's subscription.
  const subscription = await subscriptionForCharge(charge);
  if (!subscription || !isDailyAiSubscription(subscription)) return;
  console.warn(`[Stripe Webhook] ${event.type} for DailyAI subscription ${subscription.id}: charge ${charge.id}, amount ${dispute ? dispute.amount : charge.amount_refunded}`);
  if (!billingTablesEnabled()) return; // legacy mode: logged only
  const row = { stripe_subscription_id: subscription.id };

  const { error } = await supabaseAdmin.from('dailyai_billing_events').upsert({
    stripe_event_id: event.id,
    event_type: event.type,
    stripe_customer_id: customer,
    stripe_subscription_id: row.stripe_subscription_id,
    stripe_charge_id: charge.id,
    amount_cents: dispute ? dispute.amount : charge.amount,
    refunded_cents: dispute ? null : charge.amount_refunded,
    dispute_reason: dispute ? dispute.reason : null,
  }, { onConflict: 'stripe_event_id', ignoreDuplicates: true });
  if (error) throw error;

  if (!isFoundingSubscription(subscription)) return;
  const seatQuery = supabaseAdmin.from('dailyai_founding_seats');
  if (dispute) {
    const { error: seatError } = await seatQuery.update({ disputed_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscription.id).is('disputed_at', null);
    if (seatError) throw seatError;
    return;
  }
  // Total refunded on this subscription = sum over its charges of each charge's latest
  // (largest) amount_refunded: order-independent and safe to replay.
  const { data: refunds, error: refundsError } = await supabaseAdmin
    .from('dailyai_billing_events')
    .select('stripe_charge_id, refunded_cents')
    .eq('stripe_subscription_id', subscription.id)
    .eq('event_type', 'charge.refunded');
  if (refundsError) throw refundsError;
  const perCharge = new Map<string, number>();
  for (const r of (refunds || []) as { stripe_charge_id: string; refunded_cents: number | null }[]) {
    perCharge.set(r.stripe_charge_id, Math.max(perCharge.get(r.stripe_charge_id) ?? 0, r.refunded_cents ?? 0));
  }
  const total = [...perCharge.values()].reduce((a, b) => a + b, 0);
  const { error: seatError } = await seatQuery.update({ refunded_cents: total }).eq('stripe_subscription_id', subscription.id);
  if (seatError) throw seatError;
}

/** The subscription a charge paid for (charge -> PaymentIntent -> invoice payment -> invoice), or null. */
async function subscriptionForCharge(charge: Stripe.Charge): Promise<Stripe.Subscription | null> {
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return null;
  const payments = await stripe.invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: pi }, limit: 1 });
  const invRef = payments.data[0]?.invoice;
  if (!invRef) return null; // not an invoice charge (e.g. a one-off payment)
  const invoice = typeof invRef === 'string' ? await stripe.invoices.retrieve(invRef) : invRef;
  if ('deleted' in invoice && invoice.deleted) return null;
  const subRef = (invoice as Stripe.Invoice).parent?.subscription_details?.subscription;
  const subId = typeof subRef === 'string' ? subRef : subRef?.id;
  return subId ? stripe.subscriptions.retrieve(subId) : null;
}
