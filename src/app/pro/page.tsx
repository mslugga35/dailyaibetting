'use client';

import { useSubscription } from '@/lib/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Loader2, Zap, Target, BarChart3, Clock, Users } from 'lucide-react';
import { ComparisonTable } from '@/components/monetization/ComparisonTable';
import Link from 'next/link';
import { useState } from 'react';

export default function ProPage() {
  const { isPro, status, user, loading } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Something went wrong');
      }
    } catch {
      alert('Network error — please try again');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Could not open billing portal');
      }
    } catch {
      alert('Network error — please try again');
    } finally {
      setPortalLoading(false);
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
          Status: <Badge className="bg-emerald-600 text-white">{status}</Badge>
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          You have full access to all premium features.
        </p>
        <Button variant="outline" onClick={handleManage} disabled={portalLoading}>
          {portalLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Manage Subscription
        </Button>
      </div>
    );
  }

  const features = [
    { icon: Zap, title: 'Real-time picks', desc: 'No 5-minute delay — get picks instantly' },
    { icon: Users, title: '200+ cappers tracked', desc: 'Individual picks from every capper we monitor' },
    { icon: BarChart3, title: 'Full stats & ROI', desc: 'Win rates, streaks, ROI for every capper' },
    { icon: Target, title: 'Unlimited consensus', desc: 'See every consensus pick, not just top 5' },
    { icon: Clock, title: '30-day archive', desc: 'Full pick history with results and grades' },
    { icon: Crown, title: 'Early access', desc: 'Get picks before lines move' },
  ];

  return (
    <div className="container px-4 py-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <Badge className="bg-emerald-600 text-white mb-4">DailyAI Pro</Badge>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Upgrade Your Edge
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Get the full picture. Real-time picks, full capper stats, and unlimited consensus data.
        </p>
      </div>

      {/* Pricing Card */}
      <Card className="border-emerald-500/30 mb-10">
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <span className="text-5xl font-bold">$20</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Try free for 7 days. Cancel anytime.
          </p>

          {user ? (
            <Button
              size="lg"
              className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCheckout}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Crown className="h-5 w-5 mr-2" />
              )}
              Start Free 7-Day Trial
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              asChild
            >
              <Link href="/login">
                <Crown className="h-5 w-5 mr-2" />
                Sign in to Start Free Trial
              </Link>
            </Button>
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
