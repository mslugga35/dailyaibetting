'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Mail, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

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
  const searchParams = useSearchParams();

  useEffect(() => {
    const callbackError = searchParams.get('error');
    if (callbackError) {
      setError(callbackError === 'auth' ? 'Sign-in failed. Please try again.' : callbackError);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Use standard client (not @supabase/ssr) so flowType: 'implicit' is respected.
    // @supabase/ssr forces PKCE which breaks magic links opened in different browser contexts.
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: 'implicit' } }
    );
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
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

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 h-auto"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Continue with Email'
                )}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                We&apos;ll send you a secure sign-in link. No password required.
              </p>
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
