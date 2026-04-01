import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Implicit flow — tokens come in URL hash, no PKCE code verifier needed.
        // PKCE breaks with magic links when email opens in a different browser
        // context (e.g., Gmail app in-app browser vs main browser).
        flowType: 'implicit',
      },
    }
  );
}
