'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, RefreshCw, Loader2, Flame, Users, List, TrendingUp } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { AllPicksByCapper } from '@/components/picks/AllPicksByCapper';
import { EmailCaptureBanner } from '@/components/monetization/EmailCapture';
import Link from 'next/link';

export function PicksContent({ initialData }: { initialData: unknown }) {
  const { topOverall, bySport, picksByCapper, allPicks, isLoading, error, refetch, data, normalizedCount, capperCount: apiCapperCount } = useConsensus({ initialData: initialData as never });

  const totalPicks = data?.totalPicks || 0;
  const consensusCount = data?.consensus?.length || 0;
  const capperCount = apiCapperCount || Object.keys(picksByCapper).length;
  const firePicks = (data?.consensus || []).filter(p => p.capperCount >= 3);
  const allPicksCount = normalizedCount || allPicks.length;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const getFireEmoji = (count: number) => {
    if (count >= 10) return '🔥🔥🔥';
    if (count >= 3) return '🔥';
    return '';
  };

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Target className="h-5 w-5" />
              <span className="text-sm font-medium">All Picks</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Today&apos;s Picks
            </h1>
            <p className="text-muted-foreground">
              {today} &middot; {allPicksCount > 0 ? `${allPicksCount} picks from ${capperCount} cappers` : 'Loading picks...'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {(totalPicks > 0 || allPicksCount > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-primary">{allPicksCount.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Today&apos;s Picks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold">{capperCount}</div>
              <div className="text-sm text-muted-foreground">Cappers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold">{consensusCount}</div>
              <div className="text-sm text-muted-foreground">Consensus (2+)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-orange-500">{firePicks.length}</div>
              <div className="text-sm text-muted-foreground">Fire Picks (3+)</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading picks...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Unable to load picks. Please try refreshing.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      )}

      {/* Main Content */}
      {!isLoading && !error && (
        <div className="space-y-8">
          {/* Main Tabs */}
          <Tabs defaultValue="consensus" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="consensus" className="gap-2">
                <Flame className="h-4 w-4" />
                Consensus
              </TabsTrigger>
              <TabsTrigger value="all-picks" className="gap-2">
                <List className="h-4 w-4" />
                All Picks
              </TabsTrigger>
              <TabsTrigger value="by-sport" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                By Sport
              </TabsTrigger>
            </TabsList>

            {/* Consensus Tab */}
            <TabsContent value="consensus" className="space-y-6">
              {/* Fire Picks Section */}
              {firePicks.length > 0 && (
                <Card className="border-orange-500/30 bg-orange-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      Fire Picks (3+ Cappers Agree)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {firePicks.map((pick, idx) => (
                      <div
                        key={pick.id || idx}
                        className="flex items-center justify-between p-4 rounded-lg bg-background border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-orange-500 text-white">{pick.sport}</Badge>
                            <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                          </div>
                          <div className="font-semibold text-lg">{pick.bet}</div>
                          <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                          <div className="flex items-center gap-1 mt-2">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {pick.cappers.join(', ')}
                            </span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-orange-500">{pick.capperCount}</div>
                          <div className="text-xs text-muted-foreground">agree</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* All Consensus Picks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    All Consensus Picks (2+ Cappers)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(data?.consensus || []).length > 0 ? (
                    (data?.consensus || []).map((pick, idx) => (
                      <div
                        key={pick.id || idx}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          pick.capperCount >= 3 ? 'bg-orange-500/5 border-orange-500/30' : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{pick.sport}</Badge>
                            {pick.capperCount >= 3 && (
                              <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                            )}
                          </div>
                          <div className="font-medium">{pick.bet}</div>
                          <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                          <div className="flex items-center gap-1 mt-2">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {pick.cappers.join(', ')}
                            </span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${pick.capperCount >= 3 ? 'text-orange-500' : 'text-primary'}`}>
                            {pick.capperCount}
                          </div>
                          <div className="text-xs text-muted-foreground">cappers</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No consensus picks available yet.</p>
                      <p className="text-sm mt-2">Picks update every 5 minutes.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Picks Tab */}
            <TabsContent value="all-picks" className="space-y-6">
              {Object.keys(picksByCapper).length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No individual picks available yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {totalPicks > 0
                      ? `${totalPicks.toLocaleString()} picks are being processed. Refresh to check for updates.`
                      : 'Picks update every 5 minutes.'}
                  </p>
                </Card>
              ) : (
                <AllPicksByCapper picksByCapper={picksByCapper} allPicks={allPicks} />
              )}
            </TabsContent>

            {/* By Sport Tab */}
            <TabsContent value="by-sport" className="space-y-6">
              {Object.entries(bySport).length > 0 ? (
                Object.entries(bySport)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([sport, picks]) => (
                    <Card key={sport}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary">{sport}</Badge>
                            <span>{sport} Consensus Picks</span>
                          </div>
                          <Badge variant="secondary">{picks.length} picks</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {picks.slice(0, 5).map((pick, idx) => (
                          <div
                            key={pick.id || idx}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              pick.capperCount >= 3 ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-muted/50'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{pick.bet}</span>
                                {pick.capperCount >= 3 && (
                                  <span>{getFireEmoji(pick.capperCount)}</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-xl font-bold ${pick.capperCount >= 3 ? 'text-orange-500' : ''}`}>
                                {pick.capperCount}
                              </div>
                              <div className="text-xs text-muted-foreground">cappers</div>
                            </div>
                          </div>
                        ))}
                        {picks.length > 5 && (
                          <p className="text-sm text-muted-foreground text-center">
                            +{picks.length - 5} more {sport} picks
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No picks available yet.</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Email Capture */}
          <EmailCaptureBanner />

          {/* Cross-links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link href="/daily-bets">Daily Best Bets</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/nfl-picks-today">NFL Picks</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/nba-picks-today">NBA Picks</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/mlb-picks-today">MLB Picks</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/sportsbooks">Sportsbooks</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
