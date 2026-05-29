import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { provisionGuestAndMagicLink, sendGuestAccessEmail } from '@/lib/guest-checkout';

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
    console.error('[Stripe Webhook] Signature verification failed:', err);
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
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Only handle subscription checkouts (not one-time payments)
  if (session.mode !== 'subscription' || !session.subscription) {
    return;
  }

  let userId = session.metadata?.user_id || null;
  let guestEmail: string | null = null;
  let guestActionLink: string | null = null;

  // --- Guest checkout: no pre-existing account; create it from the paid email ---
  if (!userId) {
    guestEmail = (
      session.metadata?.guest_email ||
      session.customer_details?.email ||
      session.customer_email ||
      ''
    ).toLowerCase().trim() || null;

    if (!guestEmail) {
      console.error('[Stripe Webhook] No user_id and no guest email in session');
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';
    const provisioned = await provisionGuestAndMagicLink(
      getSupabaseAdmin(),
      guestEmail,
      `${baseUrl}/pro`,
    );
    userId = provisioned.userId;
    guestActionLink = provisioned.actionLink;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const periodStart = subscription.items.data[0]?.current_period_start;
  const periodEnd = subscription.items.data[0]?.current_period_end;

  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: subscription.status === 'trialing' ? 'trialing' : 'active',
      price_id: subscription.items.data[0]?.price.id,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('[Stripe Webhook] Supabase upsert error:', error);
    throw error;
  }

  // Guest: access is now granted — email them the magic link to sign in.
  // Failure here must NOT throw: payment + access already succeeded, and the
  // user can request a fresh link from the sign-in page.
  if (guestEmail && guestActionLink) {
    try {
      await sendGuestAccessEmail(guestEmail, guestActionLink);
    } catch (e) {
      console.error('[Stripe Webhook] Failed to send guest access email:', e);
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const periodStart = subscription.items.data[0]?.current_period_start;
  const periodEnd = subscription.items.data[0]?.current_period_end;

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
  const mappedStatus = STATUS_MAP[subscription.status];
  if (!mappedStatus) {
    console.warn(`[Stripe Webhook] Unknown subscription status: ${subscription.status}`);
  }

  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: mappedStatus || 'inactive',
      price_id: subscription.items.data[0]?.price.id,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('[Stripe Webhook] Subscription update error:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('[Stripe Webhook] Subscription delete error:', error);
    throw error;
  }
}
