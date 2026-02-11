'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Target, ChevronRight } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { SportQuickNav } from '@/components/ui/breadcrumbs';
import { ConfidenceBadge, getConfidenceTier } from '@/components/ConfidenceBadge';
import Link from 'next/link';

interface GameSummary {
  slug: string;
  team1: string;
  team2: string;
  sport: string;
  pickCount: number;
  firePickCount: number;
  maxCappers: number;
}

export default function GamesPage() {
  const { topOverall, isLoading, error } = useConsensus();

  // Group picks by matchup
  const games = useMemo(() => {
    const gameMap = new Map<string, GameSummary>();

    topOverall.forEach(pick => {
      if (!pick.matchup) return;

      // Extract teams from matchup (e.g., "Chiefs vs Bills" or "LAL @ BOS")
      const matchup = pick.matchup;
      const vsMatch = matchup.match(/(.+?)\s*(?:vs\.?|@|at)\s*(.+)/i);

      if (vsMatch) {
        const team1 = vsMatch[1].trim();
        const team2 = vsMatch[2].trim();
        const slug = `${team1.toLowerCase().replace(/\s+/g, '-')}-vs-${team2.toLowerCase().replace(/\s+/g, '-')}`;

        const existing = gameMap.get(slug);
        if (existing) {
          existing.pickCount++;
          if (pick.capperCount >= 3) existing.firePickCount++;
          existing.maxCappers = Math.max(existing.maxCappers, pick.capperCount);
        } else {
          gameMap.set(slug, {
            slug,
            team1,
            team2,
            sport: pick.sport,
            pickCount: 1,
            firePickCount: pick.capperCount >= 3 ? 1 : 0,
            maxCappers: pick.capperCount,
          });
        }
      }
    });

    return Array.from(gameMap.values()).sort((a, b) => b.maxCappers - a.maxCappers);
  }, [topOverall]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Group games by sport
  const gamesBySport = useMemo(() => {
    const grouped: Record<string, GameSummary[]> = {};
    games.forEach(game => {
      if (!grouped[game.sport]) grouped[game.sport] = [];
      grouped[game.sport].push(game);
    });
    return grouped;
  }, [games]);

  const sportEmojis: Record<string, string> = {
    NFL: '🏈',
    NBA: '🏀',
    MLB: '⚾',
    NHL: '🏒',
    CFB: '🏈',
    CBB: '🏀',
    NCAAF: '🏈',
    NCAAB: '🏀',
  };

  return (
    <div className="container px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Calendar className="h-5 w-5" />
          <span className="text-sm font-medium">{today}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Today&apos;s Games</h1>
        <p className="text-muted-foreground">
          Browse consensus picks by matchup. Click any game for detailed expert analysis.
        </p>
      </div>

      {/* Sport Quick Nav */}
      <SportQuickNav />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading games...</span>
        </div>
      ) : games.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(gamesBySport).map(([sport, sportGames]) => (
            <section key={sport}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>{sportEmojis[sport] || '🎯'}</span>
                {sport} Games ({sportGames.length})
              </h2>
              <div className="space-y-3">
                {sportGames.map(game => (
                  <Link key={game.slug} href={`/games/${game.slug}`}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-semibold text-lg flex items-center gap-2">
                                {game.team1} vs {game.team2}
                                {game.maxCappers >= 2 && (
                                  <ConfidenceBadge capperCount={game.maxCappers} size="sm" />
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{game.sport}</Badge>
                                <span>{game.pickCount} picks</span>
                                <span className="text-muted-foreground">
                                  {game.maxCappers} cappers agree
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Games Today</h2>
          <p className="text-muted-foreground mb-6">
            No consensus picks are available for today&apos;s games yet.
            Check back closer to game time!
          </p>
          <Button asChild>
            <Link href="/">View Consensus Dashboard</Link>
          </Button>
        </Card>
      )}

      {/* SEO Content */}
      <section className="mt-12 prose prose-invert max-w-none">
        <h2 className="text-xl font-semibold mb-3">About Game-Specific Picks</h2>
        <p className="text-muted-foreground">
          Browse today&apos;s sports matchups and see which games have the strongest expert consensus.
          Our AI system aggregates picks from 10+ professional handicappers and identifies where
          multiple experts agree on the same bet.
        </p>
        <p className="text-muted-foreground mt-4">
          Games with &quot;fire picks&quot; 🔥 have 3 or more cappers agreeing on the same selection,
          indicating stronger confidence. Click any matchup to see all available picks,
          betting lines, and expert analysis.
        </p>
      </section>

      {/* Related Links */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/">Today&apos;s Consensus</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/best-bets">Best Bets</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/results">Track Record</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sportsbooks">Sportsbooks</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
