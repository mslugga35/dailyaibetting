/**
 * DAI-26: the decisions behind /api/subscribe and /api/unsubscribe, with the database and the
 * mail sender injected so the rules are tested as behaviour, not as source text.
 */
import { verifyUnsubscribe } from './unsubscribe-token';

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200);

export interface SignupDeps {
  /** Insert-or-ignore on the unique email; returns the row id ONLY if this call created the row. */
  insertIfNew(email: string): Promise<{ id: string | null; error: string | null }>;
  /** Clears an earlier unsubscribe for an existing address. */
  resubscribe(email: string): Promise<{ error: string | null }>;
  sendWelcome(sub: { id: string; email: string }): Promise<void>;
  log(message: string): void;
}

export type SignupResult = 'created' | 'existing' | 'error';

/**
 * New address: one welcome email (a failure is logged without the address and never retried,
 * so it cannot duplicate). Existing address: re-subscribe, no email.
 */
export async function handleSignup(email: string, deps: SignupDeps): Promise<SignupResult> {
  const ins = await deps.insertIfNew(email);
  if (ins.error) {
    deps.log(`[subscribe] DB error: ${ins.error}`);
    return 'error';
  }
  if (ins.id) {
    try {
      await deps.sendWelcome({ id: ins.id, email });
    } catch (e) {
      deps.log(`[subscribe] welcome email not sent: ${errText(e)}`);
    }
    return 'created';
  }
  const re = await deps.resubscribe(email);
  if (re.error) deps.log(`[subscribe] re-subscribe error: ${re.error}`);
  return 'existing';
}

export type UnsubscribeResult = 'invalid' | 'ok' | 'error';

/** Writes nothing unless the signed token matches the row id. */
export async function handleUnsubscribe(
  id: unknown,
  token: unknown,
  markUnsubscribed: (id: string) => Promise<{ error: string | null }>,
  secret?: string,
): Promise<UnsubscribeResult> {
  const ok = secret === undefined ? verifyUnsubscribe(id, token) : verifyUnsubscribe(id, token, secret);
  if (!ok) return 'invalid';
  const { error } = await markUnsubscribed(id as string);
  return error ? 'error' : 'ok';
}
