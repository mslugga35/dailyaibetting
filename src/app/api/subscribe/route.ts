import { NextResponse } from 'next/server';
import { isRateLimited, isValidEmail, getClientIp, getSupabaseAdmin } from '@/lib/api-helpers';

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

async function triggerWelcomeEmail(email: string) {
  const webhookUrl = process.env.N8N_WELCOME_EMAIL_WEBHOOK;
  if (!webhookUrl) return;

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      site: 'dailyaibetting',
      siteName: 'DailyAI Betting',
      ctaUrl: 'https://dailyaibetting.com/consensus',
      ctaText: 'View Today\'s Consensus',
    }),
  });

  if (!res.ok) {
    console.error('[subscribe] n8n welcome email error:', res.status);
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const email: string = body?.email?.trim()?.toLowerCase() ?? '';

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Check if already subscribed
    const { data: existing } = await db
      .from('email_subscribers')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true });
    }

    // New subscriber — save to DB
    const { error } = await (db.from('email_subscribers') as any)
      .insert({ email, site: 'dailyaibetting', source: 'banner' });

    if (error) {
      console.error('[subscribe] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    // New subscriber: log to sheet + trigger welcome email via n8n
    Promise.allSettled([
      appendToGoogleSheet(email),
      triggerWelcomeEmail(email),
    ]).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[subscribe] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
