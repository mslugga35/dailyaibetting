'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Layers, RefreshCw, Loader2, Flame, Info } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { EmailCaptureBanner } from '@/components/monetization/EmailCapture';
import Link from 'next/link';

export default function ParlayPicksPage() {
  const { topOverall, isLoading, error, refetch, data } = useConsensus();

  // Fire picks make the best parlay legs
  const firePicks = topOverall.filter(p => p.capperCount >= 3);
  const parlayLegs = firePicks.slice(0, 6); // Top 6 for 2-leg to 6-leg parlays

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

  // Count unique sports for stats
  const uniqueSports = new Set(firePicks.map(p => p.sport));

  return (
    <div className="container px-4 py-8">
      {/* SEO Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Layers className="h-5 w-5" />
              <span className="text-sm font-medium">Parlay Builder</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Best Parlay Picks Today
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {today} &middot; Build winning parlays using our highest-confidence picks.
              Each leg features consensus from 3+ expert cappers.
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
            <div className="text-3xl font-bold text-primary">{firePicks.length}</div>
            <div className="text-sm text-muted-foreground">Parlay-Worthy Picks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-orange-500">{uniqueSports.size}</div>
            <div className="text-sm text-muted-foreground">Sports Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold">
              {firePicks.length > 0 ? Math.max(...firePicks.map(p => p.capperCount)) : 0}
            </div>
            <div className="text-sm text-muted-foreground">Max Agreement</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-green-500">{data?.capperCount || 0}</div>
            <div className="text-sm text-muted-foreground">Cappers Analyzed</div>
          </CardContent>
        </Card>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading parlay picks...</span>
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

      {/* Suggested Parlay */}
      {!isLoading && !error && parlayLegs.length >= 2 && (
        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Suggested Parlay ({parlayLegs.length} Legs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              {parlayLegs.map((pick, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-primary">#{index + 1}</span>
                    <div>
                      <Badge variant="outline" className={sportColors[pick.sport] || ''}>{pick.sport}</Badge>
                      <div className="font-medium mt-1">{pick.bet}</div>
                      <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                    <div className="text-sm font-bold">{pick.capperCount} cappers</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg text-sm">
              <Info className="h-4 w-4 text-blue-500 mt-0.5" />
              <span className="text-blue-700 dark:text-blue-300">
                This parlay combines our highest-confidence picks. Consider betting individual legs
                for lower risk or combine 2-3 legs for balanced risk/reward.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Fire Picks */}
      {!isLoading && !error && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            All Parlay-Worthy Picks
          </h2>
          {firePicks.length > 0 ? (
            <div className="space-y-3">
              {firePicks
                .sort((a, b) => b.capperCount - a.capperCount)
                .map((pick, index) => (
                  <Card key={index} className="border-orange-500/30">
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
          ) : (
            <Card className="p-8 text-center">
              <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No high-confidence picks available for parlays today.</p>
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
          <CardTitle>How to Build Winning Parlays</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            Parlays combine multiple bets into one ticket for higher payouts. Our parlay picks
            feature <strong>only consensus plays</strong> where 3+ professional cappers agree,
            giving you the best foundation for multi-leg bets.
          </p>
          <h4>Parlay Strategy Tips:</h4>
          <ul>
            <li><strong>2-3 legs</strong> &ndash; Best balance of risk and reward</li>
            <li><strong>Same-sport parlays</strong> &ndash; Easier to analyze correlations</li>
            <li><strong>Avoid low-odds favorites</strong> &ndash; Heavy favorites reduce parlay value</li>
            <li><strong>Mix bet types</strong> &ndash; Combine spreads, totals, and moneylines</li>
          </ul>
          <p>
            Remember: Parlays are high-risk bets. Never bet more than you can afford to lose,
            and consider splitting your bankroll between straight bets and parlays.
          </p>
        </CardContent>
      </Card>

      {/* Cross-links */}
      <Card>
        <CardHeader>
          <CardTitle>More Free Picks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/free-sports-picks">All Free Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/expert-picks">Expert Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/best-bets">Best Bets</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/nfl-picks-today">NFL Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/nba-picks-today">NBA Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/consensus">Consensus Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
