import { Metadata } from 'next';

const currentDate = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const metadata: Metadata = {
  title: `Free NBA Picks Today (${currentDate}) - Expert Consensus | DailyAI`,
  description: `Get today's free NBA picks from a consensus of multiple expert cappers. Fire picks where 3+ cappers agree. Spread, moneyline, and totals.`,
  keywords: [
    'NBA picks today',
    'free NBA picks',
    'NBA expert picks',
    'NBA consensus picks',
    'NBA betting picks',
    'NBA spread picks',
    'NBA moneyline picks',
    'basketball picks today',
  ],
  openGraph: {
    title: 'Free NBA Picks Today - Expert Consensus',
    description: 'Consensus picks from multiple expert cappers. Fire picks where 3+ cappers agree.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/nba-picks-today',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Free NBA Picks Today',
  description: 'NBA betting picks and predictions from expert cappers',
  url: 'https://dailyaibetting.com/nba-picks-today',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
};

export default function NBAPicksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}

      <section className="container px-4 py-12 border-t mt-8">
        <div className="max-w-4xl mx-auto prose prose-invert">
          <h2 className="text-2xl font-bold mb-4">About Our NBA Picks</h2>
          <p className="text-muted-foreground mb-4">
            Our free NBA picks are built by an AI-powered consensus system that collects picks
            from multiple expert cappers each day. When 3 or more cappers agree on a pick,
            we flag it as a &quot;fire pick&quot; 🔥. Consensus means several cappers chose the same pick; no outcome is guaranteed.
          </p>

          <h3 className="text-xl font-semibold mb-3">How NBA consensus picks are built</h3>
          <ul className="text-muted-foreground space-y-2 mb-4">
            <li>• Picks are collected from multiple expert cappers each day</li>
            <li>• Picks update throughout the day</li>
            <li>• A pick becomes consensus when several cappers back the same side</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">NBA Betting Types We Cover</h3>
          <div className="grid md:grid-cols-3 gap-4 text-muted-foreground mb-4">
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Point Spreads</strong>
              <p className="text-sm mt-1">NBA spreads typically range from 1 to 15 points based on matchup.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Moneylines</strong>
              <p className="text-sm mt-1">Pick the outright winner.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Totals (O/U)</strong>
              <p className="text-sm mt-1">NBA totals range from 200-240 based on pace and defense.</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            <strong>Disclaimer:</strong> Sports betting involves risk. Please bet responsibly.
            Our picks are for entertainment and informational purposes only. Must be 21+ to bet.
          </p>
        </div>
      </section>
    </>
  );
}
