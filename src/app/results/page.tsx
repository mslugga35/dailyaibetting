import { Metadata } from 'next';
import Link from 'next/link';
import { Trophy, ShieldCheck, Info, CheckCircle, XCircle, MinusCircle, Scale } from 'lucide-react';
import { getVerifiedPerformance, MIN_SAMPLE, type Record3 } from '@/lib/data/performance';

export const metadata: Metadata = {
  title: 'Graded Track Record – Consensus Results | DailyAI Betting',
  description:
    'Every graded fire pick (3+ capper consensus), counted from final scores. Wins, losses and pushes by period, sport and consensus strength, with our methodology. No guarantees.',
};

export const dynamic = 'force-dynamic';

function pct(r: Record3) {
  return r.winPct === null ? '—' : `${r.winPct.toFixed(1)}%`;
}

function RecordLine({ r }: { r: Record3 }) {
  return (
    <span className="tabular-nums">
      {r.wins}–{r.losses}
      {r.pushes > 0 ? `–${r.pushes}` : ''}
    </span>
  );
}

function SampleNote({ r }: { r: Record3 }) {
  if (r.decided === 0) return <span className="text-xs text-muted-foreground">No graded picks yet</span>;
  if (r.decided < MIN_SAMPLE) {
    return <span className="text-xs text-amber-400">Small sample ({r.decided} decided)</span>;
  }
  return <span className="text-xs text-muted-foreground">{r.decided.toLocaleString()} decided picks</span>;
}

function StatCard({ title, r }: { title: string; r: Record3 }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{pct(r)}</div>
      <div className="mt-1 text-sm">
        <RecordLine r={r} /> <span className="text-muted-foreground">W–L{r.pushes > 0 ? '–P' : ''}</span>
      </div>
      <div className="mt-2"><SampleNote r={r} /></div>
    </div>
  );
}

function ResultIcon({ result }: { result: string }) {
  if (result === 'WIN') return <CheckCircle className="h-4 w-4 text-emerald-400" aria-label="Win" />;
  if (result === 'LOSS') return <XCircle className="h-4 w-4 text-red-400" aria-label="Loss" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground" aria-label="Push" />;
}

