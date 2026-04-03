import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
let _cleanupCounter = 0;

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  if (++_cleanupCounter >= 100) {
    _cleanupCounter = 0;
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 5;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const email: string = body?.email?.trim()?.toLowerCase() ?? '';

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    // Check if already subscribed
    const { data: existing } = await supabaseAdmin
      .from('email_subscribers')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true });
    }

    // New subscriber — save to DB
    const { error } = await supabaseAdmin
      .from('email_subscribers')
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
