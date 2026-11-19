'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

/** Message shown when the portal cannot open, keyed by the API's HTTP status. */
export function portalErrorMessage(status: number): string {
  if (status === 401) return 'Your session expired. Sign in again to manage your subscription.';
  if (status === 404) return 'There is no Stripe billing account on this login, so there is nothing to manage here.';
  return 'The billing portal could not be opened. Please try again in a minute.';
}

/**
 * Opens the Stripe billing portal. Any response without a portal URL (expired
 * session, no Stripe customer, Stripe error) resets the button and says why,
 * instead of leaving it stuck on "Opening portal…".
 */
export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleManage() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.url === 'string' && data.url.startsWith('https://')) {
        window.location.href = data.url;
        return;
      }
      setError(portalErrorMessage(res.status));
    } catch {
      setError(portalErrorMessage(0));
    }
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={handleManage} disabled={loading} className="w-full">
        <Settings className="h-4 w-4 mr-2" />
        {loading ? 'Opening portal…' : 'Manage Subscription'}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive text-center" data-testid="portal-error">
          {error}
        </p>
      )}
    </div>
  );
}
