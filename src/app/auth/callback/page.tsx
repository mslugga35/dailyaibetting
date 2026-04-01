'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/';

    async function handleCallback() {
      const supabase = createClient();

      if (code) {
        // PKCE flow: exchange auth code for session (browser has the code_verifier)
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
        console.error('[auth/callback] code exchange failed:', error.message);
        setError(error.message);
        setTimeout(() => router.replace(`/login?error=${encodeURIComponent(error.message)}`), 2000);
        return;
      }

      // Implicit flow fallback: tokens may be in hash fragment
      const hash = window.location.hash;
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

      // No code or hash — redirect to login
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
