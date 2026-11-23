/**
 * DAI-26: signed unsubscribe links for `email_subscribers`.
 *
 * The link carries the subscriber row id (a random UUID), never the email address, plus an
 * HMAC-SHA256 of that id.
 *
 * Signing key: UNSUBSCRIBE_HMAC_KEY when set (dedicated, so rotating other credentials never
 * breaks links already sent); otherwise a key derived from the server-only Supabase service-role
 * key with a fixed label. Verification accepts BOTH, so introducing the dedicated key later keeps
 * every earlier link working (links must keep working for at least 30 days after sending).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const LABEL = 'dailyai-unsubscribe-v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UnsubscribeSecrets {
  /** UNSUBSCRIBE_HMAC_KEY */
  dedicated?: string;
  /** SUPABASE_SERVICE_ROLE_KEY (a label-derived key is used, never the raw value) */
  derivedFrom?: string;
}

const envSecrets = (): UnsubscribeSecrets => ({
  dedicated: process.env.UNSUBSCRIBE_HMAC_KEY,
  derivedFrom: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

function keys(s: UnsubscribeSecrets): Buffer[] {
  const out: Buffer[] = [];
  if (s.dedicated) out.push(createHmac('sha256', s.dedicated).update(LABEL).digest());
  if (s.derivedFrom) out.push(createHmac('sha256', s.derivedFrom).update(LABEL).digest());
  return out;
}

const mac = (key: Buffer, id: string) => createHmac('sha256', key).update(id.toLowerCase()).digest('base64url');

export function signUnsubscribe(id: string, secrets: UnsubscribeSecrets = envSecrets()): string {
  if (!UUID_RE.test(id)) throw new Error('invalid subscriber id');
  const [key] = keys(secrets);
  if (!key) throw new Error('unsubscribe signing key unavailable');
  return mac(key, id);
}

/** Constant-time check against every configured key. Malformed input is simply invalid. */
export function verifyUnsubscribe(id: unknown, token: unknown, secrets: UnsubscribeSecrets = envSecrets()): boolean {
  if (typeof id !== 'string' || typeof token !== 'string' || !UUID_RE.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return false;
  }
  const got = Buffer.from(token);
  let ok = false;
  for (const key of keys(secrets)) {
    const want = Buffer.from(mac(key, id));
    if (want.length === got.length && timingSafeEqual(want, got)) ok = true;
  }
  return ok;
}

export function unsubscribeUrl(id: string, baseUrl: string, secrets?: UnsubscribeSecrets): string {
  return `${baseUrl.replace(/\/+$/, '')}/unsubscribe?id=${encodeURIComponent(id)}&t=${signUnsubscribe(id, secrets)}`;
}

/** RFC 8058 one-click target (mail clients POST here; no page, no confirmation). */
export function oneClickUrl(id: string, baseUrl: string, secrets?: UnsubscribeSecrets): string {
  return `${baseUrl.replace(/\/+$/, '')}/api/unsubscribe?id=${encodeURIComponent(id)}&t=${signUnsubscribe(id, secrets)}`;
}
