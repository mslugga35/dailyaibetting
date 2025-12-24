import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  Calendar,
  Trophy,
  BarChart3,
} from 'lucide-react';
import { Capper, Pick } from '@/types';

// Generate metadata
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return {
    title: `${name} - Capper Profile`,
    description: `View ${name}'s betting picks, win rate, ROI, and performance history. Track their latest picks and trends.`,
  };
}

// Mock capper data
const mockCapper: Capper = {
  id: '1',
  name: 'Dave Price',
  slug: 'dave-price',
  source: 'BetFirm',
  total_picks: 245,
  wins: 142,
  losses: 95,
  pushes: 8,
  win_rate: 0.599,
  total_units: 34.5,
  roi: 0.141,
  specialties: ['MLB', 'NFL'],
  streak: 5,
  streak_type: 'W',
  created_at: '2024-01-01',
  updated_at: new Date().toISOString(),
};

// Mock recent picks
const mockRecentPicks: Pick[] = [
  {
    id: '1', date: '2024-12-23', sport: 'MLB', capper_id: '1',
    game: 'Yankees vs Red Sox', pick_type: 'ML', pick: 'Yankees ML',
    odds: '-135', units: 2, confidence: 'high', result: 'win',
    source: 'BetFirm', created_at: new Date().toISOString(),
  },
  {
    id: '2', date: '2024-12-22', sport: 'NFL', capper_id: '1',
    game: 'Bills vs Chiefs', pick_type: 'spread', pick: 'Bills +3.5',
    odds: '-110', units: 1, confidence: 'medium', result: 'win',
    source: 'BetFirm', created_at: new Date().toISOString(),
  },
  {
    id: '3', date: '2024-12-22', sport: 'MLB', capper_id: '1',
    game: 'Dodgers vs Giants', pick_type: 'over', pick: 'Over 8.5',
    odds: '-110', units: 1, confidence: 'standard', result: 'win',
    source: 'BetFirm', created_at: new Date().toISOString(),
  },
  {
    id: '4', date: '2024-12-21', sport: 'MLB', capper_id: '1',
    game: 'Mets vs Phillies', pick_type: 'ML', pick: 'Phillies ML',
    odds: '-150', units: 2, confidence: 'high', result: 'win',
    source: 'BetFirm', created_at: new Date().toISOString(),
  },
  {
    id: '5', date: '2024-12-21', sport: 'NFL', capper_id: '1',
    game: 'Cowboys vs Eagles', pick_type: 'spread', pick: 'Eagles -3',
    odds: '-105', units: 1, confidence: 'medium', result: 'win',
    source: 'BetFirm', created_at: new Date().toISOString(),
  },
  {
    id: '6', date: '2024-12-20', sport: 'MLB', capper_id: '1',
    game: 'Cubs vs Cardinals', pick_type: 'under', pick: 'Under 8',
    odds: '-115', units: 1, confidence: 'standard', result: 'loss',
    source: 'BetFirm', created_at: new Date().toISOString(),
  },
];

export default async function CapperProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // In production, fetch capper by slug from Supabase
  const capper = mockCapper;
  const recentPicks = mockRecentPicks;

  // Calculate sport breakdown
  const sportBreakdown = recentPicks.reduce((acc, pick) => {
    if (!acc[pick.sport]) acc[pick.sport] = { total: 0, wins: 0 };
    acc[pick.sport].total++;
    if (pick.result === 'win') acc[pick.sport].wins++;
    return acc;
  }, {} as Record<string, { total: number; wins: number }>);

  return (
    <div className="container px-4 py-8">
      {/* Back Button */}
      <Link
        href="/cappers"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Rankings
      </Link>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <Avatar className="h-24 w-24 md:h-32 md:w-32">
          <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
            {capper.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{capper.name}</h1>
            {capper.streak && capper.streak >= 3 && (
              <Badge className={capper.streak_type === 'W' ? 'bg-primary' : 'bg-destructive'}>
                <Flame className="h-3 w-3 mr-1" />
                {capper.streak}{capper.streak_type} Streak
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mb-4">
            Professional capper from {capper.source} specializing in{' '}
            {capper.specialties.join(', ')}
          </p>
          <div className="flex flex-wrap gap-2">
            {capper.specialties.map((sport) => (
              <Badge key={sport} variant="outline">{sport}</Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button>
            <Target className="h-4 w-4 mr-2" />
            Follow Picks
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">{capper.total_picks}</div>
            <div className="text-sm text-muted-foreground">Total Picks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">
              {capper.wins}-{capper.losses}
            </div>
            <div className="text-sm text-muted-foreground">Record</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${capper.win_rate >= 0.55 ? 'text-primary' : ''}`}>
              {(capper.win_rate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold flex items-center justify-center gap-1 ${
              capper.total_units >= 0 ? 'text-primary' : 'text-destructive'
            }`}>
              {capper.total_units >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {capper.total_units >= 0 ? '+' : ''}{capper.total_units.toFixed(1)}u
            </div>
            <div className="text-sm text-muted-foreground">Units</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${capper.roi >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {capper.roi >= 0 ? '+' : ''}{(capper.roi * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">ROI</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold flex items-center justify-center gap-1">
              <Trophy className="h-5 w-5 text-yellow-500" />
              #3
            </div>
            <div className="text-sm text-muted-foreground">Ranking</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Picks */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Picks
              </CardTitle>
              <Button variant="outline" size="sm">View All</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Pick</TableHead>
                    <TableHead className="text-center">Odds</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPicks.map((pick) => (
                    <TableRow key={pick.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(pick.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{pick.sport}</Badge>
                          <span className="font-medium">{pick.game}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{pick.pick}</TableCell>
                      <TableCell className="text-center">{pick.odds}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={pick.result === 'win' ? 'default' : pick.result === 'loss' ? 'destructive' : 'secondary'}
                        >
                          {pick.result.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sport Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Sport Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(sportBreakdown).map(([sport, stats]) => (
                <div key={sport}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{sport}</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.wins}/{stats.total} ({((stats.wins / stats.total) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(stats.wins / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Facts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium">{capper.source}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Units/Pick</span>
                <span className="font-medium">1.5u</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Best Month</span>
                <span className="font-medium text-primary">+12.4u (Sep)</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consensus Rate</span>
                <span className="font-medium">68%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
