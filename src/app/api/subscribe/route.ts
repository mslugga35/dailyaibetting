import { NextResponse } from 'next/server';
import { isRateLimited, isValidEmail, getClientIp, getSupabaseAdmin } from '@/lib/api-helpers';
import { sendWelcomeEmail } from '@/lib/email/welcome';
import { handleSignup } from '@/lib/email/subscription-actions';

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
    // created it, so that is the single source of "new subscriber" (maybeSingle: a repeat
    // signup returns no row instead of an error). The rules live in handleSignup (tested).
    const result = await handleSignup(email, {
      async insertIfNew(addr) {
        const { data, error } = await db.from('email_subscribers')
          .upsert(
            { email: addr, site: 'dailyaibetting', source: 'banner' },
            { onConflict: 'email', ignoreDuplicates: true }
          )
          .select('id')
          .maybeSingle();
        return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
      },
      async resubscribe(addr) {
        const { error } = await db.from('email_subscribers')
          .update({ unsubscribed_at: null })
          .eq('email', addr)
          .not('unsubscribed_at', 'is', null);
        return { error: error?.message ?? null };
      },
      sendWelcome: (sub) => sendWelcomeEmail(sub),
      log: (m) => console.error(m),
    });

    if (result === 'error') {
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }
    if (result === 'created') {
      appendToGoogleSheet(email).catch((e) => console.error(`[subscribe] Sheet webhook failed: ${errText(e)}`));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[subscribe] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
