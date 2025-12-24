'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, RefreshCw, Loader2, TrendingUp } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { ConsensusReport } from '@/components/picks/ConsensusReport';

export default function ConsensusPage() {
  const { topOverall, bySport, isLoading, error, refetch, data } = useConsensus();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalPicks = data?.totalPicks || 0;
  const consensusCount = data?.consensus?.length || 0;
  const firePicksCount = topOverall.filter(p => p.capperCount >= 3).length;
  const maxAgreement = topOverall.length > 0
    ? Math.max(...topOverall.map(p => p.capperCount))
    : 0;

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
              Today&apos;s Consensus Plays
            </h1>
            <p className="text-muted-foreground">
              {today} &middot; Picks where 2+ cappers agree
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

      {/* Quick Stats - Only show if we have real data */}
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading consensus picks...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Unable to load consensus picks. Please try refreshing.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      )}

      {/* Main Content */}
      {!isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Consensus Picks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topOverall.length > 0 ? (
              <ConsensusReport
                topOverall={data?.consensus || topOverall}
                bySport={bySport}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No consensus picks available yet.</p>
                <p className="text-sm mt-2">Picks update every 5 minutes.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                We collect picks from top betting sources including BetFirm, Dimers, Covers, and SportsLine.
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
