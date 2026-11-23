/**
 * DAI-26: the decisions behind /api/subscribe and /api/unsubscribe, with the database, the mail
 * sender and the scheduler injected so the rules are tested as behaviour, not as source text.
 */
import { verifyUnsubscribe } from './unsubscribe-token';

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200);

// ── Address rules ───────────────────────────────────────────────────────────

/**
 * Strict enough that the stored value is a plain mailbox: no display names, angle brackets,
 * quotes, commas or spaces (so `a<victim@x.com>` can never reach Resend as a different "new"
 * address for the same person). RFC length limits: 64 local, 254 total.
 */
const ADDRESS_RE = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9_%+-])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export function normalizeSignupAddress(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || email.includes('..') || !ADDRESS_RE.test(email)) return null;
  return email;
}

/** One mailbox, however it is spelled: drops +tags, and dots for Gmail. Used only for send caps. */
export function canonicalMailbox(email: string): string {
  const at = email.lastIndexOf('@');
  let local = email.slice(0, at).split('+')[0];
  let domain = email.slice(at + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

/**
 * In-process send caps (single Node server): at most one welcome per mailbox per 24 h however
 * the address is varied, and a global hourly ceiling so a botnet cannot turn the form into a
 * mailer. Over a cap, the signup is still saved; only the email is skipped.
 */
export class WelcomeThrottle {
  private perMailbox = new Map<string, number>();
  private recent: number[] = [];
  constructor(
    private readonly maxPerHour = 60,
    private readonly mailboxWindowMs = 24 * 60 * 60 * 1000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  allow(email: string): boolean {
    const t = this.now();
    this.recent = this.recent.filter((x) => t - x < 60 * 60 * 1000);
    if (this.perMailbox.size > 10_000) {
      for (const [k, v] of this.perMailbox) if (t - v >= this.mailboxWindowMs) this.perMailbox.delete(k);
    }
    const key = canonicalMailbox(email);
    const last = this.perMailbox.get(key);
    if (last !== undefined && t - last < this.mailboxWindowMs) return false;
    if (this.recent.length >= this.maxPerHour) return false;
    this.perMailbox.set(key, t);
    this.recent.push(t);
    return true;
  }
}

// ── Signup ──────────────────────────────────────────────────────────────────

export interface SignupDeps {
  /** Insert-or-ignore on the unique email; returns the row id ONLY if this call created the row. */
  insertIfNew(email: string): Promise<{ id: string | null; error: string | null }>;
  sendWelcome(sub: { id: string; email: string }): Promise<void>;
  /** Runs work after the response is sent (so timing does not reveal new vs existing). */
  defer(task: () => Promise<void>): void;
  throttle: { allow(email: string): boolean };
  log(message: string): void;
}

export type SignupResult = 'created' | 'existing' | 'error';

/**
 * New row: one welcome email, sent after the response, never retried (cannot duplicate), and a
 * failure is logged without the address. Existing address: nothing changes and nothing is sent;
 * in particular an earlier unsubscribe is NOT undone by someone typing the address again.
 */
export async function handleSignup(email: string, deps: SignupDeps): Promise<SignupResult> {
  const ins = await deps.insertIfNew(email);
  if (ins.error) {
    deps.log(`[subscribe] DB error: ${ins.error}`);
    return 'error';
  }
  if (!ins.id) return 'existing';
  if (!deps.throttle.allow(email)) {
    deps.log('[subscribe] welcome email skipped: send cap reached');
    return 'created';
  }
  const sub = { id: ins.id, email };
  deps.defer(async () => {
    try {
      await deps.sendWelcome(sub);
    } catch (e) {
      deps.log(`[subscribe] welcome email not sent: ${errText(e)}`);
    }
  });
  return 'created';
}

// ── Unsubscribe ─────────────────────────────────────────────────────────────

export interface UnsubscribeRequest { id: string | null; t: string | null; fromForm: boolean }

/**
 * id/t come from the query (RFC 8058 one-click: the client POSTs `List-Unsubscribe=One-Click`
 * to the URL from the header). Only the site's own form (source=page) supplies them in the body.
 */
export function parseUnsubscribeRequest(url: URL, form: FormData | null): UnsubscribeRequest {
  if (form && form.get('source') === 'page') {
    const id = form.get('id');
    const t = form.get('t');
    return { id: typeof id === 'string' ? id : null, t: typeof t === 'string' ? t : null, fromForm: true };
  }
  return { id: url.searchParams.get('id'), t: url.searchParams.get('t'), fromForm: false };
}

export type UnsubscribeResult = 'invalid' | 'ok' | 'error';

/** Writes nothing unless the signed token matches the row id. */
export async function handleUnsubscribe(
  id: unknown,
  token: unknown,
  markUnsubscribed: (id: string) => Promise<{ error: string | null }>,
  secrets?: { dedicated?: string; derivedFrom?: string },
): Promise<UnsubscribeResult> {
  const ok = secrets === undefined ? verifyUnsubscribe(id, token) : verifyUnsubscribe(id, token, secrets);
  if (!ok) return 'invalid';
  const { error } = await markUnsubscribed(id as string);
  return error ? 'error' : 'ok';
}

/** Form posts always land back on the page (never a JSON blob); one-click gets JSON. */
export function unsubscribeResponse(result: UnsubscribeResult, fromForm: boolean):
  { status: number; location?: string; json?: { success: boolean; error?: string } } {
  if (fromForm) {
    return { status: 303, location: result === 'ok' ? '/unsubscribe?done=1' : `/unsubscribe?error=${result}` };
  }
  if (result === 'ok') return { status: 200, json: { success: true } };
  if (result === 'invalid') return { status: 400, json: { success: false, error: 'Invalid unsubscribe link' } };
  return { status: 500, json: { success: false, error: 'Could not unsubscribe right now' } };
}
