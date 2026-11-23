import { NextResponse } from 'next/server';
import { isRateLimited, isValidEmail, getClientIp, getSupabaseAdmin } from '@/lib/api-helpers';
import { sendWelcomeEmail } from '@/lib/email/welcome';

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200);

export const dynamic = 'force-dynamic';

async function appendToGoogleSheet(email: string) {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK;
  if (!webhookUrl) return;

  // Apps Script returns a 302 redirect — must follow it manually for POST
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      email,
      date: new Date().toISOString(),
      source: 'dailyaibetting',
    }),
    redirect: 'follow',
  });

  if (!res.ok && res.status !== 302) {
    console.error('[subscribe] Sheet webhook error:', res.status);
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
    }

    const body = await request.json().catch(() => null);
    const email: string = body?.email?.trim()?.toLowerCase() ?? '';

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Insert-or-ignore on the unique email. PostgREST returns the row ONLY when this request
    // created it, so `inserted` is the single source of "new subscriber" (no timing guess, and a
    // repeat signup no longer errors: maybeSingle, not single).
    const { data: inserted, error } = await db.from('email_subscribers')
      .upsert(
        { email, site: 'dailyaibetting', source: 'banner' },
        { onConflict: 'email', ignoreDuplicates: true }
      )
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[subscribe] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    if (inserted?.id) {
      // DAI-26: one transactional welcome email per new row. A send failure is logged (no address
      // in the log) and never undoes the signup; it is not retried, so it can never duplicate.
      try {
        await sendWelcomeEmail({ id: inserted.id, email });
      } catch (e) {
        console.error(`[subscribe] welcome email not sent: ${errText(e)}`);
      }
      appendToGoogleSheet(email).catch((e) => console.error(`[subscribe] Sheet webhook failed: ${errText(e)}`));
    } else {
      // Existing address: signing up again re-subscribes after an earlier unsubscribe.
      // No second welcome email. The response is the same either way (no address probing).
      const { error: upErr } = await db.from('email_subscribers')
        .update({ unsubscribed_at: null })
        .eq('email', email)
        .not('unsubscribed_at', 'is', null);
      if (upErr) console.error('[subscribe] re-subscribe error:', upErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[subscribe] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
