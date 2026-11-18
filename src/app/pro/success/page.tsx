'use client';

import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, ArrowRight, Mail, CircleSlash } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CANCEL_POLICY } from '@/lib/pricing/plans';

type CheckoutState = 'checking' | 'pending' | 'trialing' | 'active' | 'trial_not_started' | 'unknown';

/**
 * Ask the server what happened to this checkout. A free trial on a card that already had
 * one is refused by the webhook a few seconds after checkout, so the page only welcomes a
 * CONFIRMED outcome ("trialing" is only reported once the card check has passed). Anything
 * still unsettled after ~15 s gets a neutral "still confirming" view, never the welcome.
 */
function useCheckoutState(sessionId: string | null): CheckoutState {
  const [state, setState] = useState<CheckoutState>(sessionId ? 'checking' : 'unknown');
  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    (async () => {
      let last: CheckoutState = 'unknown';
      for (let i = 0; i < 10 && !stop; i++) {
        try {
          const r = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
          last = ((await r.json())?.state as CheckoutState) || 'unknown';
        } catch { last = 'unknown'; }
        if (last === 'trial_not_started' || last === 'active' || last === 'trialing') break;
        await new Promise((res) => setTimeout(res, 1500));
      }
      if (!stop) setState(last);
    })();
    return () => { stop = true; };
  }, [sessionId]);
  return state;
}

function StillConfirming() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mx-auto mb-4">
          <Mail className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">We&apos;re confirming your subscription</h1>
        <p className="text-muted-foreground mb-6">
          This can take a minute. We&apos;ll email you as soon as it&apos;s settled, and your Account page always shows your current plan and any charge.
        </p>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/account">Go to my Account</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function TrialNotStarted() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 mx-auto mb-4">
          <CircleSlash className="h-8 w-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Your free trial could not be started</h1>
        <p className="text-muted-foreground mb-4">
          The payment card you used has already been used for a DailyAI free trial, and each card can start one free trial.
        </p>
        <p className="mb-6 font-medium">We cancelled the new trial. You have not been charged and no future charge is scheduled.</p>
        <Button className="w-full bg-emerald-700 hover:bg-emerald-800 text-white" asChild>
          <Link href="/pricing">Subscribe without a trial</Link>
        </Button>
        <p className="text-xs text-muted-foreground mt-4">Questions? Email support@dailyaibetting.com.</p>
      </CardContent>
    </Card>
  );
}

function SuccessContent() {
  const params = useSearchParams();
  const isGuest = params.get('guest') === '1';
  const state = useCheckoutState(params.get('session_id'));

  if (state === 'checking') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground" role="status">Confirming your subscription…</p>
        </CardContent>
      </Card>
    );
  }
  if (state === 'trial_not_started') return <TrialNotStarted />;
  if (state !== 'trialing' && state !== 'active') return <StillConfirming />;

  if (isGuest) {
    // Guest checkout: the webhook creates the account and emails a magic link.
    // The user is NOT signed in yet — tell them to check their inbox.
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mx-auto mb-4">
            <Mail className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{state === 'trialing' ? 'Your free trial has started. Check your email!' : "You're in. Check your email!"}</h1>
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
          You now have full access to all premium features. If your plan includes a free trial, it has started and you won&apos;t be charged until it ends.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Your plan, price and next renewal date are on your{' '}
          <Link href="/account" className="underline">Account page</Link>. {CANCEL_POLICY}
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
