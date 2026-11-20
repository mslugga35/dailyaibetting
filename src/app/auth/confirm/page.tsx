'use client';

// DAI-05: landing page for emailed sign-in links. Opening it does NOT spend the token, so
// mail scanners and link previews can't burn the link. The token is spent by Supabase
// (verifyOtp) only when the person presses the button. Auth is unchanged: same one-time
// token, same 24-hour validity, verified by Supabase.
// The token travels in the URL FRAGMENT (#token_hash=...): fragments are never sent to the
// server, request logs, Referer, or the page URL that analytics/ads report. It is scrubbed
// from the address bar at once and kept only in this tab's sessionStorage (for at most 2 hours)
// so a reload or a browser restoring the tab still works (it used to show a false "no longer
// works"). It is deleted the moment Supabase answers.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { safeNext } from '@/lib/auth/safe-next';
import { isLinkToken, parseSent, sentLabel, classifyVerifyError } from '@/lib/auth/link-token';

const STORE = 'dai-confirm-link';       // sessionStorage: the pending link of THIS tab
const SPENT = 'dai-spent-link';         // localStorage: fingerprint of the last link this browser spent
const STORE_TTL_MS = 2 * 3600e3;
type Pending = { tokenHash: string; type: string; next: string; sent: number | null };
type View = 'loading' | 'ready' | 'missing' | 'malformed' | 'rejected' | 'unreachable' | 'signed-in';

async function fingerprint(tokenHash: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`dai-link:${tokenHash}`));
  return Array.from(new Uint8Array(d).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}
function readLink(): Pending | null {
  const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (p.get('token_hash')) {
    const link = { tokenHash: p.get('token_hash') || '', type: p.get('type') || '', next: safeNext(p.get('next')), sent: Number(p.get('sent')) || null };
    if (isLinkToken(link.tokenHash, link.type)) {
      try { sessionStorage.setItem(STORE, JSON.stringify({ ...link, at: Date.now() })); } catch { /* storage blocked: the link still works now */ }
    }
    return link;
  }
  try {
    const s = JSON.parse(sessionStorage.getItem(STORE) || 'null');
    if (s && typeof s.tokenHash === 'string' && Date.now() - Number(s.at) < STORE_TTL_MS) {
      return { tokenHash: s.tokenHash, type: String(s.type), next: safeNext(s.next), sent: Number(s.sent) || null };
    }
    sessionStorage.removeItem(STORE);
  } catch { /* nothing stored */ }
  return null;
}
/** Remove the stored link, but only if it is still this one (a newer link may have replaced it). */
function forget(tokenHash: string) {
  try { if (JSON.parse(sessionStorage.getItem(STORE) || 'null')?.tokenHash === tokenHash) sessionStorage.removeItem(STORE); } catch { /* ignore */ }
}

