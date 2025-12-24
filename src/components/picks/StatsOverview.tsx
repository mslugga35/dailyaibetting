'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Target, Users, Percent, Flame, DollarSign } from 'lucide-react';
import { DailyStats } from '@/types';

interface StatsOverviewProps {
  stats: DailyStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const statCards = [
    {
      label: "Today's Picks",
      value: stats.total_picks,
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Win Rate',
      value: `${(stats.win_rate * 100).toFixed(1)}%`,
      icon: Percent,
      color: stats.win_rate >= 0.5 ? 'text-primary' : 'text-destructive',
      bgColor: stats.win_rate >= 0.5 ? 'bg-primary/10' : 'bg-destructive/10',
    },
    {
      label: 'Record',
      value: `${stats.wins}-${stats.losses}${stats.pushes > 0 ? `-${stats.pushes}` : ''}`,
      icon: Flame,
      color: stats.wins > stats.losses ? 'text-primary' : 'text-destructive',
      bgColor: stats.wins > stats.losses ? 'bg-primary/10' : 'bg-destructive/10',
    },
    {
      label: 'Units',
      value: `${stats.units >= 0 ? '+' : ''}${stats.units.toFixed(1)}u`,
      icon: DollarSign,
      color: stats.units >= 0 ? 'text-primary' : 'text-destructive',
      bgColor: stats.units >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
    },
    {
      label: 'Consensus',
      value: stats.consensus_picks,
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Consensus Wins',
      value: stats.consensus_wins,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
