import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConsensusReport } from '@/components/picks/ConsensusReport';
import { HiddenBagCTA } from '@/components/monetization/HiddenBagCTA';
import { ComparisonTable } from '@/components/monetization/ComparisonTable';
import { SportsbookLinks } from '@/components/monetization/SportsbookLinks';
import { Brain, Target, Lock, Trophy, Zap, Clock, CalendarClock, Crown } from 'lucide-react';
import Link from 'next/link';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';
import { EntitlementUnknownNotice } from '@/components/subscription/EntitlementUnknownNotice';
import { authHeaders, internalBaseUrl } from '@/lib/data/server-fetch';
import { PRO_PRICE_DISPLAY, TRIAL_DAYS, TRIAL_CTA, TRIAL_TERMS } from '@/lib/constants/subscription';
import { getVerifiedPerformance, MIN_SAMPLE } from '@/lib/data/performance';

// Server-side data fetching
async function getConsensusData() {
  try {
    // Loopback to this process, forwarding the visitor's cookie (tier) and IP, plus the
    // internal marker so homepage renders do not share/spend one per-IP rate-limit bucket.
    const response = await fetch(`${internalBaseUrl()}/api/consensus`, {
      cache: 'no-store',
      headers: await authHeaders(),
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

// Graded results record — only shows once real graded data exists (never 0-0).
/** Verified, graded record straight from the database (no self-fetch over HTTP). */
async function getTrackRecord() {
  try {
    const perf = await getVerifiedPerformance();
    return perf.allTime;
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const [data, trackRecord] = await Promise.all([getConsensusData(), getTrackRecord()]);
  // Only advertise a win rate once the sample is meaningful; the full record is always on /results.
  const hasTrackRecord = !!trackRecord && trackRecord.decided >= MIN_SAMPLE;

  const topOverall = data?.topOverall || [];
  const bySport = data?.bySport || {};
  const totalPicks = data?.totalPicks || 0;
  // The free tier receives only a slice of the picks, so count fire picks from the
  // server's aggregate, not from the (possibly truncated) list.
  const firePicksCount: number = typeof data?.firePickCount === 'number'
    ? data.firePickCount
    : topOverall.filter((p: { capperCount: number }) => p.capperCount >= 3).length;
  const isPremium = data?.tier === 'premium';
  // The plan could not be verified (outage): show neither Premium nor an upgrade pitch.
  const entitlementUnknown = data?.entitlement === 'unknown';
  const totalConsensusCount = data?.totalConsensusCount || topOverall.length;
  const hiddenPicksCount = totalConsensusCount - topOverall.length;
  const capperCount = data?.capperCount || 0;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="container px-4 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden text-center mb-16 pb-12 border-b border-border/40">
        <div className="absolute inset-0 hero-grid pointer-events-none" aria-hidden />
        <div className="relative pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-5">
          <Brain className="h-4 w-4" />
          <span className="font-mono uppercase tracking-[0.2em] text-xs">AI-Powered Picks</span>
        </div>
        <h1 className="font-display uppercase text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.95] mb-4">
          Daily AI Betting Consensus
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
          See where multiple expert cappers chose the same pick. We collect picks from several sources
          and show how many cappers agree on each one. No outcome is guaranteed.
        </p>
        {hasTrackRecord && (
          <Link
            href="/results"
            className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 mb-6 hover:bg-emerald-500/15 transition-colors"
          >
            <Trophy className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span className="text-sm">
              <span className="font-mono font-bold tabular-nums text-emerald-400">{trackRecord.winPct?.toFixed(1)}% win rate</span>
              <span className="text-muted-foreground"> on {trackRecord.decided.toLocaleString()} graded fire picks (3+ cappers)</span>
            </span>
            <span className="text-sm font-medium text-emerald-400">See every result →</span>
          </Link>
        )}
        {(totalConsensusCount > 0 || capperCount > 0) && (
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-8 text-sm">
            {firePicksCount > 0 && (
              <span className="font-semibold text-orange-400">
                🔥 {firePicksCount} fire pick{firePicksCount !== 1 ? 's' : ''} today
              </span>
            )}
            {totalConsensusCount > 0 && (
              <span className="text-muted-foreground">
                <span className="font-bold text-foreground">{totalConsensusCount}</span> consensus plays
              </span>
            )}
            {capperCount > 0 && (
              <span className="text-muted-foreground">
                <span className="font-bold text-foreground">{capperCount}</span> cappers tracked
              </span>
            )}
            <span className="text-muted-foreground">Auto-graded via ESPN</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/consensus">
              <Target className="h-5 w-5 mr-2" />
              View All Picks
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" asChild>
            <Link href="/pro">
              <Crown className="h-5 w-5 mr-2" />
              {TRIAL_CTA}
            </Link>
          </Button>
        </div>
        <div className="mt-8 flex flex-col items-center gap-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Place your bets at</span>
          <SportsbookLinks variant="compact" />
        </div>
        </div>
      </section>

      {/* Date & Refresh */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display uppercase tracking-tight text-3xl font-bold">{today}</h2>
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
              <div className="font-mono text-4xl font-bold tabular-nums text-primary leading-none">{totalPicks.toLocaleString()}</div>
              <p className="eyebrow mt-2">Total Picks Analyzed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="font-mono text-4xl font-bold tabular-nums leading-none">{totalConsensusCount}</div>
              <p className="eyebrow mt-2">Consensus Picks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="font-mono text-4xl font-bold tabular-nums text-orange-500 leading-none">{firePicksCount}</div>
              <p className="eyebrow mt-2">Fire Picks (3+)</p>
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
                {entitlementUnknown ? (
                  <Badge variant="outline" className="gap-1.5 border-amber-500/40 text-amber-500">
                    Verifying plan…
                  </Badge>
                ) : isPremium ? (
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
                  {entitlementUnknown && (
                    <div className="mt-6"><EntitlementUnknownNotice /></div>
                  )}
                  {!isPremium && !entitlementUnknown && hiddenPicksCount > 0 && (
                    <div className="mt-6 p-5 rounded-xl border border-primary/30 bg-primary/5 text-center">
                      <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="font-semibold mb-1">
                        {hiddenPicksCount} more consensus picks locked
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upgrade to Premium for access to all picks, MEGA/NUCLEAR alerts, and full leaderboards.
                      </p>
                      <UpgradeButton label={`Unlock All Picks – ${PRO_PRICE_DISPLAY}`} />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 mx-auto mb-4">
                    <CalendarClock className="h-7 w-7 text-muted-foreground/80" />
                  </div>
                  <p className="font-medium text-foreground/70 mb-1">No consensus picks yet today</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Picks build throughout the day as cappers post. Check back when games are approaching.
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground/80">
                    <Clock className="h-3 w-3" />
                    Picks update throughout the day
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
          {!isPremium && !entitlementUnknown && <HiddenBagCTA />}

          {/* Free vs Pro */}
          {!isPremium && !entitlementUnknown && <ComparisonTable />}
        </div>
      )}
    </div>
  );
}
