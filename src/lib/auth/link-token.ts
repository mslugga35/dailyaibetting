// Shared by the server (email-link.ts, when building the link) and the browser
// (/auth/confirm, before spending it), so both sides accept exactly the same links.

/** Verification types a DailyAI email link may carry (anything else is refused). */
export const LINK_TYPES: ReadonlySet<string> = new Set(['magiclink', 'signup']);

/** Shape of a Supabase hashed_token: URL-safe, at least 16 characters. */
export const TOKEN_HASH_RE = /^[A-Za-z0-9_-]{16,}$/;

/** True when the token and type are something verifyOtp could accept. */
export const isLinkToken = (tokenHash: unknown, type: unknown): boolean =>
  typeof tokenHash === 'string' && TOKEN_HASH_RE.test(tokenHash) && typeof type === 'string' && LINK_TYPES.has(type);

/** "10:50 AM ET": when a link was issued, in the site's time zone (plain spaces on every ICU build). */
export function sentLabel(at: Date): string {
  return `${at.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).replace(/\s/g, ' ')} ET`;
}

/**
 * The issue time carried in the link (`sent`, epoch seconds), or null if absent or implausible.
 * Display only: it never affects whether the link is accepted (Supabase decides that).
 */
export function parseSent(raw: unknown, now = Date.now()): Date | null {
  const s = Number(raw);
  if (!Number.isInteger(s) || s <= 1_700_000_000 || s * 1000 > now + 5 * 60_000) return null;
  return new Date(s * 1000);
}

/**
 * How a failed verifyOtp should be explained. Supabase answers 403 (`otp_expired`) when the
 * token is spent, superseded or older than 24 h; anything else (network, 5xx, 429) says
 * nothing about the link, so it must not be reported as "no longer works".
 */
export function classifyVerifyError(err: unknown): 'rejected' | 'unreachable' {
  const e = (err ?? {}) as { status?: number; code?: string };
  return e.status === 403 || e.code === 'otp_expired' || e.status === 400 || e.status === 422 ? 'rejected' : 'unreachable';
}

/**
 * One link per address per `ms`. Only the newest link works (each new one cancels the last),
 * so a double click or a quick "send again" would cancel a link whose email is still on the
 * way, and two emails sent close together can arrive in either order. claim() is synchronous,
 * so overlapping requests in one Node process cannot both pass.
 */
export function createLinkCooldown(ms: number) {
  const until = new Map<string, { t: number; owner: symbol }>();
  return {
    /** A ticket when the slot was free (keep it to release), or null while it is taken. */
    claim(key: string, now = Date.now()): symbol | null {
      if (until.size > 5000) for (const [k, v] of until) if (v.t <= now) until.delete(k);
      const cur = until.get(key);
      if (cur && cur.t > now) return null;
      const owner = Symbol('link-slot');
      until.set(key, { t: now + ms, owner });
      return owner;
    },
    /**
     * Give the slot back when nothing reached the inbox (generate or send failed). Only the request
     * that holds the slot can free it: a slow request that failed after the minute is over must not
     * free a newer request's slot.
     */
    release(key: string, owner: symbol | null) { if (owner && until.get(key)?.owner === owner) until.delete(key); },
  };
}
