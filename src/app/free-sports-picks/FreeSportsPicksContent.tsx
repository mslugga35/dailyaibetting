'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, RefreshCw, Loader2, Flame, TrendingUp, Users } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { EmailCaptureBanner } from '@/components/monetization/EmailCapture';
import Link from 'next/link';

export function FreeSportsPicksContent({ initialData }: { initialData: unknown }) {
  const { topOverall, isLoading, error, refetch, data } = useConsensus({ initialData: initialData as never });

  const firePicks = topOverall.filter(p => p.capperCount >= 3);
  const sportCounts: Record<string, number> = {};
  topOverall.forEach(p => {
    sportCounts[p.sport] = (sportCounts[p.sport] || 0) + 1;
  });

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
              <Target className="h-5 w-5" />
              <span className="text-sm font-medium">Free Picks</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Free Sports Picks Today
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {today} &middot; AI-powered consensus picks across NFL, NBA, MLB, NHL, and college sports.
              Our algorithm identifies bets where multiple expert cappers agree.
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

      {/* Stats Grid */}
      {topOverall.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Consensus</span>
              </div>
              <div className="text-3xl font-bold text-primary">{topOverall.length}</div>
              <div className="text-sm text-muted-foreground">Total Picks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Hot</span>
              </div>
              <div className="text-3xl font-bold text-orange-500">{firePicks.length}</div>
              <div className="text-sm text-muted-foreground">Fire Picks (3+)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Cappers</span>
              </div>
              <div className="text-3xl font-bold">{data?.capperCount || 0}</div>
              <div className="text-sm text-muted-foreground">Tracked Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Sports</span>
              </div>
              <div className="text-3xl font-bold text-green-500">{Object.keys(sportCounts).length}</div>
              <div className="text-sm text-muted-foreground">Active Today</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sport Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(sportCounts).map(([sport, count]) => {
          const sportSlugMap: Record<string, string> = {
            NFL: 'nfl-picks-today',
            NBA: 'nba-picks-today',
            MLB: 'mlb-picks-today',
            NHL: 'nhl-picks-today',
            NCAAF: 'cfb-picks-today',
            NCAAB: 'cbb-picks-today',
          };
          const slug = sportSlugMap[sport] || `${sport.toLowerCase()}-picks-today`;
          return (
            <Link key={sport} href={`/${slug}`}>
              <Badge variant="outline" className={`cursor-pointer hover:bg-primary/10 ${sportColors[sport] || ''}`}>
                {sport} ({count})
              </Badge>
            </Link>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading free picks...</span>
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

      {/* Fire Picks First */}
      {!isLoading && !error && firePicks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Fire Picks (3+ Cappers Agree)
          </h2>
          <div className="space-y-3">
            {firePicks
              .sort((a, b) => b.capperCount - a.capperCount)
              .map((pick, index) => (
                <Card key={index} className="border-orange-500/50 bg-orange-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={sportColors[pick.sport] || ''}>{pick.sport}</Badge>
                          <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                        </div>
                        <div className="font-medium">{pick.matchup}</div>
                        <div className="text-lg font-bold text-primary">{pick.bet}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{pick.capperCount}</div>
                        <div className="text-xs text-muted-foreground">cappers agree</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* All Consensus Picks */}
      {!isLoading && !error && (
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold">All Consensus Picks</h2>
          {topOverall.length > 0 ? (
            topOverall
              .filter(p => p.capperCount < 3)
              .sort((a, b) => b.capperCount - a.capperCount)
              .map((pick, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={sportColors[pick.sport] || ''}>{pick.sport}</Badge>
                        </div>
                        <div className="font-medium">{pick.matchup}</div>
                        <div className="text-lg font-bold text-primary">{pick.bet}</div>
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
              <p className="text-muted-foreground">No picks available yet today.</p>
              <p className="text-sm text-muted-foreground mt-2">Check back closer to game time!</p>
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
          <CardTitle>How Our Free Sports Picks Work</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            Daily AI Betting aggregates picks from multiple professional cappers and identifies
            <strong> consensus plays</strong> where experts agree. When 3 or more cappers recommend
            the same bet, we mark it as a 🔥 <strong>Fire Pick</strong>.
          </p>
          <ul>
            <li><strong>Real-time updates</strong> &ndash; Picks refresh automatically as cappers release their plays</li>
            <li><strong>No registration required</strong> &ndash; All picks are 100% free to view</li>
            <li><strong>Multi-sport coverage</strong> &ndash; NFL, NBA, MLB, NHL, college football, and basketball</li>
            <li><strong>Transparent tracking</strong> &ndash; See exactly which cappers agree on each pick</li>
          </ul>
        </CardContent>
      </Card>

      {/* Cross-links for SEO */}
      <Card>
        <CardHeader>
          <CardTitle>Browse by Sport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
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
              <Link href="/nhl-picks-today">NHL Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/cfb-picks-today">College Football</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/cbb-picks-today">College Basketball</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/parlay-picks">Parlay Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/expert-picks">Expert Picks</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
