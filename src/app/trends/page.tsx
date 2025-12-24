import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Flame,
  BarChart3,
  Target,
  Users,
  Calendar,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Trends & Insights',
  description: 'AI-detected betting trends, hot streaks, and market insights. Stay ahead with data-driven analysis.',
};

// Mock trends data
const hotTrends = [
  {
    id: '1',
    type: 'sport',
    title: 'Home Underdogs Dominating in MLB',
    description: 'Home underdogs are 14-6 (70%) over the last 2 weeks. Consider fading road favorites.',
    record: '14-6',
    winRate: 70,
    sport: 'MLB',
    direction: 'up',
  },
  {
    id: '2',
    type: 'capper',
    title: 'Quinn Allen on Fire',
    description: '6-game win streak with +8.2 units profit. Hot on NFL spreads.',
    record: '6-0',
    winRate: 100,
    sport: 'NFL',
    direction: 'up',
  },
  {
    id: '3',
    type: 'consensus',
    title: 'Consensus Picks Hitting at 67%',
    description: '3+ capper agreement picks hitting at elevated rate this month.',
    record: '32-16',
    winRate: 67,
    sport: 'ALL',
    direction: 'up',
  },
  {
    id: '4',
    type: 'sport',
    title: 'Unders Crushing in NBA',
    description: 'Under bets hitting at 62% in last 10 days. Pace slowing league-wide.',
    record: '18-11',
    winRate: 62,
    sport: 'NBA',
    direction: 'up',
  },
];

const coldTrends = [
  {
    id: '5',
    type: 'sport',
    title: 'NFL Favorites Struggling ATS',
    description: 'Road favorites are 3-9 (25%) ATS this week. Public overvaluing top teams.',
    record: '3-9',
    winRate: 25,
    sport: 'NFL',
    direction: 'down',
  },
  {
    id: '6',
    type: 'capper',
    title: 'Matt Fargo Slumping',
    description: '2-game losing streak after strong September. Consider fading temporarily.',
    record: '0-2',
    winRate: 0,
    sport: 'MLB',
    direction: 'down',
  },
];

const capperStreaks = [
  { name: 'Quinn Allen', streak: 6, type: 'W', sport: 'NFL', units: '+8.2' },
  { name: 'Dave Price', streak: 5, type: 'W', sport: 'MLB', units: '+6.5' },
  { name: 'Chris Vasile', streak: 4, type: 'W', sport: 'NFL', units: '+5.1' },
  { name: 'Jack Jones', streak: 3, type: 'W', sport: 'NBA', units: '+3.8' },
];

export default function TrendsPage() {
  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary mb-2">
          <TrendingUp className="h-5 w-5" />
          <span className="text-sm font-medium">AI Insights</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Trends & Insights
        </h1>
        <p className="text-muted-foreground">
          AI-detected betting trends, hot streaks, and actionable market insights
        </p>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{hotTrends.length}</div>
                <div className="text-sm text-muted-foreground">Hot Trends</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{capperStreaks.length}</div>
                <div className="text-sm text-muted-foreground">Cappers Streaking</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold text-primary">67%</div>
                <div className="text-sm text-muted-foreground">Consensus Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">12</div>
                <div className="text-sm text-muted-foreground">Days Analyzed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Trends */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hot Trends */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Hot Trends
            </h2>
            <div className="space-y-4">
              {hotTrends.map((trend) => (
                <Card key={trend.id} className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <ArrowUp className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{trend.sport}</Badge>
                          <Badge className="bg-primary">{trend.record}</Badge>
                        </div>
                        <h3 className="font-semibold mb-1">{trend.title}</h3>
                        <p className="text-sm text-muted-foreground">{trend.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{trend.winRate}%</div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cold Trends */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Cold Trends (Fade These)
            </h2>
            <div className="space-y-4">
              {coldTrends.map((trend) => (
                <Card key={trend.id} className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-destructive/20">
                        <ArrowDown className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{trend.sport}</Badge>
                          <Badge variant="destructive">{trend.record}</Badge>
                        </div>
                        <h3 className="font-semibold mb-1">{trend.title}</h3>
                        <p className="text-sm text-muted-foreground">{trend.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-destructive">{trend.winRate}%</div>
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Capper Hot Streaks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flame className="h-5 w-5 text-orange-500" />
                Capper Hot Streaks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {capperStreaks.map((capper, index) => (
                <div key={capper.name}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                      <div>
                        <div className="font-medium">{capper.name}</div>
                        <div className="text-xs text-muted-foreground">{capper.sport}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-orange-500">
                        {capper.streak}{capper.type}
                      </Badge>
                      <div className="text-xs text-primary mt-1">{capper.units}u</div>
                    </div>
                  </div>
                  {index < capperStreaks.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sport Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Sport Performance (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { sport: 'MLB', winRate: 0.62, record: '31-19' },
                { sport: 'NFL', winRate: 0.58, record: '22-16' },
                { sport: 'NBA', winRate: 0.55, record: '18-15' },
                { sport: 'NHL', winRate: 0.52, record: '12-11' },
              ].map((item) => (
                <div key={item.sport}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{item.sport}</span>
                    <span className="text-sm">
                      {item.record} ({(item.winRate * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.winRate >= 0.55 ? 'bg-primary' : 'bg-muted-foreground'
                      }`}
                      style={{ width: `${item.winRate * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Tips Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-primary/10 text-sm">
                <span className="font-medium">Follow the home underdogs</span>
                <span className="text-muted-foreground"> in MLB afternoon games.</span>
              </div>
              <div className="p-3 rounded-lg bg-accent/10 text-sm">
                <span className="font-medium">Fade road favorites</span>
                <span className="text-muted-foreground"> in NFL primetime.</span>
              </div>
              <div className="p-3 rounded-lg bg-muted text-sm">
                <span className="font-medium">Quinn Allen</span>
                <span className="text-muted-foreground"> picks worth tailing this week.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
