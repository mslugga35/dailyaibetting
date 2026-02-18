'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, RefreshCw, Loader2, Flame, TrendingUp, Trophy } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { EmailCaptureBanner } from '@/components/monetization/EmailCapture';
import Link from 'next/link';

export function BestBetsContent({ initialData }: { initialData: unknown }) {
  const { topOverall, isLoading, error, refetch, data } = useConsensus({ initialData: initialData as never });

  const bestBets = topOverall
    .filter(p => p.capperCount >= 3)
    .sort((a, b) => b.capperCount - a.capperCount)
    .slice(0, 10);

  const topPick = bestBets[0];

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const getFireEmoji = (count: number) => {
    if (count >= 10) return '🔥🔥🔥';
    if (count >= 5) return '🔥🔥';
    if (count >= 3) return '🔥';
    return '';
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { label: '#1 PICK', color: 'bg-yellow-500' };
    if (index === 1) return { label: '#2', color: 'bg-gray-400' };
    if (index === 2) return { label: '#3', color: 'bg-amber-600' };
    return null;
  };

  const sportColors: Record<string, string> = {
    NFL: 'bg-green-500/10 text-green-500 border-green-500/30',
    NBA: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    MLB: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    NHL: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
    NCAAF: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    NCAAB: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  };

  return (
    <div className="container px-4 py-8">
      {/* SEO Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">Top Picks</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Best Bets Today
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {today} &middot; Our highest-confidence plays ranked by expert consensus.
              These picks have the strongest agreement from professional handicappers.
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-primary">{bestBets.length}</div>
            <div className="text-sm text-muted-foreground">Best Bets Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-orange-500">
              {topPick?.capperCount || 0}
            </div>
            <div className="text-sm text-muted-foreground">Top Pick Agreement</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-3xl font-bold">{topOverall.length}</div>
            <div className="text-sm text-muted-foreground">Total Consensus</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-500">{data?.capperCount || 0}</div>
            <div className="text-sm text-muted-foreground">Experts Analyzed</div>
          </CardContent>
        </Card>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading best bets...</span>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Unable to load picks. Please try refreshing.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      )}

      {/* #1 Pick Feature */}
      {!isLoading && !error && topPick && (
        <Card className="mb-8 border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Today&apos;s #1 Best Bet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={sportColors[topPick.sport] || ''}>{topPick.sport}</Badge>
                  <Badge className="bg-yellow-500 text-white">#1 PICK</Badge>
                  <span className="text-xl">{getFireEmoji(topPick.capperCount)}</span>
                </div>
                <div className="text-lg text-muted-foreground mb-1">{topPick.matchup}</div>
                <div className="text-2xl font-bold text-primary">{topPick.bet}</div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{topPick.capperCount}</div>
                <div className="text-sm text-muted-foreground">experts agree</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranked Best Bets */}
      {!isLoading && !error && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Top 10 Best Bets
          </h2>
          {bestBets.length > 0 ? (
            <div className="space-y-3">
              {bestBets.slice(1).map((pick, index) => {
                const rank = getRankBadge(index + 1);
                return (
                  <Card key={index} className={index < 2 ? 'border-primary/30' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-muted-foreground w-8">
                            #{index + 2}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={sportColors[pick.sport] || ''}>{pick.sport}</Badge>
                              {rank && <Badge className={`${rank.color} text-white text-xs`}>{rank.label}</Badge>}
                              <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                            </div>
                            <div className="font-medium">{pick.matchup}</div>
                            <div className="text-lg font-bold text-primary">{pick.bet}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{pick.capperCount}</div>
                          <div className="text-xs text-muted-foreground">experts</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No best bets available yet today.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Best bets require 3+ cappers to agree. Check back as more picks come in!
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Email Capture */}
      <div className="mb-8">
        <EmailCaptureBanner />
      </div>

      {/* SEO Content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What Makes a &quot;Best Bet&quot;?</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            Our Best Bets are picks with the <strong>highest expert consensus</strong> of the day.
            These plays represent situations where multiple professional handicappers independently
            arrived at the same conclusion.
          </p>
          <h4>Selection Criteria:</h4>
          <ul>
            <li><strong>Minimum 3 cappers</strong> must agree on the same bet</li>
            <li><strong>Ranked by agreement</strong> &ndash; more experts = higher ranking</li>
            <li><strong>Same bet type</strong> &ndash; spread, total, and moneyline bets are separate</li>
            <li><strong>Updated in real-time</strong> as new picks are released</li>
          </ul>
          <p>
            While no bet is guaranteed, consensus plays historically outperform random selection.
            Use best bets as a starting point for your research, not as blind follows.
          </p>
        </CardContent>
      </Card>

      {/* Cross-links */}
      <Card>
        <CardHeader>
          <CardTitle>Explore More</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/free-sports-picks">All Free Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/parlay-picks">Parlay Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/expert-picks">Expert Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/consensus">Full Consensus</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/nfl-picks-today">NFL Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/nba-picks-today">NBA Picks</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
