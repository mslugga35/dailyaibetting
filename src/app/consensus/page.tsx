import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConsensusCard } from '@/components/picks/ConsensusCard';
import { Target, Filter, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { Consensus } from '@/types';

export const metadata: Metadata = {
  title: 'Consensus Picks',
  description: 'Daily consensus picks where 3+ expert cappers agree. AI-analyzed betting picks with confidence scores.',
};

// Mock data - replace with Supabase query
const mockConsensus: Consensus[] = [
  {
    id: '1',
    date: new Date().toISOString().split('T')[0],
    sport: 'NFL',
    game: 'Chiefs vs Bills',
    game_time: '4:25 PM ET',
    pick: 'Bills +3.5',
    pick_type: 'spread',
    capper_count: 6,
    cappers: ['Chris Vasile', 'Quinn Allen', 'Neil Parker', 'Dave Price', 'Jack Jones', 'Expert Picks'],
    avg_odds: '-105',
    confidence_score: 0.91,
    ai_analysis: 'Highest confidence pick of the day. Bills at home, getting points against a banged-up Chiefs defense. Josh Allen averages 285 passing yards in divisional games.',
    result: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    date: new Date().toISOString().split('T')[0],
    sport: 'MLB',
    game: 'Yankees vs Red Sox',
    game_time: '7:10 PM ET',
    pick: 'Yankees ML',
    pick_type: 'ML',
    capper_count: 5,
    cappers: ['Dave Price', 'Jack Jones', 'Matt Fargo', 'Timothy Black', 'Calvin King'],
    avg_odds: '-135',
    confidence_score: 0.87,
    ai_analysis: 'Strong consensus with 5 cappers agreeing. Yankees have won 7 of last 10 against Red Sox. Home field advantage and Cole on the mound adds value.',
    result: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    date: new Date().toISOString().split('T')[0],
    sport: 'MLB',
    game: 'Dodgers vs Giants',
    game_time: '10:15 PM ET',
    pick: 'Over 8.5',
    pick_type: 'over',
    capper_count: 4,
    cappers: ['Dimers', 'Pure Lock', 'Mikey Sports', 'Brandon Lee'],
    avg_odds: '-110',
    confidence_score: 0.72,
    ai_analysis: 'Both offenses have been hot. Last 5 meetings averaged 11.2 runs. Bullpens tired after series.',
    result: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    date: new Date().toISOString().split('T')[0],
    sport: 'NBA',
    game: 'Lakers vs Celtics',
    game_time: '8:30 PM ET',
    pick: 'Under 225.5',
    pick_type: 'under',
    capper_count: 3,
    cappers: ['Dimers', 'SportsLine', 'Covers Expert'],
    avg_odds: '-108',
    confidence_score: 0.65,
    ai_analysis: 'Both teams playing back-to-back. Slower pace expected. Last 3 matchups have gone under.',
    result: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    date: new Date().toISOString().split('T')[0],
    sport: 'NFL',
    game: 'Eagles vs Cowboys',
    game_time: '8:20 PM ET',
    pick: 'Eagles -3',
    pick_type: 'spread',
    capper_count: 4,
    cappers: ['Dave Price', 'Chris Vasile', 'Pure Lock', 'WagerTalk'],
    avg_odds: '-110',
    confidence_score: 0.78,
    ai_analysis: 'Eagles 8-2 ATS at home this season. Cowboys struggling on the road with key injuries on defense.',
    result: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: '6',
    date: new Date().toISOString().split('T')[0],
    sport: 'NBA',
    game: 'Warriors vs Suns',
    game_time: '10:00 PM ET',
    pick: 'Over 228',
    pick_type: 'over',
    capper_count: 3,
    cappers: ['Jack Jones', 'Dimers', 'Expert Picks'],
    avg_odds: '-112',
    confidence_score: 0.62,
    ai_analysis: 'Two high-pace offenses. Combined 243 points in last meeting. Both teams rest advantage.',
    result: 'pending',
    created_at: new Date().toISOString(),
  },
];

export default function ConsensusPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Sort by confidence score
  const sortedConsensus = [...mockConsensus].sort((a, b) => b.confidence_score - a.confidence_score);

  // Group by sport for stats
  const sportStats = mockConsensus.reduce((acc, c) => {
    if (!acc[c.sport]) acc[c.sport] = { count: 0, avgConfidence: 0 };
    acc[c.sport].count++;
    acc[c.sport].avgConfidence += c.confidence_score;
    return acc;
  }, {} as Record<string, { count: number; avgConfidence: number }>);

  Object.keys(sportStats).forEach(sport => {
    sportStats[sport].avgConfidence /= sportStats[sport].count;
  });

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Target className="h-5 w-5" />
          <span className="text-sm font-medium">Consensus Picks</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Today&apos;s Consensus Plays
        </h1>
        <p className="text-muted-foreground">
          {today} &middot; {mockConsensus.length} consensus picks where 3+ cappers agree
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-primary">{mockConsensus.length}</div>
            <div className="text-sm text-muted-foreground">Total Consensus</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold">
              {Math.round(mockConsensus.reduce((a, c) => a + c.confidence_score, 0) / mockConsensus.length * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Avg Confidence</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-primary">
              {mockConsensus.filter(c => c.confidence_score >= 0.8).length}
            </div>
            <div className="text-sm text-muted-foreground">High Confidence</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold">
              {Math.max(...mockConsensus.map(c => c.capper_count))}
            </div>
            <div className="text-sm text-muted-foreground">Max Agreement</div>
          </CardContent>
        </Card>
      </div>

      {/* Alert for top pick */}
      {sortedConsensus[0] && (
        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-primary">Top Pick</Badge>
                  <span className="text-sm text-muted-foreground">{sortedConsensus[0].sport}</span>
                </div>
                <h3 className="font-semibold text-lg">{sortedConsensus[0].game}</h3>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">{sortedConsensus[0].pick}</span>
                  {' '}&middot;{' '}
                  {sortedConsensus[0].capper_count} cappers agree
                  {' '}&middot;{' '}
                  {Math.round(sortedConsensus[0].confidence_score * 100)}% AI confidence
                </p>
              </div>
              <Button>View Details</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">All Sports</TabsTrigger>
            <TabsTrigger value="mlb">MLB ({sportStats['MLB']?.count || 0})</TabsTrigger>
            <TabsTrigger value="nfl">NFL ({sportStats['NFL']?.count || 0})</TabsTrigger>
            <TabsTrigger value="nba">NBA ({sportStats['NBA']?.count || 0})</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Today
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          {sortedConsensus.map((consensus) => (
            <ConsensusCard key={consensus.id} consensus={consensus} />
          ))}
        </TabsContent>

        <TabsContent value="mlb" className="space-y-4">
          {sortedConsensus
            .filter((c) => c.sport === 'MLB')
            .map((consensus) => (
              <ConsensusCard key={consensus.id} consensus={consensus} />
            ))}
        </TabsContent>

        <TabsContent value="nfl" className="space-y-4">
          {sortedConsensus
            .filter((c) => c.sport === 'NFL')
            .map((consensus) => (
              <ConsensusCard key={consensus.id} consensus={consensus} />
            ))}
        </TabsContent>

        <TabsContent value="nba" className="space-y-4">
          {sortedConsensus
            .filter((c) => c.sport === 'NBA')
            .map((consensus) => (
              <ConsensusCard key={consensus.id} consensus={consensus} />
            ))}
        </TabsContent>
      </Tabs>

      {/* How It Works */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            How Consensus Picks Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">1</div>
              <h3 className="font-semibold">Aggregate Picks</h3>
              <p className="text-sm text-muted-foreground">
                We collect picks from 15+ top betting sources including BetFirm, Dimers, Covers, and SportsLine.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">2</div>
              <h3 className="font-semibold">Find Agreement</h3>
              <p className="text-sm text-muted-foreground">
                Our system identifies games where 3 or more cappers agree on the same pick.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">3</div>
              <h3 className="font-semibold">AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                GPT-4 analyzes each consensus pick and assigns a confidence score based on capper quality and trends.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
