import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Target,
} from 'lucide-react';
import { Pick } from '@/types';

export const metadata: Metadata = {
  title: 'All Picks',
  description: 'Browse all sports betting picks from top cappers. Filter by sport, date, and capper.',
};

// Mock data
const mockPicks: Pick[] = [
  {
    id: '1', date: '2024-12-23', sport: 'MLB', capper_id: '1', capper_name: 'Dave Price',
    game: 'Yankees vs Red Sox', pick_type: 'ML', pick: 'Yankees ML',
    odds: '-135', units: 2, confidence: 'high', result: 'pending',
    source: 'BetFirm', created_at: new Date().toISOString(),
  },
  {
    id: '2', date: '2024-12-23', sport: 'NFL', capper_id: '4', capper_name: 'Chris Vasile',
    game: 'Bills vs Chiefs', pick_type: 'spread', pick: 'Bills +3.5',
    odds: '-110', units: 1, confidence: 'high', result: 'pending',
    source: 'Covers', created_at: new Date().toISOString(),
  },
  {
    id: '3', date: '2024-12-23', sport: 'MLB', capper_id: '3', capper_name: 'Dimers',
    game: 'Dodgers vs Giants', pick_type: 'over', pick: 'Over 8.5',
    odds: '-110', units: 1, confidence: 'medium', result: 'pending',
    source: 'Dimers', created_at: new Date().toISOString(),
  },
  {
    id: '4', date: '2024-12-23', sport: 'NBA', capper_id: '2', capper_name: 'Jack Jones',
    game: 'Lakers vs Celtics', pick_type: 'under', pick: 'Under 225.5',
    odds: '-108', units: 1, confidence: 'medium', result: 'pending',
    source: 'BetFirm', created_at: new Date().toISOString(),
  },
  {
    id: '5', date: '2024-12-23', sport: 'NFL', capper_id: '1', capper_name: 'Dave Price',
    game: 'Eagles vs Cowboys', pick_type: 'spread', pick: 'Eagles -3',
    odds: '-105', units: 2, confidence: 'high', result: 'pending',
    source: 'BetFirm', created_at: new Date().toISOString(),
  },
  {
    id: '6', date: '2024-12-22', sport: 'MLB', capper_id: '5', capper_name: 'Pure Lock',
    game: 'Mets vs Phillies', pick_type: 'ML', pick: 'Phillies ML',
    odds: '-145', units: 1, confidence: 'standard', result: 'win',
    source: 'BetFirm', created_at: new Date().toISOString(),
  },
  {
    id: '7', date: '2024-12-22', sport: 'NBA', capper_id: '3', capper_name: 'Dimers',
    game: 'Warriors vs Suns', pick_type: 'over', pick: 'Over 228',
    odds: '-112', units: 1, confidence: 'medium', result: 'win',
    source: 'Dimers', created_at: new Date().toISOString(),
  },
  {
    id: '8', date: '2024-12-22', sport: 'NFL', capper_id: '4', capper_name: 'Chris Vasile',
    game: 'Dolphins vs Jets', pick_type: 'ML', pick: 'Dolphins ML',
    odds: '-180', units: 2, confidence: 'high', result: 'loss',
    source: 'Covers', created_at: new Date().toISOString(),
  },
];

export default function PicksPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Group by date
  const picksByDate = mockPicks.reduce((acc, pick) => {
    if (!acc[pick.date]) acc[pick.date] = [];
    acc[pick.date].push(pick);
    return acc;
  }, {} as Record<string, Pick[]>);

  // Calculate stats
  const todayPicks = mockPicks.filter(p => p.date === '2024-12-23');
  const completedPicks = mockPicks.filter(p => p.result !== 'pending');
  const wins = completedPicks.filter(p => p.result === 'win').length;

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Target className="h-5 w-5" />
          <span className="text-sm font-medium">Pick Browser</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          All Picks
        </h1>
        <p className="text-muted-foreground">
          Browse and filter picks from all cappers across all sports
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-primary">{todayPicks.length}</div>
            <div className="text-sm text-muted-foreground">Today&apos;s Picks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{mockPicks.length}</div>
            <div className="text-sm text-muted-foreground">Total This Week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-primary">
              {completedPicks.length > 0 ? ((wins / completedPicks.length) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold">{wins}-{completedPicks.length - wins}</div>
            <div className="text-sm text-muted-foreground">Record</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search picks, games, cappers..." className="pl-10" />
        </div>
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Date Range
        </Button>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Sport Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Sports</TabsTrigger>
          <TabsTrigger value="mlb">MLB</TabsTrigger>
          <TabsTrigger value="nfl">NFL</TabsTrigger>
          <TabsTrigger value="nba">NBA</TabsTrigger>
          <TabsTrigger value="nhl">NHL</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {/* Picks by Date */}
          {Object.entries(picksByDate).map(([date, picks]) => (
            <div key={date} className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
                <Badge variant="outline" className="ml-2">{picks.length} picks</Badge>
              </h2>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sport</TableHead>
                        <TableHead>Game</TableHead>
                        <TableHead>Pick</TableHead>
                        <TableHead className="text-center">Odds</TableHead>
                        <TableHead>Capper</TableHead>
                        <TableHead className="text-center">Confidence</TableHead>
                        <TableHead className="text-center">Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {picks.map((pick) => (
                        <TableRow key={pick.id}>
                          <TableCell>
                            <Badge variant="outline">{pick.sport}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{pick.game}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-semibold">{pick.pick}</span>
                              <div className="text-xs text-muted-foreground">{pick.pick_type.toUpperCase()}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={parseInt(pick.odds || '0') > 0 ? 'text-primary font-semibold' : ''}>
                              {pick.odds}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/cappers/${pick.capper_name?.toLowerCase().replace(' ', '-')}`}
                              className="hover:text-primary"
                            >
                              {pick.capper_name}
                            </Link>
                            <div className="text-xs text-muted-foreground">{pick.source}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                pick.confidence === 'high' ? 'default' :
                                pick.confidence === 'medium' ? 'secondary' : 'outline'
                              }
                              className="text-xs"
                            >
                              {pick.confidence}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                pick.result === 'win' ? 'default' :
                                pick.result === 'loss' ? 'destructive' :
                                pick.result === 'push' ? 'secondary' : 'outline'
                              }
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
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm">1</Button>
            <Button variant="default" size="sm">2</Button>
            <Button variant="outline" size="sm">3</Button>
            <Button variant="outline" size="sm">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* Sport-specific tabs would filter the picks */}
        <TabsContent value="mlb">
          <Card>
            <CardHeader>
              <CardTitle>MLB Picks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">MLB picks filtered view...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nfl">
          <Card>
            <CardHeader>
              <CardTitle>NFL Picks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">NFL picks filtered view...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nba">
          <Card>
            <CardHeader>
              <CardTitle>NBA Picks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">NBA picks filtered view...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nhl">
          <Card>
            <CardHeader>
              <CardTitle>NHL Picks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">NHL picks filtered view...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
