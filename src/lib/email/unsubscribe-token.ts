/**
 * DAI-26: signed unsubscribe links for `email_subscribers`.
 *
 * The link carries the subscriber row id (a random UUID), never the email address, plus an
 * HMAC-SHA256 of that id. The HMAC key is derived from the server-only Supabase service-role
 * key with a fixed label, so no new secret has to be configured. If that key is rotated, old
 * links stop verifying (the page then says to reply to the email instead).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const LABEL = 'dailyai-unsubscribe-v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function keyFrom(secret: string | undefined): Buffer {
  if (!secret) throw new Error('unsubscribe signing key unavailable');
  return createHmac('sha256', secret).update(LABEL).digest();
}

export function signUnsubscribe(id: string, secret = process.env.SUPABASE_SERVICE_ROLE_KEY): string {
  if (!UUID_RE.test(id)) throw new Error('invalid subscriber id');
  return createHmac('sha256', keyFrom(secret)).update(id.toLowerCase()).digest('base64url');
}

/** Constant-time check. Any malformed input is simply invalid (never throws). */
export function verifyUnsubscribe(id: unknown, token: unknown, secret = process.env.SUPABASE_SERVICE_ROLE_KEY): boolean {
  if (typeof id !== 'string' || typeof token !== 'string' || !UUID_RE.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return false;
  }
  try {
    const want = Buffer.from(signUnsubscribe(id, secret));
    const got = Buffer.from(token);
    return want.length === got.length && timingSafeEqual(want, got);
  } catch {
    return false;
  }
}

export function unsubscribeUrl(id: string, baseUrl: string, secret?: string): string {
  const t = signUnsubscribe(id, secret);
  return `${baseUrl.replace(/\/+$/, '')}/unsubscribe?id=${encodeURIComponent(id)}&t=${t}`;
}

/** RFC 8058 one-click target (mail clients POST here; no page, no confirmation). */
export function oneClickUrl(id: string, baseUrl: string, secret?: string): string {
  const t = signUnsubscribe(id, secret);
  return `${baseUrl.replace(/\/+$/, '')}/api/unsubscribe?id=${encodeURIComponent(id)}&t=${t}`;
}
