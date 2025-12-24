import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, TrendingUp, TrendingDown, Trophy, Flame, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Capper } from '@/types';

export const metadata: Metadata = {
  title: 'Capper Rankings',
  description: 'Track and compare professional sports cappers by win rate, units, and ROI. Find the best betting experts.',
};

// Mock data - replace with Supabase query
const mockCappers: Capper[] = [
  {
    id: '1', name: 'Dave Price', slug: 'dave-price', source: 'BetFirm',
    total_picks: 245, wins: 142, losses: 95, pushes: 8, win_rate: 0.599,
    total_units: 34.5, roi: 0.141, specialties: ['MLB', 'NFL'],
    streak: 5, streak_type: 'W', created_at: '', updated_at: '',
  },
  {
    id: '2', name: 'Jack Jones', slug: 'jack-jones', source: 'BetFirm',
    total_picks: 198, wins: 112, losses: 82, pushes: 4, win_rate: 0.577,
    total_units: 28.2, roi: 0.142, specialties: ['MLB', 'NBA'],
    streak: 3, streak_type: 'W', created_at: '', updated_at: '',
  },
  {
    id: '3', name: 'Dimers', slug: 'dimers', source: 'Dimers',
    total_picks: 512, wins: 280, losses: 220, pushes: 12, win_rate: 0.560,
    total_units: 42.1, roi: 0.082, specialties: ['MLB', 'NFL', 'NBA'],
    created_at: '', updated_at: '',
  },
  {
    id: '4', name: 'Chris Vasile', slug: 'chris-vasile', source: 'Covers',
    total_picks: 167, wins: 95, losses: 68, pushes: 4, win_rate: 0.583,
    total_units: 22.8, roi: 0.137, specialties: ['NFL', 'NCAAF'],
    streak: 4, streak_type: 'W', created_at: '', updated_at: '',
  },
  {
    id: '5', name: 'Pure Lock', slug: 'pure-lock', source: 'BetFirm',
    total_picks: 134, wins: 72, losses: 58, pushes: 4, win_rate: 0.554,
    total_units: 15.6, roi: 0.116, specialties: ['MLB'],
    created_at: '', updated_at: '',
  },
  {
    id: '6', name: 'Matt Fargo', slug: 'matt-fargo', source: 'BetFirm',
    total_picks: 189, wins: 102, losses: 81, pushes: 6, win_rate: 0.557,
    total_units: 18.4, roi: 0.097, specialties: ['MLB', 'NFL'],
    streak: 2, streak_type: 'L', created_at: '', updated_at: '',
  },
  {
    id: '7', name: 'Quinn Allen', slug: 'quinn-allen', source: 'Covers',
    total_picks: 145, wins: 82, losses: 59, pushes: 4, win_rate: 0.582,
    total_units: 19.7, roi: 0.136, specialties: ['NFL', 'NBA'],
    streak: 6, streak_type: 'W', created_at: '', updated_at: '',
  },
  {
    id: '8', name: 'SportsLine', slug: 'sportsline', source: 'SportsLine',
    total_picks: 423, wins: 225, losses: 188, pushes: 10, win_rate: 0.545,
    total_units: 28.9, roi: 0.068, specialties: ['MLB', 'NFL', 'NBA', 'NHL'],
    created_at: '', updated_at: '',
  },
];

// Sort by win rate
const sortedCappers = [...mockCappers].sort((a, b) => b.win_rate - a.win_rate);

export default function CappersPage() {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <span className="text-lg font-bold text-gray-400">2</span>;
    if (rank === 3) return <span className="text-lg font-bold text-amber-600">3</span>;
    return <span className="text-lg text-muted-foreground">{rank}</span>;
  };

  // Calculate totals
  const totalPicks = mockCappers.reduce((a, c) => a + c.total_picks, 0);
  const avgWinRate = mockCappers.reduce((a, c) => a + c.win_rate, 0) / mockCappers.length;
  const topStreak = Math.max(...mockCappers.filter(c => c.streak_type === 'W').map(c => c.streak || 0));

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Users className="h-5 w-5" />
          <span className="text-sm font-medium">Capper Directory</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Capper Rankings
        </h1>
        <p className="text-muted-foreground">
          Track and compare {mockCappers.length} professional cappers by performance metrics
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-primary">{mockCappers.length}</div>
            <div className="text-sm text-muted-foreground">Active Cappers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{totalPicks.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Picks Tracked</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-primary">
              {(avgWinRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Avg Win Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold flex items-center gap-1">
              <Flame className="h-6 w-6 text-orange-500" />
              {topStreak}W
            </div>
            <div className="text-sm text-muted-foreground">Best Streak</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search cappers..." className="pl-10" />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter by Sport
        </Button>
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Capper</TableHead>
                <TableHead className="text-center">Record</TableHead>
                <TableHead className="text-center">Win Rate</TableHead>
                <TableHead className="text-center">Units</TableHead>
                <TableHead className="text-center">ROI</TableHead>
                <TableHead className="text-center">Streak</TableHead>
                <TableHead className="text-right">Sports</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCappers.map((capper, index) => (
                <TableRow key={capper.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankBadge(index + 1)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/cappers/${capper.slug}`} className="flex items-center gap-3 hover:opacity-80">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {capper.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{capper.name}</div>
                        <div className="text-xs text-muted-foreground">{capper.source}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{capper.wins}-{capper.losses}</span>
                    {capper.pushes > 0 && (
                      <span className="text-muted-foreground">-{capper.pushes}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${capper.win_rate >= 0.55 ? 'text-primary' : ''}`}>
                      {(capper.win_rate * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold flex items-center justify-center gap-1 ${
                      capper.total_units >= 0 ? 'text-primary' : 'text-destructive'
                    }`}>
                      {capper.total_units >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {capper.total_units >= 0 ? '+' : ''}{capper.total_units.toFixed(1)}u
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${
                      capper.roi >= 0 ? 'text-primary' : 'text-destructive'
                    }`}>
                      {capper.roi >= 0 ? '+' : ''}{(capper.roi * 100).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {capper.streak && capper.streak > 0 ? (
                      <Badge
                        variant={capper.streak_type === 'W' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {capper.streak}{capper.streak_type}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {capper.specialties.slice(0, 3).map((sport) => (
                        <Badge key={sport} variant="outline" className="text-xs">
                          {sport}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hot Cappers */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Hot Cappers (3+ Win Streak)
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {sortedCappers
            .filter(c => c.streak && c.streak >= 3 && c.streak_type === 'W')
            .map((capper) => (
              <Card key={capper.id} className="border-orange-500/30 bg-orange-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-orange-500/20 text-orange-500 font-bold">
                        {capper.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{capper.name}</div>
                      <div className="text-sm text-muted-foreground">{capper.source}</div>
                    </div>
                    <Badge className="bg-orange-500">
                      <Flame className="h-3 w-3 mr-1" />
                      {capper.streak}W
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>{(capper.win_rate * 100).toFixed(1)}% Win Rate</span>
                    <span className="text-primary">+{capper.total_units.toFixed(1)}u</span>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
