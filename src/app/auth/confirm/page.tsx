'use client';

// DAI-05: landing page for emailed sign-in links. Opening it does NOT spend the token, so
// mail scanners and link previews can't burn the link. The token is spent by Supabase
// (verifyOtp) only when the person presses the button. Auth is unchanged: same one-time
// token, same 24-hour validity, verified by Supabase.
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { safeNext } from '@/lib/auth/safe-next';

const TYPES = new Set(['magiclink', 'signup']);

function ConfirmInner() {
  const sp = useSearchParams();
  const tokenHash = sp.get('token_hash') || '';
  const type = sp.get('type') || '';
  const next = safeNext(sp.get('next'));
  const valid = /^[A-Za-z0-9_-]{16,}$/.test(tokenHash) && TYPES.has(type);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setBusy(true);
    const { createClient } = await import('@/lib/supabase/client');
    const { error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type: type as 'magiclink' | 'signup' });
    // Drop the token from the address bar and history either way.
    window.history.replaceState(null, '', '/auth/confirm');
    if (error) { setFailed(true); setBusy(false); return; }
    window.location.replace(next);
  }

  if (!valid || failed) {
    return (
      <div className="space-y-4 text-center" data-testid="confirm-failed">
        <h1 className="text-xl font-semibold">This sign-in link no longer works</h1>
        <p className="text-sm text-muted-foreground">
          It was already used, a newer link was sent (only the newest one works), or it is more than 24 hours old.
        </p>
        <Link href={`/login${next !== '/' ? `?redirect=${encodeURIComponent(next)}` : ''}`} className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Get a new link
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold">Sign in to DailyAI Betting</h1>
      <p className="text-sm text-muted-foreground">Press the button to finish signing in. The link works once.</p>
      <button type="button" onClick={signIn} disabled={busy} data-testid="confirm-signin"
        className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-60">
        {busy ? 'Signing in…' : type === 'signup' ? 'Confirm email and sign in' : 'Sign in'}
      </button>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <Suspense fallback={null}><ConfirmInner /></Suspense>
    </div>
  );
}
