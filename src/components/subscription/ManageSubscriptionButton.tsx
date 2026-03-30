'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  async function handleManage() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleManage} disabled={loading} className="w-full">
      <Settings className="h-4 w-4 mr-2" />
      {loading ? 'Opening portal…' : 'Manage Subscription'}
    </Button>
  );
}
