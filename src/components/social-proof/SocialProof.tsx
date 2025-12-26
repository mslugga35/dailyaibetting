'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Flame, Trophy, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stats {
  allTime: { wins: number; losses: number; total: number; winPct: number };
  last30Days: { wins: number; losses: number; total: number; winPct: number };
  streak: { type: string; count: number };
}

interface SocialProofProps {
  variant?: 'banner' | 'card' | 'minimal';
  className?: string;
}

export function SocialProof({ variant = 'banner', className }: SocialProofProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/results?view=stats');
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Fallback stats if no data yet
  const displayStats = stats || {
    allTime: { wins: 0, losses: 0, total: 0, winPct: 0 },
    last30Days: { wins: 0, losses: 0, total: 0, winPct: 0 },
    streak: { type: 'none', count: 0 }
  };

  if (loading) {
    return null; // Don't show loading state, just hide
  }

  if (displayStats.allTime.total === 0) {
    // No data yet - show teaser
    return (
      <div className={cn(
        "bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-lg p-4",
        className
      )}>
        <div className="flex items-center gap-2 text-emerald-400">
          <Flame className="h-5 w-5" />
          <span className="font-semibold">Tracking consensus picks - results coming soon!</span>
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-4 text-sm", className)}>
        <div className="flex items-center gap-1 text-emerald-400">
          <Trophy className="h-4 w-4" />
          <span className="font-bold">{displayStats.last30Days.winPct}%</span>
          <span className="text-muted-foreground">win rate</span>
        </div>
        <div className="text-muted-foreground">
          {displayStats.last30Days.wins}W - {displayStats.last30Days.losses}L (30 days)
        </div>
        {displayStats.streak.count >= 3 && (
          <div className={cn(
            "flex items-center gap-1",
            displayStats.streak.type === 'winning' ? 'text-emerald-400' : 'text-red-400'
          )}>
            <TrendingUp className="h-4 w-4" />
            {displayStats.streak.count} {displayStats.streak.type === 'winning' ? 'W' : 'L'} streak
          </div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn(
        "bg-card border rounded-xl p-6 space-y-4",
        className
      )}>
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-400" />
          Fire Pick Performance
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
            <div className="text-3xl font-bold text-emerald-400">
              {displayStats.last30Days.winPct}%
            </div>
            <div className="text-sm text-muted-foreground">30-Day Win Rate</div>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-3xl font-bold">
              {displayStats.last30Days.wins}-{displayStats.last30Days.losses}
            </div>
            <div className="text-sm text-muted-foreground">W-L Record</div>
          </div>
        </div>

        {displayStats.streak.count >= 2 && (
          <div className={cn(
            "text-center py-2 rounded-lg",
            displayStats.streak.type === 'winning'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          )}>
            <span className="font-semibold">
              {displayStats.streak.type === 'winning' ? '🔥' : '❄️'}{' '}
              {displayStats.streak.count} game {displayStats.streak.type} streak
            </span>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          All-time: {displayStats.allTime.wins}W - {displayStats.allTime.losses}L ({displayStats.allTime.winPct}%)
        </div>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <div className={cn(
      "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent",
      "border-l-4 border-emerald-500 rounded-r-lg px-4 py-3",
      className
    )}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold text-emerald-400">Fire Picks</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="font-bold text-lg">{displayStats.last30Days.winPct}%</span>
              <span className="text-muted-foreground ml-1">win rate</span>
            </div>
            <div className="text-muted-foreground">
              {displayStats.last30Days.wins}W - {displayStats.last30Days.losses}L
              <span className="ml-1">(30 days)</span>
            </div>
          </div>
        </div>

        {displayStats.streak.count >= 3 && (
          <div className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            displayStats.streak.type === 'winning'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          )}>
            {displayStats.streak.type === 'winning' ? '🔥' : ''}{' '}
            {displayStats.streak.count} game {displayStats.streak.type} streak
          </div>
        )}
      </div>
    </div>
  );
}

// Standalone stat badges for use anywhere
export function WinRateBadge({ className }: { className?: string }) {
  const [winPct, setWinPct] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/results?view=stats')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.last30Days?.winPct) {
          setWinPct(data.data.last30Days.winPct);
        }
      })
      .catch(() => {});
  }, []);

  if (winPct === null) return null;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      "bg-emerald-500/20 text-emerald-400",
      className
    )}>
      <Trophy className="h-3 w-3" />
      {winPct}% Win Rate
    </span>
  );
}
