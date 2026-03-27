import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free MMA Picks Today - Expert Consensus Picks | DailyAI Betting',
  description: 'Get free MMA picks today from top cappers. Our AI analyzes expert consensus to find the best MMA bets. Updated daily with UFC moneyline, method of victory, and prop picks.',
  keywords: 'free MMA picks today, MMA betting picks, UFC picks today, MMA consensus picks, MMA best bets, MMA expert picks, UFC expert picks',
}

export default function MMAPicksToday() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Free MMA Picks Today</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Expert consensus picks updated daily. We track 10+ professional cappers and highlight plays where multiple experts agree.
      </p>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">🔥 Today&apos;s MMA Consensus Picks</h2>
        <p className="mb-4">
          Our AI scans picks from top sports betting experts and identifies where 3 or more cappers agree on the same play.
          These consensus picks historically hit at a higher rate than individual picks.
        </p>
        <a
          href="/consensus?sport=MMA"
          className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700"
        >
          View MMA Consensus Picks →
        </a>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">How Our MMA Picks Work</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">1. We Track Experts</h3>
            <p className="text-sm text-muted-foreground">10+ professional cappers including BetFirm, Covers, Dimers, and more.</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">2. Find Consensus</h3>
            <p className="text-sm text-muted-foreground">Our AI identifies plays where multiple experts agree on the same bet.</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">3. 🔥 Fire Picks</h3>
            <p className="text-sm text-muted-foreground">3+ cappers agreeing = Fire pick. These are our strongest plays.</p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">MMA Betting Resources</h2>
        <ul className="space-y-2">
          <li><a href="/consensus" className="text-emerald-600 hover:underline">All Consensus Picks</a></li>
          <li><a href="/cappers" className="text-emerald-600 hover:underline">Capper Leaderboard</a></li>
          <li><a href="/trends" className="text-emerald-600 hover:underline">Betting Trends</a></li>
        </ul>
      </section>
    </main>
  )
}
