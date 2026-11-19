/**
 * Email sign-in / sign-up links sent by DailyAI itself.
 *
 * Why: Supabase Auth's own mailer reports "sent" for magic links but they never
 * arrive (2026-11-18/19), and its limit is 5 auth emails an hour shared by every
 * app on the project. The same Resend sender works when DailyAI sends directly.
 * So DailyAI generates the link with the service role (no Supabase email) and
 * delivers it through Resend. Opening the link still proves the visitor owns the
 * address: a new account stays unconfirmed until the link is used.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { safeNext } from '@/lib/auth/safe-next';

const SITE = 'https://dailyaibetting.com';

/** Lowercased, trimmed address, or null when it is not a plausible email. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const e = raw.trim().toLowerCase();
  if (e.length < 6 || e.length > 254) return null;
  if (!/^[^\s@<>()",;:\\[\]]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(e)) return null;
  return e;
}

/** Where the link lands: always our own /auth/callback, with a same-site `next` only. */
export function callbackUrl(next: unknown): string {
  const path = safeNext(typeof next === 'string' ? next : null);
  return `${SITE}/auth/callback${path !== '/' ? `?next=${encodeURIComponent(path)}` : ''}`;
}

/**
 * Creates the account if the address is new (unconfirmed until the link is opened)
 * and returns the one-time link. `isNew` only picks the email wording; it is never
 * returned to the visitor (no account enumeration).
 */
export async function generateEmailLink(
  admin: SupabaseClient,
  email: string,
  next: unknown,
): Promise<{ actionLink: string; isNew: boolean }> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: callbackUrl(next) },
  });
  const actionLink = data?.properties?.action_link;
  if (error || !actionLink || !actionLink.startsWith('https://')) {
    throw new Error(`generateLink failed: ${error?.message ?? 'no link'}`);
  }
  return { actionLink, isNew: data.properties.verification_type === 'signup' };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Subject + HTML + text for the link email. */
export function linkEmailContent(actionLink: string, isNew: boolean) {
  const subject = isNew ? 'Confirm your email to finish creating your DailyAI account' : 'Your DailyAI sign-in link';
  const lead = isNew
    ? 'Click below to confirm your email and finish creating your free DailyAI Betting account.'
    : 'Click below to sign in to DailyAI Betting.';
  const button = isNew ? 'Confirm email and sign in' : 'Sign in';
  const foot = 'The link works once and expires in 24 hours. If you did not ask for it, ignore this email: nothing happens without the click.';
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
<p>${lead}</p>
<p><a href="${esc(actionLink)}" style="display:inline-block;background:#047857;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${button}</a></p>
<p style="color:#666;font-size:13px">${foot}</p></div>`;
  return { subject, html, text: `${lead}\n\n${actionLink}\n\n${foot}` };
}

/** Sends through Resend's REST API. Throws on any non-2xx (the route turns it into a generic 502). */
export async function sendLinkEmail(email: string, actionLink: string, isNew: boolean): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error('RESEND_API_KEY / EMAIL_FROM not set');
  const { subject, html, text } = linkEmailContent(actionLink, isNew);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `DailyAI Betting <${from}>`, to: [email], subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
}
