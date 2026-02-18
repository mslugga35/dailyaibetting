'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Crown } from 'lucide-react';
import Link from 'next/link';
import type { ConsensusPick, YesterdayStats } from '@/types';

interface YesterdayResultsProps {
  consensus: ConsensusPick[];
  stats: YesterdayStats;
  date: string;
  bySport: Record<string, ConsensusPick[]>;
}

function getResultBadge(result: 'W' | 'L' | 'P' | null | undefined) {
  if (result === 'W') return <Badge className="bg-emerald-600 text-white">W</Badge>;
  if (result === 'L') return <Badge variant="destructive">L</Badge>;
  if (result === 'P') return <Badge variant="outline">P</Badge>;
  return <Badge variant="secondary">TBD</Badge>;
}

function getFireEmoji(count: number): string {
  if (count >= 10) return ' \u{1F525}\u{1F525}\u{1F525}';
  if (count >= 3) return ' \u{1F525}';
  return '';
}

const SPORT_ORDER = ['NCAAF', 'NCAAB', 'NFL', 'NBA', 'NHL', 'MLB', 'WNBA'];

export function YesterdayResults({ consensus, stats, date, bySport }: YesterdayResultsProps) {
  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const sortedSports = Object.keys(bySport)
    .filter(s => bySport[s]?.length > 0)
    .sort((a, b) => {
      const aIdx = SPORT_ORDER.indexOf(a);
      const bIdx = SPORT_ORDER.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

  return (
    <div className="space-y-6">
      {/* Win Rate Stats */}
      {stats.totalGraded > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-emerald-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{stats.winRate}%</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.wins}W - {stats.losses}L{stats.pushes > 0 ? ` - ${stats.pushes}P` : ''}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold">{stats.totalGraded}</div>
              <div className="text-sm text-muted-foreground">Graded Picks</div>
            </CardContent>
          </Card>
          {stats.fireTotal > 0 && (
            <Card className="border-orange-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-orange-400">{stats.fireWinRate}%</div>
                <div className="text-sm text-muted-foreground">Fire Win Rate</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.fireWins}W - {stats.fireLosses}L
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold">{consensus.length}</div>
              <div className="text-sm text-muted-foreground">Total Consensus</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results by Sport */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-400" />
            Results — {formattedDate}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consensus.length > 0 ? (
            <div className="space-y-6">
              {/* Top Picks */}
              <div>
                <h3 className="font-bold text-primary mb-3">TOP CONSENSUS</h3>
                <div className="space-y-2">
                  {consensus.slice(0, 6).map((pick, i) => (
                    <div key={pick.id || i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className={`font-mono text-sm ${pick.result === 'W' ? 'text-emerald-400' : pick.result === 'L' ? 'text-red-400' : ''}`}>
                        {pick.bet} — {pick.capperCount} cappers{getFireEmoji(pick.capperCount)}
                      </span>
                      {getResultBadge(pick.result)}
                    </div>
                  ))}
                </div>
              </div>

              {/* By Sport */}
              {sortedSports.map(sport => {
                const picks = bySport[sport] || [];
                return (
                  <div key={sport}>
                    <h3 className="font-bold text-accent mb-3">{sport}</h3>
                    <div className="space-y-2">
                      {picks.slice(0, 5).map((pick, i) => (
                        <div key={pick.id || i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                          <span className={`font-mono text-sm ${pick.result === 'W' ? 'text-emerald-400' : pick.result === 'L' ? 'text-red-400' : ''}`}>
                            {pick.bet} — {pick.capperCount} cappers{getFireEmoji(pick.capperCount)}
                          </span>
                          {getResultBadge(pick.result)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No consensus picks from yesterday.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pro CTA */}
      <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-900/20 to-blue-900/20">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold">Want full pick history and capper grades?</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            HiddenBag Pro tracks 200+ cappers with W/L records, ROI, and 30-day history.
          </p>
          <Link
            href="https://thehiddenbag.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            <Crown className="h-4 w-4" />
            See Full History in Pro
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
