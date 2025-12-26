import { Metadata } from 'next';
import { Trophy, TrendingUp, Calendar, Target, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { SocialProof } from '@/components/social-proof/SocialProof';

export const metadata: Metadata = {
  title: 'Consensus Pick Results - Track Record | DailyAI Betting',
  description: 'See our verified track record. Fire picks (3+ capper consensus) performance tracked daily with win/loss results.',
  keywords: 'sports betting results, consensus picks track record, betting performance, win rate',
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function getResults() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    const [recentRes, dailyRes, sportRes, statsRes] = await Promise.all([
      fetch(`${baseUrl}/api/results?view=recent`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/results?view=daily`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/results?view=sport`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/results?view=stats`, { cache: 'no-store' }),
    ]);

    const [recent, daily, sport, stats] = await Promise.all([
      recentRes.json(),
      dailyRes.json(),
      sportRes.json(),
      statsRes.json(),
    ]);

    return {
      recent: recent.data || [],
      daily: daily.data || [],
      sport: sport.data || [],
      stats: stats.data || null,
    };
  } catch (error) {
    console.error('Failed to fetch results:', error);
    return { recent: [], daily: [], sport: [], stats: null };
  }
}

export default async function ResultsPage() {
  const { recent, daily, sport, stats } = await getResults();

  const hasData = recent.length > 0 || daily.length > 0;

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-emerald-400" />
          Consensus Pick Results
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Transparent tracking of our fire picks (3+ capper consensus). Every pick is graded after the game.
        </p>
      </div>

      {/* Social Proof Banner */}
      <div className="mb-8">
        <SocialProof variant="card" className="max-w-md mx-auto" />
      </div>

      {!hasData ? (
        /* No Data State */
        <div className="text-center py-16 bg-card rounded-xl border">
          <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Results Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We&apos;re tracking consensus picks starting today. Check back tomorrow to see how our fire picks performed!
          </p>
        </div>
      ) : (
        <>
          {/* Performance by Sport */}
          {sport.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Performance by Sport
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sport.map((s: any) => (
                  <div key={s.sport} className="bg-card border rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">{s.sport}</div>
                    <div className="text-2xl font-bold text-emerald-400">{s.win_pct || 0}%</div>
                    <div className="text-sm text-muted-foreground">
                      {s.wins}W - {s.losses}L
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Daily Results */}
          {daily.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-400" />
                Daily Results
              </h2>
              <div className="bg-card border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Picks</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">W-L-P</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Win %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.slice(0, 14).map((d: any, i: number) => (
                      <tr key={d.pick_date} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                        <td className="px-4 py-3 text-sm">
                          {new Date(d.pick_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">{d.total_picks}</td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span className="text-emerald-400">{d.wins}</span>
                          {' - '}
                          <span className="text-red-400">{d.losses}</span>
                          {d.pushes > 0 && <span className="text-muted-foreground"> - {d.pushes}</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${
                            d.win_pct >= 60 ? 'text-emerald-400' :
                            d.win_pct >= 50 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {d.win_pct || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Recent Graded Picks */}
          {recent.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Recent Results</h2>
              <div className="space-y-2">
                {recent.slice(0, 20).map((pick: any) => (
                  <div
                    key={pick.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      pick.result === 'WIN' ? 'bg-emerald-500/10 border-emerald-500/30' :
                      pick.result === 'LOSS' ? 'bg-red-500/10 border-red-500/30' :
                      'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {pick.result === 'WIN' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : pick.result === 'LOSS' ? (
                        <XCircle className="h-5 w-5 text-red-400" />
                      ) : (
                        <MinusCircle className="h-5 w-5 text-yellow-400" />
                      )}
                      <div>
                        <div className="font-medium">
                          {pick.team} {pick.line}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {pick.sport} • {pick.capper_count} cappers
                          {pick.final_score && ` • ${pick.final_score}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(pick.pick_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Methodology */}
      <section className="mt-12 bg-card border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-3">How We Track Results</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Fire Picks Only:</strong> We track picks where 3+ professional cappers agree (🔥 fire picks).
          </p>
          <p>
            <strong className="text-foreground">Same-Day Grading:</strong> Results are graded within 24 hours of game completion.
          </p>
          <p>
            <strong className="text-foreground">Push Rules:</strong> Pushes (ties) are not counted as wins or losses in win percentage.
          </p>
          <p>
            <strong className="text-foreground">Transparency:</strong> Every pick is logged before the game starts. No cherry-picking.
          </p>
        </div>
      </section>
    </main>
  );
}
