import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { resolveUser, getSupabaseAdmin } from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getSupabaseAdmin();
    const { data: sub } = await db
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';

    // A portal configuration with plan switching DISABLED keeps every subscriber on the
    // price they bought (founding $9.99, legacy $20): a switch would move them off it.
    // Unset = the account's default configuration (it must also have switching off).
    const configuration = (process.env.STRIPE_PORTAL_CONFIGURATION_ID || '').trim();
    const mode = (process.env.PRICING_MODE || '').trim().toLowerCase();
    if (!configuration && (mode === 'founding' || mode === 'regular')) {
      // Fail closed: with several prices on sale, the default configuration could let a
      // subscriber switch prices (moving a $20 member to $9.99, or a founder off $9.99).
      console.error('Billing portal: STRIPE_PORTAL_CONFIGURATION_ID is required when PRICING_MODE is founding/regular');
      return NextResponse.json({ error: 'Billing portal is temporarily unavailable' }, { status: 503 });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${baseUrl}/pro`,
      ...(configuration ? { configuration } : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 },
    );
  }
}
