import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client for server-only jobs (crons) that write tables whose RLS
 * allows writes by service_role only (ai_picks, daily_ai_report). A cron has no
 * user cookies, so the cookie/anon client cannot write there. Never import this
 * from client components.
 */
let client: SupabaseClient | null = null;

export function getServiceRoleClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Service-role Supabase client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}
