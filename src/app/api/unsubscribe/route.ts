/**
 * DAI-26: unsubscribe for `email_subscribers` (sets unsubscribed_at; never deletes the row).
 *
 * POST only (a GET from a link scanner must not unsubscribe anyone):
 *  - RFC 8058 one-click: the mail client POSTs `List-Unsubscribe=One-Click` to
 *    /api/unsubscribe?id=..&t=.. -> 200.
 *  - The /unsubscribe page form posts id + t -> 303 back to /unsubscribe?done=1 (or ?error=...).
 * The id/token pair is an HMAC over the row id (see lib/email/unsubscribe-token.ts).
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin, rateLimitGuard } from '@/lib/api-helpers';
import { handleUnsubscribe, parseUnsubscribeRequest, unsubscribeResponse } from '@/lib/email/subscription-actions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const type = request.headers.get('content-type') ?? '';
  const isForm = type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data');
  const form = isForm ? await request.formData().catch(() => null) : null;
  const req = parseUnsubscribeRequest(url, form);

  const result = await handleUnsubscribe(req.id, req.t, async (rowId) => {
    const { error } = await getSupabaseAdmin()
      .from('email_subscribers')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('id', rowId)
      .is('unsubscribed_at', null);
    return { error: error?.message ?? null };
  });

  // Only failed verifications count against the IP: valid one-click POSTs from a mail provider's
  // shared IPs are never throttled (the HMAC token is the gate).
  if (result === 'invalid') {
    const limited = rateLimitGuard(request, 20, 60_000, 'unsubscribe-invalid');
    if (limited) return limited;
  }
  if (result === 'error') console.error('[unsubscribe] DB error');

  const r = unsubscribeResponse(result, req.fromForm);
  if (r.location) return new NextResponse(null, { status: r.status, headers: { Location: r.location } });
  return NextResponse.json(r.json, { status: r.status });
}
