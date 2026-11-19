'use client';

import { useSubscription } from '@/lib/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Loader2, Target, BarChart3, Clock, Users } from 'lucide-react';
import { ComparisonTable } from '@/components/monetization/ComparisonTable';
import Link from 'next/link';
import { useState } from 'react';
import { useOffer } from '@/lib/hooks/use-offer';

export default function ProPage() {
  const { isPro, status, user, loading } = useSubscription();
  const { offer, copy } = useOffer();
  const closed = !!offer && !offer.plan;
  const cta = status === 'canceled' ? copy.ctaReturning : copy.ctaNew;
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ expectedCents: offer?.amountCents ?? null }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setCheckoutError('Network error. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Already subscribed
  if (isPro) {
    return (
      <div className="container px-4 py-16 max-w-lg mx-auto text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mx-auto mb-4">
          <Crown className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">You&apos;re a Pro!</h1>
        <p className="text-muted-foreground mb-2">
          Status: <Badge className="bg-emerald-700 text-white">{status}</Badge>
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          You have full access to all premium features.
        </p>
        {/* Billing lives on /account: it opens the Stripe portal for paying members and explains
            complimentary access (no card, no portal) instead of a button that does nothing. */}
        <Button variant="outline" asChild data-testid="pro-manage-link">
          <Link href="/account">Manage Subscription</Link>
        </Button>
      </div>
    );
  }

  const features = [
    { icon: Users, title: 'Individual capper picks', desc: "See each tracked capper's picks and record" },
    { icon: BarChart3, title: 'Detailed stats', desc: 'Tier breakdowns and capper pick detail' },
    { icon: Target, title: 'Unlimited consensus', desc: 'See every consensus pick, not just top 5' },
    { icon: Clock, title: 'Pick history', desc: 'Pick-by-pick graded results for the latest 50 fire picks' },
  ];

  return (
    <div className="container px-4 py-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <Badge className="bg-emerald-700 text-white mb-4">DailyAI Pro</Badge>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Upgrade Your Edge
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Every consensus pick, individual capper pick detail, and graded results for the latest 50 fire picks.
        </p>
      </div>

      {/* Pricing Card */}
      <Card className="border-emerald-500/30 mb-10">
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            {offer?.plan === 'founding' && (
              <Badge variant="outline" className="mb-2 border-amber-500/50 text-amber-400">Founding Member</Badge>
            )}
            {copy.price ? (
              <div>
                <span className="text-5xl font-bold">{copy.price.split('/')[0]}</span>
                <span className="text-muted-foreground">/{copy.price.split('/')[1] ?? 'mo'}</span>
              </div>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {copy.terms}
          </p>
          {copy.firstCharge && status !== 'canceled' && <p className="text-xs text-muted-foreground mb-2">{copy.firstCharge}</p>}
          {copy.trialRule && status !== 'canceled' && <p className="text-xs text-muted-foreground mb-2">{copy.trialRule}</p>}
          {copy.lock && <p className="text-xs text-muted-foreground mb-2">{copy.lock}</p>}
          {copy.seats && <p className="text-xs font-medium text-amber-400 mb-2">{copy.seats}</p>}
          <p className="text-xs text-muted-foreground mb-6">{copy.renewal}</p>

          {closed ? (
            <Button size="lg" className="w-full max-w-sm" disabled>{copy.ctaNew}</Button>
          ) : user ? (
            <Button
              size="lg"
              className="w-full max-w-sm bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={handleCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Crown className="h-5 w-5 mr-2" />
              )}
              {cta}
            </Button>
                    ) : (
            <Button
              size="lg"
              className="w-full max-w-sm bg-emerald-700 hover:bg-emerald-800 text-white"
              asChild
            >
              {/* Checkout needs an account (owner decision 2026-11-19): no anonymous seat holds. */}
              <Link href="/login?mode=signup&redirect=/pro">
                <Crown className="h-5 w-5 mr-2" />
                Create a free account to start
              </Link>
            </Button>
          )}
          {checkoutError && (
            <p role="alert" className="text-sm text-red-400 mt-3" data-testid="checkout-error">{checkoutError}</p>
          )}
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {features.map((f) => (
          <div key={f.title} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 flex-shrink-0">
              <f.icon className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison */}
      <ComparisonTable />
    </div>
  );
}
