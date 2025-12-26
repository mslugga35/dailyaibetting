'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Filter, TrendingUp, CheckCircle, XCircle, MinusCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface HistoricalPick {
  id: string;
  pick_date: string;
  sport: string;
  team: string;
  opponent: string;
  bet_type: string;
  line: string;
  capper_count: number;
  is_fire: boolean;
  result: 'WIN' | 'LOSS' | 'PUSH' | 'PENDING';
  final_score: string | null;
}

interface DailySummary {
  pick_date: string;
  total_picks: number;
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  win_pct: number;
}

const SPORTS = ['ALL', 'NFL', 'NBA', 'MLB', 'NHL', 'CFB', 'CBB'];
const RESULTS = ['ALL', 'WIN', 'LOSS', 'PUSH', 'PENDING'];

export default function HistoryPage() {
  const [picks, setPicks] = useState<HistoricalPick[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'picks' | 'calendar'>('picks');
  const [sportFilter, setSportFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const perPage = 20;

  useEffect(() => {
    fetchData();
  }, [sportFilter, resultFilter, page, selectedDate]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch picks
      const params = new URLSearchParams({
        view: 'recent',
        limit: '100',
      });
      if (sportFilter !== 'ALL') params.set('sport', sportFilter);

      const [picksRes, dailyRes] = await Promise.all([
        fetch(`/api/results?${params}`),
        fetch('/api/results?view=daily&days=60'),
      ]);

      const picksData = await picksRes.json();
      const dailyData = await dailyRes.json();

      let filteredPicks = picksData.data || [];

      // Apply result filter
      if (resultFilter !== 'ALL') {
        filteredPicks = filteredPicks.filter((p: HistoricalPick) => p.result === resultFilter);
      }

      // Apply date filter
      if (selectedDate) {
        filteredPicks = filteredPicks.filter((p: HistoricalPick) => p.pick_date === selectedDate);
      }

      setPicks(filteredPicks);
      setDailySummary(dailyData.data || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }

  const paginatedPicks = picks.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(picks.length / perPage);

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'WIN':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'LOSS':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'PUSH':
        return <MinusCircle className="h-5 w-5 text-yellow-400" />;
      default:
        return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />;
    }
  };

  const getResultBadge = (result: string) => {
    const variants: Record<string, string> = {
      WIN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      LOSS: 'bg-red-500/20 text-red-400 border-red-500/30',
      PUSH: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      PENDING: 'bg-muted text-muted-foreground',
    };
    return variants[result] || variants.PENDING;
  };

  // Calculate overall stats
  const stats = {
    total: picks.length,
    wins: picks.filter(p => p.result === 'WIN').length,
    losses: picks.filter(p => p.result === 'LOSS').length,
    pushes: picks.filter(p => p.result === 'PUSH').length,
    pending: picks.filter(p => p.result === 'PENDING').length,
  };
  const winPct = stats.wins + stats.losses > 0
    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 1000) / 10
    : 0;

  return (
    <div className="container px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Calendar className="h-5 w-5" />
          <span className="text-sm font-medium">Historical Data</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Pick History</h1>
        <p className="text-muted-foreground">
          Browse our complete archive of consensus picks and results
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Picks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{stats.wins}</div>
            <div className="text-sm text-muted-foreground">Wins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{stats.losses}</div>
            <div className="text-sm text-muted-foreground">Losses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{stats.pushes}</div>
            <div className="text-sm text-muted-foreground">Pushes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${winPct >= 55 ? 'text-emerald-400' : winPct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {winPct}%
            </div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={sportFilter} onValueChange={(v) => { setSportFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sport" />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map(sport => (
                  <SelectItem key={sport} value={sport}>
                    {sport === 'ALL' ? 'All Sports' : sport}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resultFilter} onValueChange={(v) => { setResultFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                {RESULTS.map(result => (
                  <SelectItem key={result} value={result}>
                    {result === 'ALL' ? 'All Results' : result}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedDate && (
              <Button variant="outline" size="sm" onClick={() => { setSelectedDate(null); setPage(1); }}>
                Clear Date: {selectedDate}
              </Button>
            )}

            <div className="ml-auto flex gap-2">
              <Button
                variant={view === 'picks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('picks')}
              >
                Picks
              </Button>
              <Button
                variant={view === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('calendar')}
              >
                Calendar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading history...</span>
        </div>
      ) : view === 'picks' ? (
        /* Picks List View */
        <>
          <div className="space-y-3 mb-6">
            {paginatedPicks.length > 0 ? (
              paginatedPicks.map((pick) => (
                <Card
                  key={pick.id}
                  className={`transition-colors ${
                    pick.result === 'WIN' ? 'border-emerald-500/30 bg-emerald-500/5' :
                    pick.result === 'LOSS' ? 'border-red-500/30 bg-red-500/5' :
                    pick.result === 'PUSH' ? 'border-yellow-500/30 bg-yellow-500/5' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {getResultIcon(pick.result)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{pick.sport}</Badge>
                            {pick.is_fire && <span className="text-lg">🔥</span>}
                            <Badge className={getResultBadge(pick.result)}>
                              {pick.result}
                            </Badge>
                          </div>
                          <div className="font-medium">
                            {pick.team} {pick.line}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            vs {pick.opponent || 'TBD'} • {pick.bet_type}
                            {pick.final_score && ` • ${pick.final_score}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {new Date(pick.pick_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold">{pick.capper_count}</span> cappers
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No picks found matching your filters.</p>
                <Button variant="outline" className="mt-4" onClick={() => {
                  setSportFilter('ALL');
                  setResultFilter('ALL');
                  setSelectedDate(null);
                }}>
                  Clear Filters
                </Button>
              </Card>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Calendar View */
        <div className="space-y-3">
          {dailySummary.length > 0 ? (
            dailySummary.map((day) => (
              <Card
                key={day.pick_date}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${
                  selectedDate === day.pick_date ? 'border-primary' : ''
                }`}
                onClick={() => {
                  setSelectedDate(day.pick_date === selectedDate ? null : day.pick_date);
                  setView('picks');
                  setPage(1);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        {new Date(day.pick_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {day.total_picks} picks
                        {day.pending > 0 && ` • ${day.pending} pending`}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-semibold">{day.wins}W</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="text-red-400 font-semibold">{day.losses}L</span>
                          {day.pushes > 0 && (
                            <>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-yellow-400 font-semibold">{day.pushes}P</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className={`text-2xl font-bold ${
                        day.win_pct >= 60 ? 'text-emerald-400' :
                        day.win_pct >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {day.win_pct || 0}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No historical data available yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Results will appear here once picks are graded.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Cross Links */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Related Pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/results">Current Results</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Today&apos;s Picks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sportsbooks">Sportsbooks</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/best-bets">Best Bets</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
