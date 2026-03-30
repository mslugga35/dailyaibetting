'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpgradeButtonProps {
  className?: string;
  variant?: 'default' | 'outline';
  label?: string;
}

export function UpgradeButton({ className, variant = 'default', label }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === 'Unauthorized') {
        window.location.href = '/login?redirect=/pricing';
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      onClick={handleUpgrade}
      disabled={loading}
      className={cn(className)}
    >
      <Zap className="h-4 w-4 mr-2" />
      {loading ? 'Redirecting…' : (label || 'Upgrade to Premium – $20/mo')}
    </Button>
  );
}
