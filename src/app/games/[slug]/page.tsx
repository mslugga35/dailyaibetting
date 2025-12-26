'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Target, TrendingUp, Users, ExternalLink } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { SportQuickNav } from '@/components/ui/breadcrumbs';
import Link from 'next/link';

interface GamePick {
  matchup: string;
  bet: string;
  betType: string;
  capperCount: number;
  sport: string;
  cappers: string[];
}

export default function GamePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { topOverall, isLoading, error } = useConsensus();
  const [gamePicks, setGamePicks] = useState<GamePick[]>([]);
  const [gameInfo, setGameInfo] = useState<{ team1: string; team2: string; sport: string } | null>(null);

  useEffect(() => {
    if (!slug) return;

    // Parse slug: format is "team1-vs-team2" or "team1-at-team2"
    const parts = slug.split(/-vs-|-at-/i);
    if (parts.length === 2) {
      const team1 = parts[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const team2 = parts[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      // Find matching picks
      const matchingPicks = topOverall.filter(pick => {
        const matchup = pick.matchup?.toLowerCase() || '';
        const t1Lower = team1.toLowerCase();
        const t2Lower = team2.toLowerCase();
        return matchup.includes(t1Lower) || matchup.includes(t2Lower) ||
               pick.bet?.toLowerCase().includes(t1Lower) ||
               pick.bet?.toLowerCase().includes(t2Lower);
      });

      // Determine sport from picks
      const sport = matchingPicks[0]?.sport || 'SPORTS';

      setGameInfo({ team1, team2, sport });
      setGamePicks(matchingPicks);
    }
  }, [slug, topOverall]);

  const getFireEmoji = (count: number) => {
    if (count >= 10) return '🔥🔥🔥';
    if (count >= 3) return '🔥';
    return '';
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="container px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Loading game data...</p>
      </div>
    );
  }

  if (!gameInfo) {
    return (
      <div className="container px-4 py-16 text-center">
        <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Game Not Found</h1>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t find picks for this matchup. It may not be scheduled for today.
        </p>
        <Button asChild>
          <Link href="/">View Today&apos;s Picks</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Calendar className="h-5 w-5" />
          <span className="text-sm font-medium">{today}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {gameInfo.team1} vs {gameInfo.team2}
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{gameInfo.sport}</Badge>
          <span className="text-muted-foreground">Expert Consensus Picks</span>
        </div>
      </div>

      {/* Sport Quick Nav */}
      <SportQuickNav currentSport={gameInfo.sport} />

      {/* Picks for this game */}
      {gamePicks.length > 0 ? (
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Consensus Picks ({gamePicks.length})
          </h2>
          {gamePicks
            .sort((a, b) => b.capperCount - a.capperCount)
            .map((pick, index) => (
              <Card
                key={index}
                className={pick.capperCount >= 3 ? 'border-orange-500/50 bg-orange-500/5' : ''}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{pick.betType}</Badge>
                        {pick.capperCount >= 3 && (
                          <span className="text-lg">{getFireEmoji(pick.capperCount)}</span>
                        )}
                      </div>
                      <div className="text-lg font-bold text-primary">{pick.bet}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {pick.matchup}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{pick.capperCount}</div>
                      <div className="text-xs text-muted-foreground">cappers agree</div>
                    </div>
                  </div>
                  {pick.cappers && pick.cappers.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{pick.cappers.join(', ')}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <Card className="p-8 text-center mb-8">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Picks Available</h2>
          <p className="text-muted-foreground mb-4">
            No consensus picks found for this matchup yet. Check back closer to game time!
          </p>
          <Button asChild variant="outline">
            <Link href="/">View All Picks</Link>
          </Button>
        </Card>
      )}

      {/* Betting Options CTA */}
      <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Ready to Bet on This Game?</h3>
          <p className="text-muted-foreground mb-4">
            Compare odds and claim signup bonuses at top sportsbooks.
          </p>
          <Button asChild>
            <Link href="/sportsbooks">
              View Sportsbook Bonuses
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Related Links */}
      <Card>
        <CardHeader>
          <CardTitle>More Picks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/">Today&apos;s Consensus</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/${gameInfo.sport.toLowerCase()}-picks-today`}>
                All {gameInfo.sport} Picks
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/results">Track Record</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/history">Pick History</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SEO Content */}
      <section className="mt-12 prose prose-invert max-w-none">
        <h2 className="text-xl font-semibold mb-3">
          {gameInfo.team1} vs {gameInfo.team2} Betting Preview
        </h2>
        <p className="text-muted-foreground">
          Get the latest expert picks and predictions for the {gameInfo.team1} vs {gameInfo.team2} matchup.
          Our AI-powered consensus system analyzes picks from 10+ professional handicappers to identify
          where multiple experts agree. When 3 or more cappers pick the same bet, we flag it as a
          &quot;fire pick&quot; 🔥 for stronger confidence.
        </p>
        <p className="text-muted-foreground mt-4">
          All picks are updated in real-time as new expert predictions come in. Check back often
          for the latest consensus on this {gameInfo.sport} matchup.
        </p>
      </section>
    </div>
  );
}
