'use client';

import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, ArrowRight, Mail } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const params = useSearchParams();
  const isGuest = params.get('guest') === '1';

  if (isGuest) {
    // Guest checkout: the webhook creates the account and emails a magic link.
    // The user is NOT signed in yet — tell them to check their inbox.
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mx-auto mb-4">
            <Mail className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment received — check your email!</h1>
          <p className="text-muted-foreground mb-6">
            We just emailed you a one-tap link to access your picks. No password needed.
            It can take a minute — check spam if you don&apos;t see it.
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">Didn&apos;t get it? Sign in with your email</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mx-auto mb-4">
          <Crown className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Welcome to Pro!</h1>
        <p className="text-muted-foreground mb-6">
          You now have full access to all premium features. Your 7-day free trial has started.
        </p>
        <div className="space-y-3">
          <Button className="w-full bg-emerald-700 hover:bg-emerald-800 text-white" asChild>
            <Link href="/consensus">
              View All Consensus Picks
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/cappers">Browse Capper Stats</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProSuccessPage() {
  return (
    <div className="container px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <Suspense fallback={null}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
