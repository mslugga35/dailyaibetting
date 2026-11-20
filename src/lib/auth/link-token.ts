// Shared by the server (email-link.ts, when building the link) and the browser
// (/auth/confirm, before spending it), so both sides accept exactly the same links.

/** Verification types a DailyAI email link may carry (anything else is refused). */
export const LINK_TYPES: ReadonlySet<string> = new Set(['magiclink', 'signup']);

/** Shape of a Supabase hashed_token: URL-safe, at least 16 characters. */
export const TOKEN_HASH_RE = /^[A-Za-z0-9_-]{16,}$/;

/** True when the token and type are something verifyOtp could accept. */
export const isLinkToken = (tokenHash: unknown, type: unknown): boolean =>
  typeof tokenHash === 'string' && TOKEN_HASH_RE.test(tokenHash) && typeof type === 'string' && LINK_TYPES.has(type);
