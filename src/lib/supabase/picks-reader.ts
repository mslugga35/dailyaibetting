/**
 * Server-only Supabase client for reading HiddenBag's hb_picks.
 *
 * HiddenBag is closing its paywall at the database: once that ships, the anon
 * key can read only GRADED picks, and today's (still pending) picks are visible
 * only to an entitled member's session. This site reads today's picks for the
 * daily AI report, so it signs in as its OWN account, a dedicated HiddenBag
 * user flagged `is_comped`, instead of borrowing the service-role key.
 *
 * Blast radius if HB_READER_* leaks: whatever a paying member can read
 * (picks + Discord messages). No writes, no other tables. Revoke by clearing
 * is_comped or banning that one user. The service-role key, by contrast, reads
 * and writes every table of every app on the shared project.
 *
 * Without HB_READER_EMAIL / HB_READER_PASSWORD it falls back to the anon key,
 * which is today's behaviour, so this can deploy before the paywall does.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Env = Record<string, string | undefined>;
type Factory = (url: string, key: string, options: object) => SupabaseClient;

interface Deps {
  env?: Env;
  create?: Factory;
  now?: () => number;
  warn?: (msg: string) => void;
}

const CLIENT_OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
/** Re-sign-in when the access token has less than this left. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

let cached: { client: SupabaseClient; expiresAt: number } | null = null;
let warned = false;

export async function createPicksReaderClient(deps: Deps = {}): Promise<SupabaseClient> {
  if (typeof window !== 'undefined') throw new Error('picks reader is server-only');
  const env = deps.env ?? process.env;
  const create = deps.create ?? (createClient as unknown as Factory);
  const now = deps.now ?? Date.now;

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set');

  const email = env.HB_READER_EMAIL;
  const password = env.HB_READER_PASSWORD;
  if (!email || !password) {
    if (!warned) {
      warned = true;
      (deps.warn ?? console.warn)(
        '[picks-reader] HB_READER_EMAIL / HB_READER_PASSWORD not set: reading hb_picks as anon. ' +
          "Today's pending picks disappear once HiddenBag's paywall RLS ships.",
      );
    }
    return create(url, anonKey, CLIENT_OPTIONS);
  }

  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > now()) return cached.client;

  const client = create(url, anonKey, CLIENT_OPTIONS);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data?.session) {
    cached = null;
    // Never include the password or token in the message.
    throw new Error(`picks reader sign-in failed: ${error?.message ?? 'no session returned'}`);
  }
  cached = { client, expiresAt: (data.session.expires_at ?? 0) * 1000 };
  return client;
}

/** Test hook. */
export function resetPicksReaderForTests(): void {
  cached = null;
  warned = false;
}
