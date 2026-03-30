/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events to keep subscription status in sync.
 *
 * Events handled:
 *   - checkout.session.completed       → provision subscription
 *   - customer.subscription.updated    → sync status changes
 *   - customer.subscription.deleted    → downgrade to free
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { upsertSubscription, getUserIdByStripeCustomer } from '@/lib/auth/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const userId = session.client_reference_id || session.metadata?.userId;
        if (!userId) {
          console.error('[Stripe Webhook] No userId in checkout session');
          break;
        }

        // Fetch the subscription to get period details
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await upsertSubscription({
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId
          || await getUserIdByStripeCustomer(subscription.customer as string);

        if (!userId) {
          console.error('[Stripe Webhook] Cannot find userId for subscription update');
          break;
        }

        await upsertSubscription({
          userId,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId
          || await getUserIdByStripeCustomer(subscription.customer as string);

        if (!userId) break;

        await upsertSubscription({
          userId,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: 'canceled',
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: false,
        });
        break;
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
