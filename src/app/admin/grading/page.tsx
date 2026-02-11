'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, MinusCircle, Clock, Play } from 'lucide-react';

interface Pick {
  id: string;
  pick_date: string;
  sport: string;
  team: string;
  matchup: string;
  bet_type: string;
  line?: string;
  capper_count: number;
  result: string;
  final_score?: string;
  graded_at?: string;
}

interface GradingStats {
  pending: number;
  graded: number;
  wins: number;
  losses: number;
  pushes: number;
  winPct: number;
}

export default function GradingAdminPage() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [stats, setStats] = useState<GradingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const fetchPicks = async () => {
    setLoading(true);
    try {
      // Fetch pending picks
      const pendingRes = await fetch('/api/results?view=pending');
      const pendingData = await pendingRes.json();
      
      // Fetch recent graded
      const recentRes = await fetch('/api/results?view=recent');
      const recentData = await recentRes.json();
      
      // Fetch stats
      const statsRes = await fetch('/api/results?view=stats');
      const statsData = await statsRes.json();
      
      const allPicks = [
        ...(pendingData.data || []),
        ...(recentData.data || []).slice(0, 20),
      ];
      
      setPicks(allPicks);
      
      if (statsData.data) {
        setStats({
          pending: pendingData.data?.length || 0,
          graded: (statsData.data.allTime?.total || 0),
          wins: statsData.data.allTime?.wins || 0,
          losses: statsData.data.allTime?.losses || 0,
          pushes: 0,
          winPct: statsData.data.allTime?.winPct || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch picks:', error);
    }
    setLoading(false);
  };

  const runAutoGrader = async () => {
    setGrading(true);
    setLastResult(null);
    try {
      const response = await fetch('/api/cron/grade-picks');
      const result = await response.json();
      setLastResult(result);
      // Refresh picks after grading
      await fetchPicks();
    } catch (error) {
      console.error('Grading failed:', error);
      setLastResult({ success: false, error: 'Request failed' });
    }
    setGrading(false);
  };

  useEffect(() => {
    fetchPicks();
  }, []);

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'WIN': return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'LOSS': return <XCircle className="h-5 w-5 text-red-400" />;
      case 'PUSH': return <MinusCircle className="h-5 w-5 text-yellow-400" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Auto-Grader Admin</h1>
          <p className="text-muted-foreground">Manage pick grading and view results</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPicks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={runAutoGrader}
            disabled={grading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Play className={`h-4 w-4 ${grading ? 'animate-pulse' : ''}`} />
            {grading ? 'Grading...' : 'Run Auto-Grader'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{stats.graded}</div>
            <div className="text-sm text-muted-foreground">Total Graded</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.wins}</div>
            <div className="text-sm text-muted-foreground">Wins</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.losses}</div>
            <div className="text-sm text-muted-foreground">Losses</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.winPct}%</div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </div>
        </div>
      )}

      {/* Last Grading Result */}
      {lastResult && (
        <div className={`mb-6 p-4 rounded-lg border ${lastResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className="font-semibold mb-2">
            {lastResult.success ? '✅ Grading Complete' : '❌ Grading Failed'}
          </div>
          {lastResult.success ? (
            <div className="text-sm">
              Graded {lastResult.stats?.graded || 0} picks • 
              {lastResult.stats?.wins || 0}W - {lastResult.stats?.losses || 0}L •
              {lastResult.duration}ms
            </div>
          ) : (
            <div className="text-sm text-red-400">{lastResult.error}</div>
          )}
        </div>
      )}

      {/* Picks Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Sport</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Pick</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Cappers</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Result</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Final Score</th>
            </tr>
          </thead>
          <tbody>
            {picks.map((pick, i) => (
              <tr key={pick.id} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                <td className="px-4 py-3 text-sm">
                  {new Date(pick.pick_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3 text-sm">{pick.sport}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{pick.team}</div>
                  <div className="text-sm text-muted-foreground">
                    {pick.bet_type} {pick.line}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={pick.capper_count >= 3 ? 'text-orange-400' : ''}>
                    {pick.capper_count >= 3 ? '🔥 ' : ''}{pick.capper_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {getResultIcon(pick.result)}
                    <span className={
                      pick.result === 'WIN' ? 'text-emerald-400' :
                      pick.result === 'LOSS' ? 'text-red-400' :
                      pick.result === 'PUSH' ? 'text-yellow-400' :
                      'text-muted-foreground'
                    }>
                      {pick.result}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {pick.final_score || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {picks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {loading ? 'Loading...' : 'No picks found'}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
        <h3 className="font-semibold text-foreground mb-2">How Auto-Grading Works</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Fetches completed game scores from ESPN API (free, no auth required)</li>
          <li>Matches pending picks to games by team name</li>
          <li>Grades as WIN/LOSS/PUSH based on bet type (ML, Spread, O/U)</li>
          <li>Runs automatically every 3 hours via Vercel Cron</li>
          <li>Click "Run Auto-Grader" to manually trigger grading</li>
        </ul>
      </div>
    </main>
  );
}
