'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

/**
 * Shown when the subscription could not be read (database error or timeout).
 * Deliberately neutral: no "Free" badge and no Upgrade button, because the user
 * may well be a paying subscriber. Re-requests the page on a short backoff.
 */
export function EntitlementUnknownNotice({ retryAfterSeconds = 15 }: { retryAfterSeconds?: number }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const delay = Math.min(retryAfterSeconds * 2 ** attempt, 120) * 1000;
    const t = setTimeout(() => {
      router.refresh();
      setAttempt((a) => a + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [attempt, retryAfterSeconds, router]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-3"
    >
      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-medium">We could not verify your subscription, retrying…</p>
        <p className="text-muted-foreground mt-1">
          This is a temporary problem on our side; your plan has not changed.{' '}
          <button type="button" onClick={() => router.refresh()} className="underline hover:text-foreground">
            Try again now
          </button>
        </p>
      </div>
    </div>
  );
}
