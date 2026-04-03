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

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${baseUrl}/pro`,
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
