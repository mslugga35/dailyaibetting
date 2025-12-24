'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, RefreshCw, Loader2, Flame } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { EmailCaptureBanner } from '@/components/monetization/EmailCapture';
import Link from 'next/link';

export default function MLBPicksTodayPage() {
  const { topOverall, isLoading, error, refetch, data } = useConsensus();

  const mlbPicks = topOverall.filter(p => p.sport === 'MLB');
  const firePicks = mlbPicks.filter(p => p.capperCount >= 3);

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
      {/* SEO Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Target className="h-5 w-5" />
              <span className="text-sm font-medium">MLB Picks</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Free MLB Picks Today
            </h1>
            <p className="text-muted-foreground">
              {today} &middot; Expert consensus picks for today&apos;s MLB games
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
      {mlbPicks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-primary">{mlbPicks.length}</div>
              <div className="text-sm text-muted-foreground">MLB Consensus Picks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-orange-500">{firePicks.length}</div>
              <div className="text-sm text-muted-foreground">Fire Picks (3+)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold">
                {mlbPicks.length > 0 ? Math.max(...mlbPicks.map(p => p.capperCount)) : 0}
              </div>
              <div className="text-sm text-muted-foreground">Max Agreement</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-primary">{data?.totalPicks || 0}</div>
              <div className="text-sm text-muted-foreground">Total Analyzed</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading MLB picks...</span>
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

      {/* Picks */}
      {!isLoading && !error && (
        <div className="space-y-4 mb-8">
          {mlbPicks.length > 0 ? (
            mlbPicks
              .sort((a, b) => b.capperCount - a.capperCount)
              .map((pick, index) => (
                <Card key={index} className={pick.capperCount >= 3 ? 'border-orange-500/50 bg-orange-500/5' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">MLB</Badge>
                          {pick.capperCount >= 3 && (
                            <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                          )}
                        </div>
                        <div className="font-medium">{pick.game}</div>
                        <div className="text-lg font-bold text-primary">{pick.pick}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{pick.capperCount}</div>
                        <div className="text-xs text-muted-foreground">cappers agree</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          ) : (
            <Card className="p-8 text-center">
              <Flame className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No MLB picks available today.</p>
              <p className="text-sm text-muted-foreground mt-2">Check back closer to game time!</p>
            </Card>
          )}
        </div>
      )}

      {/* Email Capture */}
      <div className="mb-8">
        <EmailCaptureBanner />
      </div>

      {/* Cross-links for SEO */}
      <Card>
        <CardHeader>
          <CardTitle>More Free Picks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/nfl-picks-today">NFL Picks Today</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/nba-picks-today">NBA Picks Today</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/nhl-picks-today">NHL Picks Today</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/daily-bets">All Daily Bets</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sportsbooks">Best Sportsbooks</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
