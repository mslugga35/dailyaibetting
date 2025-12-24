import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConsensusCard } from '@/components/picks/ConsensusCard';
import { Zap, Brain, TrendingUp, Star, AlertTriangle } from 'lucide-react';
import { Consensus } from '@/types';

export const metadata: Metadata = {
  title: 'Best Bets',
  description: 'AI-curated best bets of the day with highest confidence scores and edge analysis.',
};

// Mock best bets - highest confidence consensus picks
const mockBestBets: Consensus[] = [
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
    ai_analysis: 'Our highest confidence play of the day. Bills at home getting points against a Chiefs team dealing with key injuries. Josh Allen averaging 285+ yards in divisional matchups. Historical ATS edge for home underdogs in this situation.',
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
    ai_analysis: 'Strong consensus backed by favorable pitching matchup. Cole has dominated Boston with a 2.45 ERA in last 5 starts against them. Odds have shifted from -125 to -135, indicating sharp action.',
    result: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
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
    ai_analysis: 'Eagles 8-2 ATS at home this season. Cowboys key defensive injuries causing issues on the road. Divisional game with extra motivation for Eagles.',
    result: 'pending',
    created_at: new Date().toISOString(),
  },
];

export default function BestBetsPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Zap className="h-5 w-5" />
          <span className="text-sm font-medium">AI-Curated</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Today&apos;s Best Bets
        </h1>
        <p className="text-muted-foreground">
          {today} &middot; Top {mockBestBets.length} highest-confidence plays selected by AI
        </p>
      </div>

      {/* Selection Criteria */}
      <Card className="mb-8 bg-primary/5 border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">How We Select Best Bets</h3>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes consensus picks based on: capper agreement (3+ required),
                individual capper track records, line movement, historical trends, and
                situational factors. Only picks with 75%+ confidence make the cut.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Warning */}
      <Card className="mb-8 border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium">Responsible Gaming:</span>{' '}
              <span className="text-muted-foreground">
                These picks are for entertainment purposes. Never bet more than you can afford to lose.
                Past performance does not guarantee future results.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{mockBestBets.length}</div>
                <div className="text-sm text-muted-foreground">Best Bets</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {Math.round(mockBestBets.reduce((a, c) => a + c.confidence_score, 0) / mockBestBets.length * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Avg Confidence</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Math.round(mockBestBets.reduce((a, c) => a + c.capper_count, 0) / mockBestBets.length)}
            </div>
            <div className="text-sm text-muted-foreground">Avg Cappers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold flex items-center gap-1">
              <TrendingUp className="h-5 w-5 text-primary" />
              68%
            </div>
            <div className="text-sm text-muted-foreground">YTD Win Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Best Bets List */}
      <div className="space-y-6">
        {mockBestBets.map((bet, index) => (
          <div key={bet.id} className="relative">
            {/* Rank Badge */}
            <div className="absolute -left-4 -top-4 z-10">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg ${
                index === 0 ? 'bg-yellow-500 text-yellow-950' :
                index === 1 ? 'bg-gray-400 text-gray-900' :
                'bg-amber-600 text-amber-950'
              }`}>
                #{index + 1}
              </div>
            </div>
            <ConsensusCard consensus={bet} showAnalysis={true} />
          </div>
        ))}
      </div>

      {/* Track Record */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Best Bets Track Record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">68.2%</div>
              <div className="text-sm text-muted-foreground">Win Rate (YTD)</div>
            </div>
            <div>
              <div className="text-3xl font-bold">142-66</div>
              <div className="text-sm text-muted-foreground">Record (YTD)</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">+48.3u</div>
              <div className="text-sm text-muted-foreground">Units Profit</div>
            </div>
            <div>
              <div className="text-3xl font-bold">+23.2%</div>
              <div className="text-sm text-muted-foreground">ROI</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to Use */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How to Use Best Bets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">1</div>
              <h3 className="font-semibold">Review Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Read the AI analysis for each pick to understand the reasoning and key factors.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">2</div>
              <h3 className="font-semibold">Check Confidence</h3>
              <p className="text-sm text-muted-foreground">
                Higher confidence scores indicate stronger consensus. 80%+ picks historically perform best.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">3</div>
              <h3 className="font-semibold">Manage Bankroll</h3>
              <p className="text-sm text-muted-foreground">
                Never bet more than 1-2% of your bankroll per pick, even on high-confidence plays.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
