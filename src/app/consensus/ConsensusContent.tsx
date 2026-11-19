'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Loader2, TrendingUp, Lock, Trophy } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { ConsensusReport } from '@/components/picks/ConsensusReport';
import { YesterdayResults } from '@/components/picks/YesterdayResults';
import { FadeThePublic } from '@/components/picks/FadeThePublic';
import { HiddenBagCTA } from '@/components/monetization/HiddenBagCTA';
import { ComparisonTable } from '@/components/monetization/ComparisonTable';

function TodayTab({ initialData, sport }: { initialData: unknown; sport?: string }) {
  const { topOverall, bySport, isLoading, error, refetch, data } = useConsensus({ date: 'today', sport, initialData: initialData as never });

  const totalPicks = data?.totalPicks || 0;
  const consensusCount = data?.consensus?.length || 0;
  const firePicksCount = topOverall.filter(p => p.capperCount >= 3).length;
  const maxAgreement = topOverall.length > 0
    ? Math.max(...topOverall.map(p => p.capperCount))
    : 0;

  return (
    <>
      {/* Quick Stats */}
      {totalPicks > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-primary">{totalPicks.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Picks Analyzed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold">{consensusCount}</div>
              <div className="text-sm text-muted-foreground">Consensus Picks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-orange-500">{firePicksCount}</div>
              <div className="text-sm text-muted-foreground">Fire Picks (3+)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold">{maxAgreement}</div>
              <div className="text-sm text-muted-foreground">Max Agreement</div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading consensus picks...</span>
        </div>
      )}

      {error && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Unable to load consensus picks. Please try refreshing.</p>
          <p className="text-xs text-muted-foreground mt-2">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:hidden">
            <FadeThePublic picks={topOverall} />
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Consensus Picks
                  </span>
                  {/* Plan unverifiable (outage): no Free/Pro label and no upsell; they may be paying. */}
                  {data?.entitlement === 'unknown' ? null : data?.tier === 'premium' ? (
                    <Badge className="gap-1.5 bg-primary/20 text-primary border-primary/30">Pro</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5 border-amber-500/50 text-amber-400">
                      <Lock className="h-3 w-3" />
                      Free Preview
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topOverall.length > 0 ? (
                  <ConsensusReport topOverall={topOverall} bySport={bySport} />
                ) : (
                  (data?.tier !== 'premium' && data?.entitlement !== 'unknown' && (data?.totalConsensusCount ?? 0) > 0) ? (
                    <div className="text-center py-8">
                      <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
                      <p className="font-semibold">{data?.totalConsensusCount} consensus picks today are Pro</p>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">The free preview shows today&apos;s top 5 across all sports.</p>
                      <Button asChild><a href="/pricing">See Pro</a></Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No consensus picks available yet.</p>
                      <p className="text-sm mt-2">Picks update throughout the day.</p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 hidden lg:block">
            <FadeThePublic picks={topOverall} />
            {topOverall.length > 0 && (
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    Market Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Consensus Picks</span>
                    <span className="font-bold">{consensusCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Fire Plays (3+)</span>
                    <span className="font-bold text-orange-500">{firePicksCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Fade Candidates (5+)</span>
                    <span className="font-bold text-yellow-500">
                      {topOverall.filter(p => p.capperCount >= 5).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Max Agreement</span>
                    <span className="font-bold">{maxAgreement} cappers</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function YesterdayTab({ initialData, sport }: { initialData: unknown; sport?: string }) {
  const { consensus, bySport, isLoading, error, refetch, data, yesterdayStats } = useConsensus({ date: 'yesterday', sport, initialData: initialData as never });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading yesterday&apos;s results...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Unable to load yesterday&apos;s results.</p>
        <p className="text-xs text-muted-foreground mt-2">{error.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <YesterdayResults
      consensus={consensus}
      stats={yesterdayStats || { wins: 0, losses: 0, pushes: 0, winRate: 0, totalGraded: 0, fireWins: 0, fireLosses: 0, fireWinRate: 0, fireTotal: 0 }}
      date={data?.date || ''}
      bySport={bySport}
    />
  );
}

/** `sport` (e.g. "NBA") keeps a sport page on that sport when the client refreshes the data. */
export function ConsensusContent({ initialData, initialYesterdayData, sport }: { initialData: unknown; initialYesterdayData: unknown; sport?: string }) {
  const [activeTab, setActiveTab] = useState('today');

  // Read ?tab= from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'yesterday') setActiveTab('yesterday');
  }, []);

  // Pinned to ET (the site's day boundary) so server and browser render the same date.
  const fmt = (d: Date) => d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
  const today = fmt(new Date());
  // The yesterday tab shows yesterday's date (ET), not today's.
  const yesterday = fmt(new Date(Date.now() - 24 * 60 * 60 * 1000));

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Target className="h-5 w-5" />
              <span className="text-sm font-medium">Consensus Picks</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {activeTab === 'today' ? "Today\u0027s Consensus Plays" : "Yesterday\u0027s Results"}
            </h1>
            <p className="text-muted-foreground" suppressHydrationWarning>
              {activeTab === 'today' ? today : yesterday} &middot; Picks where 2+ cappers agree
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="today" className="gap-2">
            <Target className="h-4 w-4" />
            Today&apos;s Picks
          </TabsTrigger>
          <TabsTrigger value="yesterday" className="gap-2">
            <Trophy className="h-4 w-4" />
            Yesterday&apos;s Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          <TodayTab initialData={initialData} sport={sport} />
        </TabsContent>

        <TabsContent value="yesterday" className="mt-6">
          <YesterdayTab initialData={initialYesterdayData} sport={sport} />
        </TabsContent>
      </Tabs>

      {/* Upgrade CTA */}
      <div className="mt-8">
        <HiddenBagCTA />
      </div>

      {/* Free vs Pro */}
      <div className="mt-8">
        <ComparisonTable />
      </div>

      {/* How It Works */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            How Consensus Picks Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">1</div>
              <h3 className="font-semibold">Aggregate Picks</h3>
              <p className="text-sm text-muted-foreground">
                We collect picks from betting sources including BetFirm, Dimers, Covers, and SportsLine.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">2</div>
              <h3 className="font-semibold">Find Agreement</h3>
              <p className="text-sm text-muted-foreground">
                Our system identifies games where 2 or more cappers agree on the same pick.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">3</div>
              <h3 className="font-semibold">Fire Tags</h3>
              <p className="text-sm text-muted-foreground">
                Picks with 3+ cappers get a fire tag. 10+ cappers may indicate a fade opportunity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
