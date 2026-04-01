'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const rawNext = searchParams.get('next') || '/';
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

    async function handleCallback() {
      // Use standard client (not @supabase/ssr) — matches the login page.
      // @supabase/ssr forces PKCE and can't parse implicit flow hash tokens.
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { flowType: 'implicit', detectSessionInUrl: true } }
      );

      // Implicit flow: Supabase auto-detects #access_token in URL on init.
      // Give it a moment to process, then check for session.
      const { data, error } = await supabase.auth.getSession();

      if (data?.session) {
        // Session established — persist via the SSR client cookie mechanism
        const { createClient: createSSR } = await import('@/lib/supabase/client');
        const ssrClient = createSSR();
        await ssrClient.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        router.replace(next);
        return;
      }

      // Fallback: try PKCE code exchange
      const code = searchParams.get('code');
      if (code) {
        const { createClient: createSSR } = await import('@/lib/supabase/client');
        const ssrClient = createSSR();
        const { error: codeError } = await ssrClient.auth.exchangeCodeForSession(code);
        if (!codeError) {
          router.replace(next);
          return;
        }
        setError(codeError.message);
        setTimeout(() => router.replace(`/login?error=${encodeURIComponent(codeError.message)}`), 2000);
        return;
      }

      // Nothing worked
      const msg = error?.message || 'session_failed';
      setError(msg);
      setTimeout(() => router.replace(`/login?error=${encodeURIComponent(msg)}`), 2000);
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <p className="text-red-400">{error}</p>
            <p className="text-sm text-muted-foreground">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Signing you in...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
