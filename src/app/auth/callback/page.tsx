'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    // Sanitize redirect — only allow relative paths (prevent open redirect)
    const rawNext = searchParams.get('next') || '/';
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

    async function handleCallback() {
      const supabase = createClient();
      const hash = window.location.hash;

      // Implicit flow: tokens arrive in URL hash fragment
      if (hash && hash.includes('access_token')) {
        const { data, error } = await supabase.auth.getSession();
        if (data?.session) {
          router.replace(next);
          return;
        }
        setError(error?.message || 'Session failed');
        setTimeout(() => router.replace('/login?error=session_failed'), 2000);
        return;
      }

      // PKCE fallback: code arrives as query param
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
        setError(error.message);
        setTimeout(() => router.replace(`/login?error=${encodeURIComponent(error.message)}`), 2000);
        return;
      }

      // Hash error from Supabase
      if (hash && hash.includes('error')) {
        const params = new URLSearchParams(hash.substring(1));
        const errDesc = params.get('error_description') || 'Authentication failed';
        router.replace(`/login?error=${encodeURIComponent(errDesc)}`);
        return;
      }

      // Nothing to process
      router.replace('/login?error=no_auth_data');
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