export default async function ResultsPage() {
  let perf: Awaited<ReturnType<typeof getVerifiedPerformance>> | null = null;
  try {
    perf = await getVerifiedPerformance();
  } catch (e) {
    console.error('Performance page:', (e as { message?: string })?.message || String(e));
  }
  const hasData = !!perf && perf.allTime.wins + perf.allTime.losses + perf.allTime.pushes > 0;

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Graded from final scores · nothing estimated
        </div>
        <h1 className="flex items-center justify-center gap-3 text-3xl font-bold md:text-4xl">
          <Trophy className="h-8 w-8 text-emerald-400" aria-hidden="true" />
          Graded Track Record
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
          Every fire pick (3+ cappers on the same bet) that has been graded, win or lose. Past results do not
          predict future results, and no outcome is guaranteed.
        </p>
        {perf?.firstGradedDate && perf.lastGradedDate && (
          <p className="mt-2 text-xs text-muted-foreground">
            Graded picks from {perf.firstGradedDate} to {perf.lastGradedDate}
          </p>
        )}
      </header>

      {!perf || !perf.configured ? (
        <div className="rounded-xl border bg-card py-16 text-center">
          <h2 className="mb-2 text-xl font-semibold">Results are temporarily unavailable</h2>
          <p className="text-muted-foreground">We could not load the graded record right now. Please try again shortly.</p>
        </div>
      ) : !hasData ? (
        <div className="rounded-xl border bg-card py-16 text-center">
          <h2 className="mb-2 text-xl font-semibold">No graded picks yet</h2>
          <p className="mx-auto max-w-md text-muted-foreground">
            Results appear here once picks are graded against final scores. We do not publish a record before it exists.
          </p>
        </div>
      ) : (
        <>
          <section aria-labelledby="overall" className="mb-10">
            <h2 id="overall" className="sr-only">Overall record</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard title="All time" r={perf.allTime} />
              <StatCard title="Last 30 days" r={perf.last30} />
              <StatCard title="Last 7 days" r={perf.last7} />
            </div>
          </section>

          <section aria-labelledby="strength" className="mb-10">
            <h2 id="strength" className="mb-1 flex items-center gap-2 text-xl font-semibold">
              <Scale className="h-5 w-5 text-emerald-400" aria-hidden="true" /> Does more agreement mean better results?
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Win rate by how many cappers backed the pick. This is the honest test of the consensus idea; small
              groups are marked.
            </p>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr><th className="p-3 font-medium">Consensus</th><th className="p-3 font-medium">Win rate</th><th className="p-3 font-medium">W–L–P</th><th className="p-3 font-medium">Sample</th></tr>
                </thead>
                <tbody>
                  {perf.byCapperCount.map((b) => (
                    <tr key={b.label} className="border-t">
                      <td className="p-3">{b.label}</td>
                      <td className="p-3 font-semibold tabular-nums">{pct(b)}</td>
                      <td className="p-3 tabular-nums">{b.wins}–{b.losses}–{b.pushes}</td>
                      <td className="p-3"><SampleNote r={b} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {perf.bySport.length > 0 && (
            <section aria-labelledby="sport" className="mb-10">
              <h2 id="sport" className="mb-4 text-xl font-semibold">By sport</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {perf.bySport.map((s) => (
                  <div key={s.sport} className="rounded-lg border bg-card p-4">
                    <div className="text-sm text-muted-foreground">{s.sport}</div>
                    <div className="text-2xl font-bold tabular-nums">{pct(s)}</div>
                    <div className="text-sm"><RecordLine r={s} /></div>
                    <SampleNote r={s} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="recent" className="mb-10">
            <h2 id="recent" className="mb-4 text-xl font-semibold">Latest graded picks</h2>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                  <tr><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Sport</th><th className="p-3 font-medium">Pick</th><th className="p-3 font-medium">Cappers</th><th className="p-3 font-medium">Result</th><th className="p-3 font-medium">Final</th></tr>
                </thead>
                <tbody>
                  {perf.recent.map((p, i) => (
                    <tr key={`${p.pick_date}-${i}`} className="border-t">
                      <td className="whitespace-nowrap p-3 tabular-nums">{p.pick_date}</td>
                      <td className="p-3">{p.sport ?? '—'}</td>
                      <td className="p-3">{/* `bet` already carries the line ("Knicks -4.5") */}{p.bet || '—'}</td>
                      <td className="p-3 tabular-nums">{p.capper_count ?? '—'}</td>
                      <td className="p-3"><span className="inline-flex items-center gap-1.5"><ResultIcon result={p.result} />{p.result.charAt(0) + p.result.slice(1).toLowerCase()}</span></td>
                      <td className="p-3 text-muted-foreground">{p.final_score ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="method" className="rounded-xl border bg-card p-6">
        <h2 id="method" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Info className="h-5 w-5 text-emerald-400" aria-hidden="true" /> How this record is kept
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>A <strong>fire pick</strong> is a bet that 3 or more tracked cappers chose independently. Only fire picks are recorded here.</li>
          <li>Each pick is graded <strong>win, loss or push</strong> against the game&apos;s final score after it ends. Ungraded games are never counted.</li>
          <li><strong>Win rate = wins ÷ (wins + losses)</strong>. Pushes are shown but excluded from the rate.</li>
          <li>This record shows no profit, units or ROI: the odds at the time of every pick were not recorded, so those figures cannot be verified. Unit and ROI figures on the Stats and Cappers pages are estimates that assume standard −110 odds and are labelled as such.</li>
          <li>Groups with fewer than {MIN_SAMPLE} decided picks are labelled <em>small sample</em>; treat them with caution.</li>
          <li>Picks come from third-party cappers. This is information, not betting advice. No outcome is guaranteed.</li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          21+. Gambling problem? Call 1-800-GAMBLER. See our <Link href="/consensus" className="underline hover:text-foreground">today&apos;s consensus</Link> for current picks.
        </p>
      </section>
    </main>
  );
}
