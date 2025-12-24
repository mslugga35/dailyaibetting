'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConsensusReport } from '@/components/picks/ConsensusReport';
import { Brain, RefreshCw, Target, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useConsensus } from '@/lib/hooks/use-consensus';

export default function HomePage() {
  const { topOverall, bySport, isLoading, error, refetch, data } = useConsensus();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalPicks = data?.totalPicks || 0;
  const firePicksCount = topOverall.filter(p => p.capperCount >= 3).length;

  return (
    <div className="container px-4 py-8">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
          <Brain className="h-4 w-4" />
          AI-Powered Picks
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Daily AI Betting Consensus
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
          Find value bets where multiple expert cappers agree. We analyze picks from top sources
          and highlight the strongest consensus plays.
        </p>
        <Button size="lg" asChild>
          <Link href="/consensus">
            <Target className="h-5 w-5 mr-2" />
            View All Picks
          </Link>
        </Button>
      </section>

      {/* Date & Refresh */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{today}</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
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

      {/* Quick Stats - Only show if we have real data */}
      {totalPicks > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{totalPicks.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Picks Analyzed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{topOverall.length}</div>
              <p className="text-sm text-muted-foreground">Consensus Picks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-500">{firePicksCount}</div>
              <p className="text-sm text-muted-foreground">Fire Picks (3+)</p>
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
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Today&apos;s Consensus
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topOverall.length > 0 ? (
                <ConsensusReport
                  topOverall={topOverall}
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
        </div>
      )}
    </div>
  );
}
