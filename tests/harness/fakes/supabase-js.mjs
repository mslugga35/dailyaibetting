/**
 * Replaces @supabase/supabase-js. createClient() returns a client bound to the
 * shared in-memory FakeDb and records WHICH key it was built with, so tests can
 * assert that a public route never runs with the service-role key.
 */
import { harness } from '../state.mjs';

export function keyKind(key) {
  if (key && key === process.env.SUPABASE_SERVICE_ROLE_KEY) return 'service';
  if (key && key === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return 'anon';
  return 'other';
}

const netError = () => ({ name: 'AuthRetryableFetchError', message: 'fetch failed (simulated auth outage)', status: 0 });

export function makeClient(url, key, { sessionUser } = {}) {
  const h = harness();
  const client = { kind: keyKind(key), url };
  h.clients.push({ url, kind: client.kind });

  client.from = (table) => harness().db.from(table, client);
  client.rpc = (name, args) => harness().db.rpc(name, args, client);
  client.auth = {
    async getUser(token) {
      const hh = harness();
      if (hh.authOutage) return { data: { user: null }, error: netError() };
      if (token !== undefined) {
        const user = hh.bearerUsers.get(token) || null;
        return { data: { user }, error: user ? null : { name: 'AuthApiError', message: 'invalid JWT', status: 401 } };
      }
      const user = sessionUser ? sessionUser() : null;
      return { data: { user }, error: user ? null : { name: 'AuthSessionMissingError', message: 'Auth session missing!', status: 400 } };
    },
    async getSession() {
      const user = sessionUser ? sessionUser() : null;
      return { data: { session: user ? { user } : null }, error: null };
    },
    admin: {
      async createUser({ email }) {
        const hh = harness();
        hh.db.log.push({ table: 'auth.users', op: 'createUser', key: client.kind });
        if (client.kind !== 'service') return { data: { user: null }, error: { message: 'not allowed', status: 403 } };
        if (hh.authUsers.some((u) => u.email === email)) {
          return { data: { user: null }, error: { message: 'A user with this email address has already been registered', status: 422 } };
        }
        const user = { id: `user_guest_${hh.authUsers.length + 1}`, email };
        hh.authUsers.push(user);
        return { data: { user }, error: null };
      },
      async generateLink({ email, options }) {
        const hh = harness();
        hh.db.log.push({ table: 'auth.users', op: 'generateLink', key: client.kind });
        if (client.kind !== 'service') return { data: null, error: { message: 'not allowed', status: 403 } };
        // Like GoTrue: an unknown address gets a new, unconfirmed account (type signup); every call
        // issues a NEW token and it replaces the user's previous one (only the newest link works).
        let user = hh.authUsers.find((u) => u.email === email);
        if (!user) { user = { id: `user_link_${hh.authUsers.length + 1}`, email, confirmed: false }; hh.authUsers.push(user); }
        hh.linkSeq = (hh.linkSeq || 0) + 1;
        const hashed = `h${String(user.id).replace(/[^A-Za-z0-9]/g, '')}x${hh.linkSeq}`.padEnd(24, '0');
        user.currentLinkToken = hashed;
        return {
          data: { user, properties: { action_link: `https://auth.supabase.test/verify?token=t_${user.id}&redirect_to=${encodeURIComponent(options?.redirectTo || '')}`, hashed_token: hashed, verification_type: user.confirmed === false ? 'signup' : 'magiclink' } },
          error: null,
        };
      },
    },
  };
  return client;
}

export function createClient(url, key) {
  return makeClient(url, key);
}

export class SupabaseClient {}
