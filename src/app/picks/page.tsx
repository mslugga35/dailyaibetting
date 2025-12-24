'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, RefreshCw, Loader2 } from 'lucide-react';
import { useConsensus } from '@/lib/hooks/use-consensus';
import { ConsensusReport } from '@/components/picks/ConsensusReport';

export default function PicksPage() {
  const { topOverall, bySport, isLoading, error, refetch, data } = useConsensus();

  const totalPicks = data?.totalPicks || 0;
  const consensusCount = data?.consensus?.length || 0;

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Target className="h-5 w-5" />
              <span className="text-sm font-medium">All Picks</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Today&apos;s Picks
            </h1>
            <p className="text-muted-foreground">
              All consensus picks from today&apos;s analysis
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
      {totalPicks > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-primary">{totalPicks.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Picks Analyzed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold">{consensusCount}</div>
              <div className="text-sm text-muted-foreground">Consensus Picks (2+)</div>
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
        <Card>
          <CardHeader>
            <CardTitle>All Consensus Picks</CardTitle>
          </CardHeader>
          <CardContent>
            {topOverall.length > 0 ? (
              <ConsensusReport
                topOverall={data?.consensus || topOverall}
                bySport={bySport}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No picks available yet.</p>
                <p className="text-sm mt-2">Picks update every 5 minutes.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
