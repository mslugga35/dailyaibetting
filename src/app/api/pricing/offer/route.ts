import { NextResponse } from 'next/server';
import { rateLimitGuard, resolveUser } from '@/lib/api-helpers';
import { getCurrentOffer, personalizeOffer } from '@/lib/pricing/offer';
import { getUserSubscription } from '@/lib/auth/subscription';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pricing/offer — the Pro plan on sale now (price, trial length, honest
 * founding-seat count). Public; no personal data in the response. A signed-in
 * former founding member gets the plan checkout would actually give them.
 */
export async function GET(request: Request) {
  const limited = rateLimitGuard(request, 60, 60_000, 'pricing-offer');
  if (limited) return limited;
  const base = await getCurrentOffer();
  let offer = base;
  try {
    const user = await resolveUser(request);
    if (user) offer = personalizeOffer(base, (await getUserSubscription(user.id)).priceId);
  } catch {
    // Personalisation is best effort; checkout enforces the real rule.
  }
  return NextResponse.json(offer, { headers: { 'Cache-Control': 'private, no-store' } });
}
