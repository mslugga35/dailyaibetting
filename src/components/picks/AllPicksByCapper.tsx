'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, TrendingUp } from 'lucide-react';
import { NormalizedPick } from '@/types';

interface AllPicksByCapperProps {
  picksByCapper: Record<string, NormalizedPick[]>;
  allPicks: NormalizedPick[];
}

// Sport colors for badges
const sportColors: Record<string, string> = {
  NFL: 'bg-blue-600',
  NBA: 'bg-orange-500',
  MLB: 'bg-red-600',
  NHL: 'bg-slate-700',
  CFB: 'bg-purple-600',
  NCAAF: 'bg-purple-600',
  CBB: 'bg-amber-600',
  NCAAB: 'bg-amber-600',
};

function getSportColor(sport: string): string {
  return sportColors[sport.toUpperCase()] || 'bg-gray-600';
}

// Format bet type for display
function formatBetType(betType: string): string {
  switch (betType) {
    case 'ML': return 'Moneyline';
    case 'SPREAD': return 'Spread';
    case 'OVER': return 'Over';
    case 'UNDER': return 'Under';
    case 'F5_ML': return 'F5 ML';
    case 'PROP': return 'Prop';
    default: return betType;
  }
}

export function AllPicksByCapper({ picksByCapper, allPicks }: AllPicksByCapperProps) {
  // Sort cappers by number of picks
  const sortedCappers = Object.entries(picksByCapper)
    .sort((a, b) => b[1].length - a[1].length);

  // Group all picks by sport for the "By Sport" view
  const picksBySport = allPicks.reduce((acc, pick) => {
    const sport = pick.sport;
    if (!acc[sport]) acc[sport] = [];
    acc[sport].push(pick);
    return acc;
  }, {} as Record<string, NormalizedPick[]>);

  const sortedSports = Object.entries(picksBySport)
    .sort((a, b) => b[1].length - a[1].length);

  if (sortedCappers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No picks available yet.</p>
        <p className="text-sm text-muted-foreground mt-2">Picks update every 5 minutes.</p>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="by-capper" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="by-capper" className="gap-2">
          <User className="h-4 w-4" />
          By Capper
        </TabsTrigger>
        <TabsTrigger value="by-sport" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          By Sport
        </TabsTrigger>
      </TabsList>

      {/* By Capper View */}
      <TabsContent value="by-capper" className="space-y-6">
        {sortedCappers.map(([capper, picks]) => (
          <Card key={capper}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span>{capper}</span>
                </div>
                <Badge variant="secondary">{picks.length} pick{picks.length !== 1 ? 's' : ''}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {picks.map((pick, idx) => (
                  <div
                    key={`${pick.id}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={`${getSportColor(pick.sport)} text-white text-xs`}>
                        {pick.sport}
                      </Badge>
                      <div>
                        <div className="font-medium">{pick.originalPick}</div>
                        <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatBetType(pick.betType)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {/* By Sport View */}
      <TabsContent value="by-sport" className="space-y-6">
        {sortedSports.map(([sport, picks]) => (
          <Card key={sport}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={`${getSportColor(sport)} text-white`}>
                    {sport}
                  </Badge>
                  <span>{sport} Picks</span>
                </div>
                <Badge variant="secondary">{picks.length} pick{picks.length !== 1 ? 's' : ''}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {picks.map((pick, idx) => (
                  <div
                    key={`${pick.id}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{pick.originalPick}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatBetType(pick.betType)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{pick.matchup}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{pick.capper}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}

// Compact version for embedding in other pages
export function CapperPicksCompact({ picksByCapper }: { picksByCapper: Record<string, NormalizedPick[]> }) {
  const sortedCappers = Object.entries(picksByCapper)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5); // Top 5 cappers

  return (
    <div className="space-y-4">
      {sortedCappers.map(([capper, picks]) => (
        <div key={capper} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="font-medium">{capper}</span>
            </div>
            <span className="text-xs text-muted-foreground">{picks.length} picks</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {picks.slice(0, 3).map((pick, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {pick.sport}: {pick.originalPick.slice(0, 20)}{pick.originalPick.length > 20 ? '...' : ''}
              </Badge>
            ))}
            {picks.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{picks.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
