import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Soccer Picks Today - Expert Consensus Picks',
  description: 'Get free soccer picks today from multiple expert cappers. See where several cappers back the same side. Picks update throughout the day, with moneyline, spread, and total goals picks.',
  keywords: 'free soccer picks today, soccer betting picks, soccer consensus picks, soccer expert picks, MLS picks, Champions League picks',
}

export default function SoccerPicksToday() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Free Soccer Picks Today</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Consensus picks from multiple expert cappers. Picks update throughout the day, and we highlight plays where several cappers agree.
      </p>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">🔥 Today&apos;s Soccer Consensus Picks</h2>
        <p className="mb-4">
          Our AI collects picks from expert cappers and flags plays where 3 or more cappers agree on the same play.
          Consensus means several cappers chose the same pick; no outcome is guaranteed.
        </p>
        <a
          href="/consensus"
          className="inline-block bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-800"
        >
          View Today&apos;s Consensus Picks (all sports) →
        </a>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">How Soccer consensus picks are built</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">1. Collect Picks</h3>
            <p className="text-sm text-muted-foreground">Picks are collected from multiple expert cappers each day.</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">2. Updates</h3>
            <p className="text-sm text-muted-foreground">Picks update throughout the day.</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">3. 🔥 Consensus</h3>
            <p className="text-sm text-muted-foreground">A pick becomes consensus when several cappers back the same side.</p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Soccer Betting Resources</h2>
        <ul className="space-y-2">
          <li><a href="/consensus" className="text-emerald-600 hover:underline">All Consensus Picks</a></li>
          <li><a href="/cappers" className="text-emerald-600 hover:underline">Capper Leaderboard</a></li>
          <li><a href="/trends" className="text-emerald-600 hover:underline">Betting Trends</a></li>
        </ul>
      </section>
    </main>
  )
}
