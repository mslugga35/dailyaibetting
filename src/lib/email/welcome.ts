/**
 * DAI-26: the one transactional welcome email sent to a NEW email-list signup.
 *
 * - Sent from the DailyAI sending identity (EMAIL_FROM on dailyaibetting.com via Resend), never a
 *   personal mailbox.
 * - One per subscriber row: the caller only sends when the insert created the row, and the Resend
 *   Idempotency-Key (`dailyai-welcome-<row id>`) makes a repeated request a no-op for 24 h.
 *   Per-mailbox and hourly send caps live in WelcomeThrottle (subscription-actions.ts).
 * - Carries a signed unsubscribe link plus RFC 8058 one-click headers.
 * - Confirms the signup only: no promotions, and no promise of daily email (the newsletter is off).
 */
import { oneClickUrl, unsubscribeUrl, type UnsubscribeSecrets } from './unsubscribe-token';

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface WelcomeContent { subject: string; html: string; text: string }

export function welcomeEmailContent(siteUrl: string, unsubUrl: string): WelcomeContent {
  const site = siteUrl.replace(/\/+$/, '');
  const subject = "You're on the DailyAI Betting email list";
  const lead = "Thanks for joining the DailyAI Betting email list. This email confirms your signup.";
  const body = "Daily picks by email haven't launched yet, so you won't get daily emails from us. "
    + "We'll only write if that changes. Today's free consensus picks are always on the site.";
  const foot = "You're receiving this because this address was entered in the signup box on dailyaibetting.com. "
    + "If that wasn't you, or you'd rather not hear from us, unsubscribe here:";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">
<p>${lead}</p><p>${body}</p>
<p><a href="${escAttr(`${site}/consensus`)}">See today's free consensus picks</a></p>
<p style="color:#666;font-size:13px">${foot} <a href="${escAttr(unsubUrl)}">Unsubscribe</a>.</p></div>`;
  const text = `${lead}\n\n${body}\n\nToday's free consensus picks: ${site}/consensus\n\n${foot}\n${unsubUrl}\n`;
  return { subject, html, text };
}

export interface WelcomeOptions {
  siteUrl?: string;
  fetchImpl?: typeof fetch;
  apiKey?: string;
  from?: string;
  signingSecrets?: UnsubscribeSecrets;
}

/** Throws on a missing config or any non-2xx from Resend (the caller logs it; the signup still stands). */
export async function sendWelcomeEmail(sub: { id: string; email: string }, opts: WelcomeOptions = {}): Promise<void> {
  const key = opts.apiKey ?? process.env.RESEND_API_KEY;
  const from = opts.from ?? process.env.EMAIL_FROM;
  if (!key || !from) throw new Error('RESEND_API_KEY / EMAIL_FROM not set');
  const siteUrl = opts.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dailyaibetting.com';
  const unsub = unsubscribeUrl(sub.id, siteUrl, opts.signingSecrets);
  const oneClick = oneClickUrl(sub.id, siteUrl, opts.signingSecrets);
  const { subject, html, text } = welcomeEmailContent(siteUrl, unsub);
  const res = await (opts.fetchImpl ?? fetch)('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `dailyai-welcome-${sub.id}`,
    },
    body: JSON.stringify({
      from: from.includes('<') ? from : `DailyAI Betting <${from}>`,
      to: [sub.email],
      subject,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${oneClick}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    throw new Error(`Resend ${res.status}`);
  }
}
