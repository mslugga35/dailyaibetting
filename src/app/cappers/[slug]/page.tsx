import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  Trophy, TrendingUp, Calendar, Target, CheckCircle, XCircle, 
  MinusCircle, ArrowLeft, Flame, Snowflake, BarChart3 
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

interface CapperProfile {
  id: string;
  name: string;
  slug: string;
  source: string;
  total_picks: number;
  wins: number;
  losses: number;
  pushes: number;
  win_pct: number;
  roi_pct: number;
  record: string;
  streak: number;
  streak_type: 'W' | 'L' | null;
  streak_display: string;
  specialties: string[];
  recent_form: string;
  recent_win_pct: number;
  by_sport: Array<{
    sport: string;
    wins: number;
    losses: number;
    pushes: number;
    total: number;
    win_pct: number;
  }>;
  recent_picks: Array<{
    id: string;
    date: string;
    sport: string;
    game: string;
    pick: string;
    pick_type: string;
    odds: string;
    result: string;
  }>;
}

async function getCapperProfile(slug: string): Promise<CapperProfile | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/cappers?view=profile&slug=${slug}`, {
      cache: 'no-store',
    });
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Failed to fetch capper profile:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const capper = await getCapperProfile(params.slug);
  
  if (!capper) {
    return {
      title: 'Capper Not Found | DailyAI Betting',
    };
  }

  return {
    title: `${capper.name} - ${capper.win_pct}% Win Rate | DailyAI Betting`,
    description: `${capper.name} betting record: ${capper.record}. ${capper.win_pct}% win rate across ${capper.total_picks} picks. See full pick history and performance by sport.`,
    keywords: `${capper.name} picks, ${capper.name} record, betting handicapper, sports betting expert`,
  };
}

export default async function CapperProfilePage({ params }: PageProps) {
  const capper = await getCapperProfile(params.slug);

  if (!capper) {
    notFound();
  }

  const isHot = capper.streak >= 3 && capper.streak_type === 'W';
  const isCold = capper.streak >= 3 && capper.streak_type === 'L';

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Link */}
      <Link 
        href="/cappers" 
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leaderboard
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold">{capper.name}</h1>
            {isHot && <Flame className="h-6 w-6 text-orange-400" />}
            {isCold && <Snowflake className="h-6 w-6 text-blue-400" />}
          </div>
          <p className="text-muted-foreground">
            Source: {capper.source}
            {capper.specialties?.length > 0 && (
              <span> • {capper.specialties.join(', ')}</span>
            )}
          </p>
        </div>
        
        {/* Win Rate Badge */}
        <div className={`text-center px-6 py-3 rounded-xl border-2 ${
          capper.win_pct >= 60 ? 'bg-emerald-500/10 border-emerald-500/50' :
          capper.win_pct >= 55 ? 'bg-green-500/10 border-green-500/50' :
          capper.win_pct >= 50 ? 'bg-yellow-500/10 border-yellow-500/50' : 
          'bg-red-500/10 border-red-500/50'
        }`}>
          <div className={`text-4xl font-bold ${
            capper.win_pct >= 60 ? 'text-emerald-400' :
            capper.win_pct >= 55 ? 'text-green-400' :
            capper.win_pct >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {capper.win_pct}%
          </div>
          <div className="text-sm text-muted-foreground">Win Rate</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{capper.record}</div>
          <div className="text-sm text-muted-foreground">Overall Record</div>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className={`text-2xl font-bold ${
            capper.roi_pct > 0 ? 'text-emerald-400' : 
            capper.roi_pct < 0 ? 'text-red-400' : ''
          }`}>
            {capper.roi_pct > 0 ? '+' : ''}{capper.roi_pct}%
          </div>
          <div className="text-sm text-muted-foreground">ROI</div>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">
            {isHot ? (
              <span className="text-orange-400">{capper.streak_display} 🔥</span>
            ) : isCold ? (
              <span className="text-blue-400">{capper.streak_display} ❄️</span>
            ) : (
              capper.streak_display
            )}
          </div>
          <div className="text-sm text-muted-foreground">Streak</div>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{capper.total_picks}</div>
          <div className="text-sm text-muted-foreground">Total Picks</div>
        </div>
      </div>

      {/* Recent Form */}
      {capper.recent_form && (
        <div className="mb-8 bg-card border rounded-xl p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Last 10 Picks
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {capper.recent_form.split('').map((result, i) => (
                <span
                  key={i}
                  className={`w-8 h-8 flex items-center justify-center rounded font-bold text-sm ${
                    result === 'W' ? 'bg-emerald-500/20 text-emerald-400' :
                    result === 'L' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {result}
                </span>
              ))}
            </div>
            <span className="text-muted-foreground ml-2">
              ({capper.recent_win_pct}% recent)
            </span>
          </div>
        </div>
      )}

      {/* Performance by Sport */}
      {capper.by_sport?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            Performance by Sport
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {capper.by_sport.map((sport) => (
              <div key={sport.sport} className="bg-card border rounded-lg p-4 text-center">
                <div className="text-sm text-muted-foreground mb-1">{sport.sport}</div>
                <div className={`text-2xl font-bold ${
                  sport.win_pct >= 60 ? 'text-emerald-400' :
                  sport.win_pct >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {sport.win_pct}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {sport.wins}-{sport.losses}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Picks */}
      {capper.recent_picks?.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-400" />
            Recent Picks
          </h2>
          <div className="space-y-2">
            {capper.recent_picks.map((pick) => (
              <div
                key={pick.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  pick.result === 'win' ? 'bg-emerald-500/10 border-emerald-500/30' :
                  pick.result === 'loss' ? 'bg-red-500/10 border-red-500/30' :
                  pick.result === 'push' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-muted/50 border-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  {pick.result === 'win' ? (
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  ) : pick.result === 'loss' ? (
                    <XCircle className="h-5 w-5 text-red-400" />
                  ) : pick.result === 'push' ? (
                    <MinusCircle className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <Target className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-medium">{pick.pick}</div>
                    <div className="text-sm text-muted-foreground">
                      {pick.sport} • {pick.game} • {pick.pick_type}
                      {pick.odds && ` (${pick.odds})`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${
                    pick.result === 'win' ? 'text-emerald-400' :
                    pick.result === 'loss' ? 'text-red-400' :
                    pick.result === 'push' ? 'text-yellow-400' :
                    'text-muted-foreground'
                  }`}>
                    {pick.result.toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(pick.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mt-12 text-center bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-2">Want to see when {capper.name} agrees with others?</h2>
        <p className="text-muted-foreground mb-4">
          Our consensus picks show when multiple cappers like {capper.name} agree on the same play.
        </p>
        <Link 
          href="/consensus"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          <Trophy className="h-5 w-5" />
          View Consensus Picks
        </Link>
      </section>
    </main>
  );
}
