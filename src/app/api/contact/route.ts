import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  return entry.count > 10;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendContactEmail(
  name: string,
  email: string,
  message: string
): Promise<boolean> {
  const webhookUrl = process.env.N8N_CONTACT_EMAIL_WEBHOOK;
  if (!webhookUrl) {
    console.warn('[contact] No N8N_CONTACT_EMAIL_WEBHOOK configured');
    return false;
  }

  try {
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

    return res.ok;
  } catch (err) {
    console.error('[contact] Email send error:', err);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const name: string = body?.name?.trim() ?? '';
    const email: string = body?.email?.trim()?.toLowerCase() ?? '';
    const message: string = body?.message?.trim() ?? '';

    // Validation
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Save contact message to database
    const { error: dbError } = await supabaseAdmin
      .from('contact_messages')
      .insert({
        name,
        email,
        message,
        site: 'dailyaibetting',
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('[contact] DB error:', dbError.message);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    // Send email notification (non-blocking)
    Promise.resolve(sendContactEmail(name, email, message)).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
