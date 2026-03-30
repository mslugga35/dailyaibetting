'use client';

import { useSubscription } from '@/lib/hooks/use-subscription';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Crown } from 'lucide-react';
import Link from 'next/link';

interface ProGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProGate({ children, fallback }: ProGateProps) {
  const { isPro, loading, user } = useSubscription();

  if (loading) {
    return (
      <div className="animate-pulse bg-muted/30 rounded-lg h-32" />
    );
  }

  if (isPro) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-blue-500/5">
      <CardContent className="p-6 text-center">
        <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold mb-1">Pro Feature</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upgrade to DailyAI Pro to unlock this content
        </p>
        <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
          <Link href={user ? '/pro' : '/login'}>
            <Crown className="h-4 w-4 mr-2" />
            {user ? 'Upgrade to Pro — $20/mo' : 'Sign in to upgrade'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
