'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOffer } from '@/lib/hooks/use-offer';

interface UpgradeButtonProps {
  className?: string;
  variant?: 'default' | 'outline';
  label?: string;
}

export function UpgradeButton({ className, variant = 'default', label }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { offer, copy } = useOffer();

  async function handleUpgrade() {
    setLoading(true);
    setMessage(null);
    // Never leave the button stuck on "Redirecting…" if checkout hangs.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        // The server refuses to charge a different amount than the one shown here.
        body: JSON.stringify({ expectedCents: offer?.amountCents ?? null }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (res.status === 401 || data.error === 'Unauthorized' || data.error === 'Not authenticated') {
        window.location.href = '/login?redirect=/pricing';
        return;
      }
      // 503 = we could not verify the current plan; 400 = already subscribed, etc.
      setMessage(
        typeof data.error === 'string' && data.error
          ? data.error
          : 'Something went wrong starting checkout. Please try again.',
      );
      setLoading(false);
    } catch {
      setMessage(controller.signal.aborted
        ? 'Checkout is taking too long to respond. Please try again.'
        : 'Could not reach checkout. Check your connection and try again.');
      setLoading(false);
    } finally {
      clearTimeout(timer);
    }
  }

  return (
    <>
      <Button
        variant={variant}
        onClick={handleUpgrade}
        disabled={loading}
        className={cn(className)}
      >
        <Zap className="h-4 w-4 mr-2" />
        {loading ? 'Redirecting…' : (label || copy.ctaReturning)}
      </Button>
      {message && (
        <p role="alert" className="mt-2 text-sm text-amber-500">{message}</p>
      )}
    </>
  );
}
