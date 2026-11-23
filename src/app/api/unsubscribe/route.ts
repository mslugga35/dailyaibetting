/**
 * DAI-26: unsubscribe for `email_subscribers` (sets unsubscribed_at; never deletes the row).
 *
 * POST only (a GET from a link scanner must not unsubscribe anyone):
 *  - RFC 8058 one-click: the mail client POSTs `List-Unsubscribe=One-Click` to
 *    /api/unsubscribe?id=..&t=.. -> 200.
 *  - The /unsubscribe page form posts id + t -> 303 back to /unsubscribe?done=1.
 * The id/token pair is an HMAC over the row id (see lib/email/unsubscribe-token.ts).
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin, rateLimitGuard } from '@/lib/api-helpers';
import { verifyUnsubscribe } from '@/lib/email/unsubscribe-token';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = rateLimitGuard(request, 20, 60_000, 'unsubscribe');
  if (limited) return limited;

  const url = new URL(request.url);
  let id: string | null = url.searchParams.get('id');
  let t: string | null = url.searchParams.get('t');
  let fromForm = false;
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    if (form?.get('source') === 'page') {
      fromForm = true;
      id = String(form.get('id') ?? '');
      t = String(form.get('t') ?? '');
    }
  }

  if (!verifyUnsubscribe(id, t)) {
    return NextResponse.json({ success: false, error: 'Invalid or expired unsubscribe link' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('email_subscribers')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('id', id as string)
    .is('unsubscribed_at', null);
  if (error) {
    console.error('[unsubscribe] DB error:', error.message);
    return NextResponse.json({ success: false, error: 'Could not unsubscribe right now' }, { status: 500 });
  }

  if (fromForm) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
    return NextResponse.redirect(`${base.replace(/\/+$/, '')}/unsubscribe?done=1`, 303);
  }
  return NextResponse.json({ success: true });
}
