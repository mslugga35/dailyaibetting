'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConsensusCard } from '@/components/picks/ConsensusCard';
import { CapperLeaderboard } from '@/components/cappers/CapperLeaderboard';
import { StatsOverview } from '@/components/picks/StatsOverview';
import { ConsensusReport } from '@/components/picks/ConsensusReport';
import { Brain, TrendingUp, Users, Zap, RefreshCw, ChevronRight, Target, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Consensus, Capper, DailyStats, consensusPickToConsensus } from '@/types';
import { useConsensus } from '@/lib/hooks/use-consensus';

// Mock data - will be replaced with Supabase queries
const mockConsensus: Consensus[] = [
  {
    id: '1',
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
    id: '2',
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
    id: '3',
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
];

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
];

const mockStats: DailyStats = {
  date: new Date().toISOString().split('T')[0],
  total_picks: 47,
  wins: 18,
  losses: 12,
  pushes: 2,
  win_rate: 0.60,
  units: 8.4,
  consensus_picks: 12,
  consensus_wins: 8,
  sports_active: ['MLB', 'NFL', 'NBA'],
};

export default function HomePage() {
  const { topOverall, bySport, isLoading, error, refetch } = useConsensus();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Convert API data to component format, fallback to mock data
  const consensusData: Consensus[] = topOverall.length > 0
    ? topOverall.map(consensusPickToConsensus)
    : mockConsensus;

  // Calculate live stats from API data
  const liveStats: DailyStats = topOverall.length > 0 ? {
    date: new Date().toISOString().split('T')[0],
    total_picks: topOverall.reduce((sum, p) => sum + p.capperCount, 0),
    wins: 0,
    losses: 0,
    pushes: 0,
    win_rate: 0,
    units: 0,
    consensus_picks: topOverall.length,
    consensus_wins: 0,
    sports_active: [...new Set(topOverall.map(p => p.sport))] as DailyStats['sports_active'],
  } : mockStats;

  return (
    <div className="container px-4 py-8">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
          <Brain className="h-4 w-4" />
          AI-Powered Picks
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Daily AI Betting Consensus
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
          Find value bets where multiple expert cappers agree. Our AI analyzes picks from top sources
          and highlights the strongest consensus plays.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/consensus">
              <Target className="h-5 w-5 mr-2" />
              View Today&apos;s Picks
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/cappers">
              <Users className="h-5 w-5 mr-2" />
              Capper Rankings
            </Link>
          </Button>
        </div>
      </section>

      {/* Date & Refresh */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{today}</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <section className="mb-8">
        <StatsOverview stats={liveStats} />
      </section>

      {/* Loading/Error States */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading picks...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center gap-2 py-8 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Using demo data - connect Google Sheets for live picks</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Consensus Report - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <ConsensusReport
                topOverall={topOverall}
                bySport={bySport}
              />
            </CardContent>
          </Card>

          {/* Detailed Cards Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Detailed Analysis
              </h2>
              <Link
                href="/consensus"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Show top 3 consensus cards with details */}
            {consensusData.slice(0, 3).map((consensus) => (
              <ConsensusCard key={consensus.id} consensus={consensus} />
            ))}
          </div>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Capper Leaderboard */}
          <CapperLeaderboard cappers={mockCappers} limit={5} />

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Badge className="mb-2">Hot Trend</Badge>
                <p className="text-sm">
                  Home underdogs are 14-6 (70%) this week in MLB. Consider fading road favorites.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <Badge variant="secondary" className="mb-2">Pattern Alert</Badge>
                <p className="text-sm">
                  Dave Price is 8-2 on Monday picks. His consensus picks today: Yankees ML, Bills +3.5.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <Badge variant="outline" className="mb-2">Value Spot</Badge>
                <p className="text-sm">
                  3+ capper agreement on underdogs has hit at 67% rate this month.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/best-bets">
                  <Zap className="h-4 w-4 mr-2 text-primary" />
                  Today&apos;s Best Bets
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/trends">
                  <TrendingUp className="h-4 w-4 mr-2 text-accent" />
                  Hot Trends
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href="/picks">
                  <Target className="h-4 w-4 mr-2" />
                  All Picks Archive
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
