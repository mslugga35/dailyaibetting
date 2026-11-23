import { NextResponse, after } from 'next/server';
import { rateLimitGuard, getSupabaseAdmin } from '@/lib/api-helpers';
import { sendWelcomeEmail } from '@/lib/email/welcome';
import { handleSignup, normalizeSignupAddress, WelcomeThrottle } from '@/lib/email/subscription-actions';

// DAI-26: one per process (single Node server): per-mailbox 24 h and global hourly welcome caps.
const welcomeThrottle = new WelcomeThrottle();

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const limited = rateLimitGuard(request, 5, 60_000, 'subscribe');
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    const email = normalizeSignupAddress(body?.email);

    if (!email) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Insert-or-ignore on the unique email. PostgREST returns the row ONLY when this request
    // created it (ON CONFLICT DO NOTHING RETURNING; maybeSingle turns "no row" into null, not an
    // error), so that is the single source of "new subscriber". Rules: handleSignup (tested).
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
      sendWelcome: (sub) => sendWelcomeEmail(sub),
      // After the response: new and existing addresses answer equally fast (no enumeration).
      defer: (task) => after(task),
      throttle: welcomeThrottle,
      log: (m) => console.error(m),
    });

    if (result === 'error') {
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[subscribe] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
