'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

function CallbackHandler() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      const hash = window.location.hash;

      if (!hash || !hash.includes('access_token')) {
        router.replace('/login?error=no_auth_data');
        return;
      }

      // Parse tokens directly from hash — most reliable method
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) {
        router.replace('/login?error=missing_tokens');
        return;
      }

      // Set session on the SSR client (stores in cookies for server-side access)
      const { createClient: createSSRClient } = await import('@/lib/supabase/client');
      const ssrClient = createSSRClient();
      const { error } = await ssrClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setError(error.message);
        setTimeout(() => router.replace(`/login?error=${encodeURIComponent(error.message)}`), 2000);
        return;
      }

      router.replace('/');
    }

    handleCallback();
  }, [router]);

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