export default function AuthConfirmPage() {
  const [link, setLink] = useState<Pending | null>(null);
  const [view, setView] = useState<View>('loading');
  const [account, setAccount] = useState('');
  const current = useRef('');   // token of the link this page is showing right now

  // Read at mount, then scrub the token from the address bar and history right away.
  useEffect(() => {
    const load = () => {
      const l = readLink();
      window.history.replaceState(null, '', '/auth/confirm');
      current.current = l?.tokenHash || '';
      setLink(l);
      setView(!l ? 'missing' : isLinkToken(l.tokenHash, l.type) ? 'ready' : 'malformed');
    };
    load();
    // A second link opened in this same tab changes only the #fragment (no page load), so the
    // page would otherwise keep, and spend, the FIRST link's token. Read the new one instead.
    const onHash = () => { if (window.location.hash.includes('token_hash=')) load(); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  async function signIn() {
    if (!link) return;
    const mine = link.tokenHash;
    const stillMine = () => current.current === mine; // a newer link opened meanwhile owns the page
    setView('loading');
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: mine, type: link.type as 'magiclink' | 'signup' });
      if (error) {
        if (!stillMine()) return;
        if (classifyVerifyError(error) === 'unreachable') { setView('unreachable'); return; } // keep the link for a retry
        forget(mine);
        // "Already signed in" only when THIS browser spent THIS link earlier and still has the session.
        let spentHere = false;
        try { const m = JSON.parse(localStorage.getItem(SPENT) || 'null'); spentHere = !!m && m.f === (await fingerprint(mine)) && Date.now() - m.at < 24 * 3600e3; } catch { /* no marker */ }
        const { data } = spentHere ? await supabase.auth.getUser() : { data: { user: null } };
        if (data?.user?.email) { setAccount(data.user.email); setView('signed-in'); } else setView('rejected');
        return;
      }
      try { localStorage.setItem(SPENT, JSON.stringify({ f: await fingerprint(mine), at: Date.now() })); } catch { /* optional */ }
      forget(mine);
      window.location.replace(link.next);
    } catch {
      // The page code or the sign-in service could not be reached; the token was not spent by us.
      if (stillMine()) setView('unreachable');
    }
  }

  const sent = link ? parseSent(link.sent) : null;
  const sentLine = sent ? <p className="text-sm text-muted-foreground" data-testid="confirm-sent">This link was sent at {sentLabel(sent)}.</p> : null;
  const next = link?.next ?? '/';
  const newLink = (
    <Link href={`/login${next !== '/' ? `?redirect=${encodeURIComponent(next)}` : ''}`} className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground">
      Get a new link
    </Link>
  );

  let body: React.ReactNode = null;
  if (view === 'ready' || (view === 'loading' && link)) {
    body = (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold">Sign in to DailyAI Betting</h1>
        {sentLine}
        <p className="text-sm text-muted-foreground">Press the button to finish signing in. The link works once.</p>
        <button type="button" onClick={signIn} disabled={view === 'loading'} data-testid="confirm-signin"
          className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-60">
          {view === 'loading' ? 'Signing in…' : link?.type === 'signup' ? 'Confirm email and sign in' : 'Sign in'}
        </button>
      </div>
    );
  } else if (view === 'rejected') {
    body = (
      <div className="space-y-4 text-center" data-testid="confirm-failed">
        <h1 className="text-xl font-semibold">This sign-in link no longer works</h1>
        {sentLine}
        <p className="text-sm text-muted-foreground">
          It was already used, a newer link was requested after it (only the newest one works), or it is more than
          24 hours old. If you asked for more than one link, open the most recent email.
        </p>
        {newLink}
      </div>
    );
  } else if (view === 'signed-in') {
    body = (
      <div className="space-y-4 text-center" data-testid="confirm-already">
        <h1 className="text-xl font-semibold">You&apos;re already signed in</h1>
        <p className="text-sm text-muted-foreground">
          This link was used earlier in this browser, which is signed in as <strong className="text-foreground">{account}</strong>. A link works only once.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={next} className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground">Continue</Link>
          <Link href="/account" className="inline-block rounded-md border px-4 py-2">Not you? Go to your account to sign out</Link>
        </div>
      </div>
    );
  } else if (view === 'unreachable') {
    body = (
      <div className="space-y-4 text-center" data-testid="confirm-unreachable">
        <h1 className="text-xl font-semibold">We couldn&apos;t finish signing you in</h1>
        <p className="text-sm text-muted-foreground">The sign-in service didn&apos;t answer. Your link may still work: try again.</p>
        <button type="button" onClick={signIn} data-testid="confirm-retry" className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground">Try again</button>
      </div>
    );
  } else if (view === 'missing' || view === 'malformed') {
    body = (
      <div className="space-y-4 text-center" data-testid={view === 'missing' ? 'confirm-missing' : 'confirm-malformed'}>
        <h1 className="text-xl font-semibold">{view === 'missing' ? 'Open your sign-in email again' : 'This sign-in link is incomplete'}</h1>
        <p className="text-sm text-muted-foreground">
          {view === 'missing'
            ? 'This page no longer has your sign-in link. Press the button in your most recent DailyAI sign-in email again, or get a new link.'
            : 'Part of the link is missing, which can happen when an email app cuts it off. Press the button in the email instead of copying the address, or get a new link.'}
        </p>
        {newLink}
      </div>
    );
  }
  return <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">{body}</div>;
}
