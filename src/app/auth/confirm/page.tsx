'use client';

// DAI-05: landing page for emailed sign-in links. Opening it does NOT spend the token, so
// mail scanners and link previews can't burn the link. The token is spent by Supabase
// (verifyOtp) only when the person presses the button. Auth is unchanged: same one-time
// token, same 24-hour validity, verified by Supabase.
// The token travels in the URL FRAGMENT (#token_hash=...): fragments are never sent to the
// server, request logs, Referer, or the page URL that analytics/ads report.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { safeNext } from '@/lib/auth/safe-next';
import { isLinkToken } from '@/lib/auth/link-token';

type Link_ = { tokenHash: string; type: string; next: string; valid: boolean };

export default function AuthConfirmPage() {
  const [link, setLink] = useState<Link_ | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Read once at mount, then scrub the token from the address bar and history right away.
  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const tokenHash = p.get('token_hash') || '';
    const type = p.get('type') || '';
    const next = safeNext(p.get('next'));
    setLink({ tokenHash, type, next, valid: isLinkToken(tokenHash, type) });
    window.history.replaceState(null, '', '/auth/confirm');
  }, []);

  async function signIn() {
    if (!link) return;
    setBusy(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const { error } = await createClient().auth.verifyOtp({ token_hash: link.tokenHash, type: link.type as 'magiclink' | 'signup' });
      if (error) throw error;
      window.location.replace(link.next);
    } catch {
      // Spent, superseded, expired, or the request never completed: show the clear failure page.
      setFailed(true); setBusy(false);
    }
  }

  let body: React.ReactNode = null;
  if (link && (!link.valid || failed)) {
    body = (
      <div className="space-y-4 text-center" data-testid="confirm-failed">
        <h1 className="text-xl font-semibold">This sign-in link no longer works</h1>
        <p className="text-sm text-muted-foreground">
          It was already used, a newer link was sent (only the newest one works), or it is more than 24 hours old.
        </p>
        <Link href={`/login${link.next !== '/' ? `?redirect=${encodeURIComponent(link.next)}` : ''}`} className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Get a new link
        </Link>
      </div>
    );
  } else if (link) {
    body = (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold">Sign in to DailyAI Betting</h1>
        <p className="text-sm text-muted-foreground">Press the button to finish signing in. The link works once.</p>
        <button type="button" onClick={signIn} disabled={busy} data-testid="confirm-signin"
          className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-60">
          {busy ? 'Signing in…' : link.type === 'signup' ? 'Confirm email and sign in' : 'Sign in'}
        </button>
      </div>
    );
  }
  return <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">{body}</div>;
}
