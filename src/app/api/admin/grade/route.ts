import { NextResponse } from 'next/server';
import { adminGuard } from '@/lib/auth/admin';
import { GET as runGradingCron } from '@/app/api/cron/grade-picks/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Admin-triggered grading run. Only a server-verified admin (adminGuard: validated
 * session + confirmed email in ADMIN_EMAILS, same-origin POST) may trigger it. The
 * cron secret is used server-side only and never reaches the browser.
 */
export async function POST(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret.trim()) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  const internal = new Request(new URL('/api/cron/grade-picks', request.url), {
    headers: { authorization: `Bearer ${secret}` },
  });
  return runGradingCron(internal);
}
