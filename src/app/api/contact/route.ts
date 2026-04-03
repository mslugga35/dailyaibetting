import { NextResponse } from 'next/server';
import { isRateLimited, isValidEmail, getClientIp, getSupabaseAdmin } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

async function sendContactNotification(name: string, email: string, message: string) {
  const webhookUrl = process.env.N8N_CONTACT_EMAIL_WEBHOOK;
  if (!webhookUrl) return;

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      message,
      site: 'dailyaibetting',
      timestamp: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    console.error('[contact] Notification webhook error:', res.status);
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip, 10)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const name: string = body?.name?.trim() ?? '';
    const email: string = body?.email?.trim()?.toLowerCase() ?? '';
    const message: string = body?.message?.trim() ?? '';

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { error: dbError } = await (db.from('contact_messages') as any)
      .insert({ name, email, message, site: 'dailyaibetting' });

    if (dbError) {
      console.error('[contact] DB error:', dbError.message);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // Send notification (non-blocking)
    sendContactNotification(name, email, message).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
