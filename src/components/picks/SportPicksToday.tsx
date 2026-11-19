'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, RefreshCw, Loader2, Flame } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { EmailCaptureBanner } from '@/components/monetization/EmailCapture';
import { SportQuickNav } from '@/components/ui/breadcrumbs';
import Link from 'next/link';

/**
 * "<Sport> Picks Today" page body. Asks the API for this sport only, so the counts are this
 * sport's full totals and a client refresh can never swap in the all-sport board (QA 2026-11-19:
 * the NFL/NBA pages were static text with no picks).
 */
export function SportPicksToday({ sport, label }: { sport: string; label: string }) {
  const { consensus, isLoading, error, refetch, data } = useConsensus({ sport });

  const nhlPicks = consensus.filter(p => p.sport === sport);
  const firePicks = nhlPicks.filter(p => p.isFire);
  // Full totals for this sport from the API; free visitors receive only the free picks.
  const totalCount = data?.consensusCount ?? nhlPicks.length;
  const totalFire = data?.firePickCount ?? firePicks.length;
  const lockedCount = Math.max(0, totalCount - nhlPicks.length);

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
              <span className="text-sm font-medium">{label} Picks</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Free {label} Picks Today
            </h1>
            <p className="text-muted-foreground">
              {today} &middot; Expert consensus picks for today&apos;s {label} games
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

      {/* Sport Quick Nav */}
      <SportQuickNav currentSport={({ NCAAB: 'CBB', NCAAF: 'CFB' } as Record<string, string>)[sport] ?? sport} />

      {/* Stats */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-primary">{totalCount}</div>
              <div className="text-sm text-muted-foreground">{label} Consensus Picks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-orange-500">{totalFire}</div>
              <div className="text-sm text-muted-foreground">Fire Picks (3+)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold">
                {/* Only known from visible picks: a dash, not 0, when this sport's picks are all Pro. */}
                {nhlPicks.length > 0 ? Math.max(...nhlPicks.map(p => p.capperCount)) : '—'}
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
          <span className="ml-2">Loading {label} picks...</span>
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
          {nhlPicks.length > 0 ? (
            nhlPicks
              .sort((a, b) => b.capperCount - a.capperCount)
              .map((pick, index) => (
                <Card key={index} className={pick.isFire ? 'border-orange-500/50 bg-orange-500/5' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{label}</Badge>
                          {pick.isFire && (
                            <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                          )}
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
          ) : lockedCount === 0 ? (
            <Card className="p-8 text-center">
              <Flame className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No {label} consensus picks yet today. Picks update throughout the day.</p>
              <p className="text-sm text-muted-foreground mt-2">Check back closer to game time!</p>
            </Card>
          ) : null}
          {lockedCount > 0 && (
            // Never "no picks" when the sport has picks a free visitor can't see (QA 2026-11-19).
            <Card className="p-6 text-center" data-testid="sport-locked">
              <p className="font-semibold">{lockedCount}{nhlPicks.length > 0 ? ' more' : ''} {label} consensus {lockedCount === 1 ? 'pick is' : 'picks are'} Pro today</p>
              <p className="text-sm text-muted-foreground mt-1 mb-3">The free preview shows today&apos;s top 5 across all sports.</p>
              <Button asChild size="sm"><Link href="/pricing">See Pro</Link></Button>
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
              <Link href="/mlb-picks-today">MLB Picks Today</Link>
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
