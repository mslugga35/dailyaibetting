'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Target, Trophy, TrendingUp, Flame, BarChart3 } from 'lucide-react';
import { ConfidenceBadge, getConfidenceInfo, getConfidenceTier, type ConfidenceTier } from '@/components/ConfidenceBadge';

interface GradedPick {
  id: string;
  sport: string;
  pick: string;
  capper_count: number;
  result: 'win' | 'loss' | 'push' | 'pending';
  date: string;
}

interface TierStats {
  tier: ConfidenceTier;
  wins: number;
  losses: number;
  pushes: number;
  totalPicks: number;
  winRate: number;
  unitsWon: number;
  roi: number;
}

interface SportStats {
  sport: string;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
}

type TimeFilter = '7d' | '30d' | 'all';

export default function StatsPage() {
  const [picks, setPicks] = useState<GradedPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const days = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 365;
        const res = await fetch(`/api/results?view=recent&limit=1000&days=${days}`);
        const data = await res.json();
        
        if (data.data) {
          // Map to our format
          const gradedPicks: GradedPick[] = data.data
            .filter((p: any) => ['WIN', 'LOSS', 'PUSH', 'win', 'loss', 'push'].includes(p.result))
            .map((p: any) => ({
              id: p.id,
              sport: p.sport,
              pick: p.team || p.pick,
              capper_count: p.capper_count || 2,
              result: p.result.toLowerCase() as 'win' | 'loss' | 'push',
              date: p.pick_date || p.date,
            }));
          setPicks(gradedPicks);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timeFilter]);

  // Calculate tier stats
  const tierStats = useMemo((): TierStats[] => {
    const tiers: Record<ConfidenceTier, TierStats> = {
      lock: { tier: 'lock', wins: 0, losses: 0, pushes: 0, totalPicks: 0, winRate: 0, unitsWon: 0, roi: 0 },
      strong: { tier: 'strong', wins: 0, losses: 0, pushes: 0, totalPicks: 0, winRate: 0, unitsWon: 0, roi: 0 },
      lean: { tier: 'lean', wins: 0, losses: 0, pushes: 0, totalPicks: 0, winRate: 0, unitsWon: 0, roi: 0 },
      none: { tier: 'none', wins: 0, losses: 0, pushes: 0, totalPicks: 0, winRate: 0, unitsWon: 0, roi: 0 },
    };

    for (const pick of picks) {
      const tier = getConfidenceTier(pick.capper_count);
      if (tier === 'none') continue;

      tiers[tier].totalPicks++;
      if (pick.result === 'win') tiers[tier].wins++;
      else if (pick.result === 'loss') tiers[tier].losses++;
      else if (pick.result === 'push') tiers[tier].pushes++;
    }

    // Calculate derived stats
    for (const tier of Object.values(tiers)) {
      const decisions = tier.wins + tier.losses;
      tier.winRate = decisions > 0 ? Math.round((tier.wins / decisions) * 100) : 0;
      // Assume -110 odds: win = 0.91 units, loss = -1 unit
      tier.unitsWon = parseFloat((tier.wins * 0.91 - tier.losses).toFixed(2));
      tier.roi = tier.totalPicks > 0 ? Math.round((tier.unitsWon / tier.totalPicks) * 100) : 0;
    }

    return [tiers.lock, tiers.strong, tiers.lean].filter(t => t.totalPicks > 0 || true);
  }, [picks]);

  // Calculate sport stats
  const sportStats = useMemo((): SportStats[] => {
    const sports: Record<string, SportStats> = {};

    for (const pick of picks) {
      if (!sports[pick.sport]) {
        sports[pick.sport] = { sport: pick.sport, wins: 0, losses: 0, pushes: 0, winRate: 0 };
      }
      if (pick.result === 'win') sports[pick.sport].wins++;
      else if (pick.result === 'loss') sports[pick.sport].losses++;
      else if (pick.result === 'push') sports[pick.sport].pushes++;
    }

    for (const stat of Object.values(sports)) {
      const decisions = stat.wins + stat.losses;
      stat.winRate = decisions > 0 ? Math.round((stat.wins / decisions) * 100) : 0;
    }

    return Object.values(sports).sort((a, b) => b.winRate - a.winRate);
  }, [picks]);

  // Overall stats
  const totalWins = picks.filter(p => p.result === 'win').length;
  const totalLosses = picks.filter(p => p.result === 'loss').length;
  const totalPushes = picks.filter(p => p.result === 'push').length;
  const overallWinRate = (totalWins + totalLosses) > 0 
    ? Math.round((totalWins / (totalWins + totalLosses)) * 100) 
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Target className="w-8 h-8 text-primary" />
          Consensus Performance
        </h1>
        <p className="text-muted-foreground">
          Track how our consensus picks perform across different confidence levels.
        </p>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2 mb-8">
        {([
          { value: '7d', label: '7 Days' },
          { value: '30d', label: '30 Days' },
          { value: 'all', label: 'All Time' },
        ] as const).map((filter) => (
          <Button
            key={filter.value}
            variant={timeFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading stats...</span>
        </div>
      ) : (
        <>
          {/* Overall Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{picks.length}</div>
                <div className="text-xs text-muted-foreground">Total Picks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-emerald-400">{totalWins}</div>
                <div className="text-xs text-muted-foreground">Wins</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-red-400">{totalLosses}</div>
                <div className="text-xs text-muted-foreground">Losses</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-3xl font-bold ${overallWinRate >= 52 ? 'text-emerald-400' : overallWinRate < 48 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {overallWinRate}%
                </div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Tier Stats */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Performance by Confidence Tier
            </h2>
            
            {tierStats.some(t => t.totalPicks > 0) ? (
              <div className="grid md:grid-cols-3 gap-4">
                {tierStats.map((stats) => {
                  const info = getConfidenceInfo(stats.tier);
                  const isProfit = stats.unitsWon > 0;

                  return (
                    <Card key={stats.tier}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{info.emoji}</span>
                            <div>
                              <h3 className="font-bold text-lg">{info.label}</h3>
                              <p className="text-xs text-muted-foreground">{info.description}</p>
                            </div>
                          </div>
                          <Badge variant={isProfit ? 'default' : 'destructive'}>
                            {isProfit ? '+' : ''}{stats.unitsWon.toFixed(1)}u
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-emerald-400">{stats.wins}</div>
                            <div className="text-xs text-muted-foreground">Wins</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-red-400">{stats.losses}</div>
                            <div className="text-xs text-muted-foreground">Losses</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-muted-foreground">{stats.pushes}</div>
                            <div className="text-xs text-muted-foreground">Pushes</div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Win Rate</span>
                            <span className="font-semibold">{stats.winRate}%</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">ROI</span>
                            <span className={`font-semibold ${stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {stats.roi >= 0 ? '+' : ''}{stats.roi}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p>No graded picks yet. Tier stats will appear after games are graded.</p>
                  <p className="text-sm mt-2">Picks are auto-graded after games complete.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sport Breakdown */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Performance by Sport
            </h2>

            {sportStats.length > 0 ? (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {sportStats.map((stat) => (
                      <div key={stat.sport} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{stat.sport}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {stat.wins}-{stat.losses}{stat.pushes > 0 ? `-${stat.pushes}` : ''}
                          </span>
                        </div>
                        <div className={`font-bold ${stat.winRate >= 55 ? 'text-emerald-400' : stat.winRate < 48 ? 'text-red-400' : 'text-yellow-400'}`}>
                          {stat.winRate}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No sport data available yet.
                </CardContent>
              </Card>
            )}
          </div>

          {/* Legend */}
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                About Confidence Tiers
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>💎 Locks (4+ cappers)</strong> - Highest conviction plays with strongest consensus</li>
                <li>• <strong>🔥 Strong (3 cappers)</strong> - Solid agreement among multiple cappers</li>
                <li>• <strong>📍 Lean (2 cappers)</strong> - Slight edge when two cappers align</li>
                <li>• ROI calculated at -110 odds (standard juice)</li>
                <li>• Stats update automatically after games complete</li>
              </ul>
            </CardContent>
          </Card>

          {/* Quick Links */}
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
                  <Link href="/history">Pick History</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/games">Today&apos;s Games</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
