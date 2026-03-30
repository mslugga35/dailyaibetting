'use client';

import { useSubscription } from '@/lib/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Lock, Crown } from 'lucide-react';
import Link from 'next/link';
import { PRO_PRICE_DISPLAY } from '@/lib/constants/subscription';

interface ProGateSectionProps {
  children: React.ReactNode;
  /** What to show as a teaser above the gate (e.g., first few items) */
  preview?: React.ReactNode;
  /** Label for what's locked */
  feature?: string;
}

export function ProGateSection({ children, preview, feature = 'this content' }: ProGateSectionProps) {
  const { isPro, loading, user } = useSubscription();

  if (loading) return <>{preview}</>;
  if (isPro) return <>{children}</>;

  return (
    <>
      {preview}
      <div className="relative mt-4">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-10 pointer-events-none" />
        <div className="relative z-20 text-center py-12 px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mx-auto mb-4">
            <Lock className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Upgrade to unlock {feature}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Get full access to detailed stats, complete pick history, and real-time consensus data.
          </p>
          <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
            <Link href={user ? '/pro' : '/login'}>
              <Crown className="h-4 w-4 mr-2" />
              {user ? `Upgrade to Pro — ${PRO_PRICE_DISPLAY}` : 'Sign in to upgrade'}
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
