'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TrendingUp, TrendingDown, Trophy, Flame } from 'lucide-react';
import { Capper } from '@/types';
import Link from 'next/link';

interface CapperLeaderboardProps {
  cappers: Capper[];
  title?: string;
  limit?: number;
  showRank?: boolean;
}

export function CapperLeaderboard({
  cappers,
  title = "Top Cappers",
  limit = 10,
  showRank = true,
}: CapperLeaderboardProps) {
  const displayCappers = cappers.slice(0, limit);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <span className="text-xs font-bold text-gray-400">2nd</span>;
    if (rank === 3) return <span className="text-xs font-bold text-amber-600">3rd</span>;
    return <span className="text-xs text-muted-foreground">{rank}</span>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Link
          href="/cappers"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View All
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {displayCappers.map((capper, index) => (
            <Link
              key={capper.id}
              href={`/cappers/${capper.slug}`}
              className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
            >
              {/* Rank */}
              {showRank && (
                <div className="w-8 flex items-center justify-center">
                  {getRankBadge(index + 1)}
                </div>
              )}

              {/* Avatar */}
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {capper.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{capper.name}</span>
                  {capper.streak && capper.streak >= 3 && (
                    <Badge
                      variant={capper.streak_type === 'W' ? 'default' : 'destructive'}
                      className="h-5 text-[10px] px-1.5"
                    >
                      <Flame className="h-3 w-3 mr-0.5" />
                      {capper.streak}{capper.streak_type}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{capper.wins}-{capper.losses}</span>
                  <span>·</span>
                  <span>{capper.source}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-sm font-semibold">
                    {(capper.win_rate * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
                <div className="hidden sm:block">
                  <div className={`text-sm font-semibold flex items-center gap-1 ${
                    capper.total_units >= 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {capper.total_units >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {capper.total_units >= 0 ? '+' : ''}{capper.total_units.toFixed(1)}u
                  </div>
                  <div className="text-xs text-muted-foreground">Units</div>
                </div>
                <div className="hidden md:block">
                  <div className={`text-sm font-semibold ${
                    capper.roi >= 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {capper.roi >= 0 ? '+' : ''}{(capper.roi * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">ROI</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
