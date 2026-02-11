'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, RefreshCw, Loader2, LayoutGrid } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { MatchupView } from '@/components/picks/MatchupView';

export default function MatchupsPage() {
  const { topOverall, bySport, isLoading, error, refetch, data } = useConsensus();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Flatten all picks from all sports
  const allPicks = [
    ...topOverall,
    ...Object.values(bySport).flat(),
  ];

  // Dedupe by id
  const uniquePicks = Array.from(
    new Map(allPicks.map(p => [p.id || p.bet, p])).values()
  );

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <LayoutGrid className="h-5 w-5" />
              <span className="text-sm font-medium">Matchup View</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Today&apos;s Matchups
            </h1>
            <p className="text-muted-foreground">
              {today} &middot; See where cappers stand on each game
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

      {/* Legend Card */}
      <Card className="mb-6 bg-gradient-to-r from-blue-900/10 to-red-900/10">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span>Away Team</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span>Home Team</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Consensus %</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading matchups...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Unable to load matchups. Please try refreshing.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      )}

      {/* Matchup View */}
      {!isLoading && !error && (
        <MatchupView picks={uniquePicks} />
      )}

      {/* How It Works */}
      <Card className="mt-12">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-4">How Matchup View Works</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-2xl font-bold text-primary mb-2">1</div>
              <p className="text-muted-foreground">
                Each game shows cappers split by side - see who&apos;s on which team at a glance.
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-2">2</div>
              <p className="text-muted-foreground">
                The consensus bar shows unit distribution - where the smart money is flowing.
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-2">3</div>
              <p className="text-muted-foreground">
                Filter by sport and bet type to find the games with the most capper action.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
