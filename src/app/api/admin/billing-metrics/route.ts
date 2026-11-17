import { NextResponse } from 'next/server';
import { cronAuthGuard } from '@/lib/api-helpers';
import { computeBillingMetrics } from '@/lib/pricing/metrics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/billing-metrics — MRR by price, subscribers by plan, trial -> paid,
 * 30-day churn and founding seats used. CRON_SECRET bearer only (same guard as the
 * cron routes); counts and amounts only, no personal data.
 */
export async function GET(request: Request) {
  const denied = cronAuthGuard(request);
  if (denied) return denied;
  try {
    return NextResponse.json(await computeBillingMetrics(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error('[billing-metrics]', e?.code || '(no code)', e?.message || String(err));
    return NextResponse.json({ error: 'metrics unavailable' }, { status: 502 });
  }
}
