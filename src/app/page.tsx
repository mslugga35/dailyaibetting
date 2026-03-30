import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConsensusReport } from '@/components/picks/ConsensusReport';
import { HiddenBagCTA } from '@/components/monetization/HiddenBagCTA';
import { ComparisonTable } from '@/components/monetization/ComparisonTable';
import { SportsbookLinks } from '@/components/monetization/SportsbookLinks';
import { Brain, Target, Lock, Trophy, Zap, Clock, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';

// Server-side data fetching
async function getConsensusData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailyaibetting.com';
    const response = await fetch(`${baseUrl}/api/consensus`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[HomePage] API error:', response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('[HomePage] Fetch error:', error);
    return null;
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const data = await getConsensusData();

  const topOverall = data?.topOverall || [];
  const bySport = data?.bySport || {};
  const totalPicks = data?.totalPicks || 0;
  const firePicksCount = topOverall.filter((p: { capperCount: number }) => p.capperCount >= 3).length;
  const isPremium = data?.tier === 'premium';
  const totalConsensusCount = data?.totalConsensusCount || topOverall.length;
  const hiddenPicksCount = totalConsensusCount - topOverall.length;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="container px-4 py-8">
      {/* Hero Section */}
      <section className="text-center mb-16 pb-12 border-b border-border/40">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
          <Brain className="h-4 w-4" />
          AI-Powered Picks
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Daily AI Betting Consensus
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
          Find value bets where multiple expert cappers agree. We analyze picks from top sources
          and highlight the strongest consensus plays.
        </p>
        <Button size="lg" asChild>
          <Link href="/consensus">
            <Target className="h-5 w-5 mr-2" />
            View All Picks
          </Link>
        </Button>
        <div className="mt-8 flex flex-col items-center gap-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Place your bets at</span>
          <SportsbookLinks variant="compact" />
        </div>
      </section>

      {/* Date & Refresh */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{today}</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* Quick Stats - Only show if we have real data */}
      {totalPicks > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{totalPicks.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Picks Analyzed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{totalConsensusCount}</div>
              <p className="text-sm text-muted-foreground">Consensus Picks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-500">{firePicksCount}</div>
              <p className="text-sm text-muted-foreground">Fire Picks (3+)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {!data && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Unable to load picks. Please try refreshing.</p>
          <RefreshButton className="mt-4" />
        </Card>
      )}

      {/* Main Content */}
      {data && (
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Today&apos;s Consensus
                </span>
                {isPremium ? (
                  <Badge className="gap-1.5 bg-primary/20 text-primary border-primary/30">
                    <Zap className="h-3 w-3" />
                    Premium
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5 border-muted-foreground/30 text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Free Preview
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topOverall.length > 0 ? (
                <>
                  <ConsensusReport
                    topOverall={topOverall}
                    bySport={bySport}
                  />
                  {!isPremium && hiddenPicksCount > 0 && (
                    <div className="mt-6 p-5 rounded-xl border border-primary/30 bg-primary/5 text-center">
                      <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="font-semibold mb-1">
                        {hiddenPicksCount} more consensus picks locked
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upgrade to Premium for real-time access to all picks, MEGA/NUCLEAR alerts, and full leaderboards.
                      </p>
                      <UpgradeButton label="Unlock All Picks – $20/mo" />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 mx-auto mb-4">
                    <CalendarClock className="h-7 w-7 text-muted-foreground/60" />
                  </div>
                  <p className="font-medium text-foreground/70 mb-1">No consensus picks yet today</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Picks build throughout the day as cappers post. Check back when games are approaching.
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground/60">
                    <Clock className="h-3 w-3" />
                    Updates every 5 minutes
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Yesterday's Results Link */}
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="font-semibold">Yesterday&apos;s Results</p>
                  <p className="text-sm text-muted-foreground">See how consensus picks performed with W/L grades</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/consensus?tab=yesterday">View Results</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Show upgrade CTA only for free users */}
          {!isPremium && <HiddenBagCTA />}

          {/* Free vs Pro */}
          {!isPremium && <ComparisonTable />}
        </div>
      )}
    </div>
  );
}
