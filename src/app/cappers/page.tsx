import { Metadata } from 'next';
import Link from 'next/link';
import { Trophy, TrendingUp, Flame, Snowflake, ArrowUpRight, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Capper Leaderboard - Top Sports Betting Experts | DailyAI Betting',
  description: 'See which sports betting cappers have the best track records. Verified win rates, ROI, and performance stats for top betting experts.',
  keywords: 'sports betting cappers, best handicappers, betting experts leaderboard, capper rankings, handicapper win rates',
};

export const dynamic = 'force-dynamic';

interface Capper {
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
  streak_display: string;
  hot: boolean;
  cold: boolean;
  specialties: string[];
}

async function getLeaderboard(): Promise<Capper[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/cappers?view=leaderboard&limit=50`, {
      cache: 'no-store',
    });
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return [];
  }
}

async function getHotStreaks() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/cappers?view=hot-streaks&limit=5`, {
      cache: 'no-store',
    });
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Failed to fetch hot streaks:', error);
    return [];
  }
}

export default async function CappersPage() {
  const [cappers, hotStreaks] = await Promise.all([
    getLeaderboard(),
    getHotStreaks(),
  ]);

  const hasData = cappers.length > 0;

  // Top 3 for podium
  const topThree = cappers.slice(0, 3);
  const restOfCappers = cappers.slice(3);

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-400" />
          Capper Leaderboard
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Track record of every capper we monitor. Click any capper to see their full pick history.
        </p>
      </div>

      {!hasData ? (
        <div className="text-center py-16 bg-card rounded-xl border">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Leaderboard Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We&apos;re tracking capper performance. Check back soon to see rankings!
          </p>
        </div>
      ) : (
        <>
          {/* Hot Streaks Banner */}
          {hotStreaks.length > 0 && (
            <div className="mb-8 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-5 w-5 text-orange-400" />
                <h2 className="font-semibold">Hot Streaks</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {hotStreaks.map((capper: any) => (
                  <Link
                    key={capper.slug}
                    href={`/cappers/${capper.slug}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-full hover:bg-orange-500/30 transition-colors"
                  >
                    <span className="font-medium">{capper.name}</span>
                    <span className="text-orange-400 font-bold">{capper.streak}W 🔥</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Top 3 Podium */}
          {topThree.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* 2nd Place */}
              <div className="order-1 md:order-1">
                <Link href={`/cappers/${topThree[1].slug}`} className="block">
                  <div className="bg-card border rounded-xl p-4 text-center hover:border-gray-400 transition-colors h-full">
                    <div className="text-3xl mb-2">🥈</div>
                    <h3 className="font-bold text-lg truncate">{topThree[1].name}</h3>
                    <div className="text-2xl font-bold text-emerald-400">{topThree[1].win_pct}%</div>
                    <div className="text-sm text-muted-foreground">{topThree[1].record}</div>
                  </div>
                </Link>
              </div>
              
              {/* 1st Place */}
              <div className="order-2 md:order-2">
                <Link href={`/cappers/${topThree[0].slug}`} className="block">
                  <div className="bg-gradient-to-b from-yellow-500/20 to-transparent border-2 border-yellow-500/50 rounded-xl p-4 text-center hover:border-yellow-400 transition-colors h-full relative -mt-4">
                    <div className="text-4xl mb-2">🥇</div>
                    <h3 className="font-bold text-xl truncate">{topThree[0].name}</h3>
                    <div className="text-3xl font-bold text-emerald-400">{topThree[0].win_pct}%</div>
                    <div className="text-sm text-muted-foreground">{topThree[0].record}</div>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded">
                      #1
                    </div>
                  </div>
                </Link>
              </div>
              
              {/* 3rd Place */}
              <div className="order-3 md:order-3">
                <Link href={`/cappers/${topThree[2].slug}`} className="block">
                  <div className="bg-card border rounded-xl p-4 text-center hover:border-orange-400 transition-colors h-full">
                    <div className="text-3xl mb-2">🥉</div>
                    <h3 className="font-bold text-lg truncate">{topThree[2].name}</h3>
                    <div className="text-2xl font-bold text-emerald-400">{topThree[2].win_pct}%</div>
                    <div className="text-sm text-muted-foreground">{topThree[2].record}</div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium w-12">#</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Capper</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Record</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Win %</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">ROI</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Streak</th>
                    <th className="px-4 py-3 text-left text-sm font-medium hidden md:table-cell">Specialties</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {cappers.map((capper, i) => (
                    <tr 
                      key={capper.id} 
                      className={`${i % 2 === 0 ? 'bg-muted/20' : ''} hover:bg-muted/40 transition-colors`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/cappers/${capper.slug}`} className="group">
                          <div className="flex items-center gap-2">
                            <span className="font-medium group-hover:text-primary transition-colors">
                              {capper.name}
                            </span>
                            {capper.hot && <Flame className="h-4 w-4 text-orange-400" />}
                            {capper.cold && <Snowflake className="h-4 w-4 text-blue-400" />}
                          </div>
                          <div className="text-xs text-muted-foreground">{capper.source}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-sm">{capper.record}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${
                          capper.win_pct >= 60 ? 'text-emerald-400' :
                          capper.win_pct >= 55 ? 'text-green-400' :
                          capper.win_pct >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {capper.win_pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${
                          capper.roi_pct > 0 ? 'text-emerald-400' : 
                          capper.roi_pct < 0 ? 'text-red-400' : 'text-muted-foreground'
                        }`}>
                          {capper.roi_pct > 0 ? '+' : ''}{capper.roi_pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {capper.hot ? (
                          <span className="text-orange-400 font-bold">{capper.streak_display} 🔥</span>
                        ) : capper.cold ? (
                          <span className="text-blue-400 font-bold">{capper.streak_display} ❄️</span>
                        ) : (
                          <span className="text-muted-foreground">{capper.streak_display}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {capper.specialties?.slice(0, 3).map((sport) => (
                            <span 
                              key={sport}
                              className="px-2 py-0.5 bg-muted rounded text-xs"
                            >
                              {sport}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/cappers/${capper.slug}`}>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology */}
          <section className="mt-8 bg-card border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              How Rankings Work
            </h2>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">Win Rate:</strong> Calculated from all graded picks. Pushes are excluded from win/loss calculations.
              </p>
              <p>
                <strong className="text-foreground">ROI:</strong> Return on investment assuming 1 unit per pick at -110 standard juice.
              </p>
              <p>
                <strong className="text-foreground">Streaks:</strong> Current consecutive wins (🔥) or losses (❄️). 3+ game streaks are highlighted.
              </p>
              <p>
                <strong className="text-foreground">Real-Time Updates:</strong> Stats update automatically as games complete and picks are graded.
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
