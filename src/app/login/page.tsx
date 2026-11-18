'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Mail, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { safeNext } from '@/lib/auth/safe-next';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const searchParams = useSearchParams();
  // Shown only once the Google provider is configured in Supabase (build-time flag).
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === 'true';

  useEffect(() => {
    const callbackError = searchParams.get('error');
    if (callbackError) {
      setError(callbackError === 'auth' ? 'Sign-in failed. Please try again.' : callbackError);
    }
  }, [searchParams]);

  // Use standard client (not @supabase/ssr) so flowType: 'implicit' is respected.
  // @supabase/ssr forces PKCE which breaks magic links opened in different browser contexts.
  // /auth/callback reads the #access_token fragment for both email links and Google.
  const authClient = () =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: 'implicit' } }
    );
  // ?redirect=/admin/grading (or /account) comes back after sign-in; same-site paths only.
  const next = safeNext(searchParams.get('redirect'));
  const callbackUrl = () =>
    `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    const { error } = await authClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl() },
    });
    // On success the browser is already navigating to Google; only errors return here.
    if (error) {
      setGoogleLoading(false);
      setError(error.message);
    }
  };

  // Password sign-in for accounts that have a password set (no sign-up here: an unknown
  // email or wrong password gets the same generic error). Uses the cookie-backed client so
  // the server sees the session immediately.
  const handlePassword = async () => {
    const { createClient: createSSRClient } = await import('@/lib/supabase/client');
    const { error } = await createSSRClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Email or password is incorrect.');
      return;
    }
    window.location.href = next;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (usePassword) {
      await handlePassword();
      return;
    }

    const supabase = authClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl(),
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="container px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md border-border/50">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 mx-auto mb-4">
              <Brain className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold">Welcome to DailyAI Betting</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Sign in to access your Pro subscription and picks
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mx-auto">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <strong className="text-foreground">{email}</strong>
              </p>
              <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
                <p>The link will expire in 1 hour.</p>
                <p>Check your spam folder if you don&apos;t see it.</p>
              </div>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-primary hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {googleEnabled && (
                <>
                  <Button
                    type="button"
                    onClick={handleGoogle}
                    disabled={googleLoading || loading}
                    className="w-full bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 py-3 h-auto"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    or use email
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {usePassword && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 h-auto"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {usePassword ? 'Signing in...' : 'Sending...'}
                  </>
                ) : usePassword ? (
                  'Sign in'
                ) : (
                  'Continue with Email'
                )}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                {usePassword
                  ? 'Signing in with the password set on your account.'
                  : "We'll send you a secure sign-in link. No password required."}
              </p>
              <button
                type="button"
                onClick={() => { setUsePassword(!usePassword); setError(''); }}
                className="block mx-auto text-sm text-primary hover:underline"
              >
                {usePassword ? 'Email me a sign-in link instead' : 'Sign in with a password instead'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Back to free picks
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
