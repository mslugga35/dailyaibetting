/**
 * Shared, resettable state behind every fake. One instance per test process
 * (node --test runs each file in its own process).
 */
import { FakeDb } from './fake-db.mjs';
import { FakeStripeState } from './fake-stripe-state.mjs';

const KEY = Symbol.for('dailyai.test.harness');

function fresh() {
  return {
    db: new FakeDb(),
    stripe: new FakeStripeState(),
    /** token -> user, for `Authorization: Bearer <token>` (supabase.auth.getUser(token)). */
    bearerUsers: new Map(),
    /** user behind the Supabase session cookie (createServerSupabaseClient), or null. */
    cookieUser: null,
    /** every createClient() call: { url, key, kind } — kind = service | anon | other. */
    clients: [],
    /** outbound fetch attempts: { url, method, allowed }. */
    fetches: [],
    /** url-prefix -> handler(url, init) for the few outbound calls a test permits. */
    fetchRoutes: new Map(),
    /** Supabase auth users (auth.admin.createUser / generateLink). */
    authUsers: [],
    /** when true, every auth.getUser() fails like a network error. */
    authOutage: false,
    /** calls into redirected engine modules: { name, args }. */
    moduleCalls: [],
  };
}

export function harness() {
  if (!globalThis[KEY]) globalThis[KEY] = fresh();
  return globalThis[KEY];
}

/** Reset everything between tests. Env is restored by setTestEnv(). */
export function resetHarness() {
  globalThis[KEY] = fresh();
  return globalThis[KEY];
}
