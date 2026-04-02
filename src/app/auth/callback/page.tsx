'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      const hash = window.location.hash;

      if (!hash || !hash.includes('access_token')) {
        router.replace('/login?error=no_auth_data');
        return;
      }

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      // Clear tokens from browser history to prevent leakage
      window.history.replaceState(null, '', window.location.pathname);

      if (!accessToken || !refreshToken) {
        router.replace('/login?error=missing_tokens');
        return;
      }

      const { createClient: createSSRClient } = await import('@/lib/supabase/client');
      const ssrClient = createSSRClient();
      const { error: authError } = await ssrClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (authError) {
        setError(authError.message);
        setTimeout(() => router.replace(`/login?error=${encodeURIComponent(authError.message)}`), 2000);
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
