import { Metadata } from 'next';

const currentDate = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const metadata: Metadata = {
  title: `Free NFL Picks Today (${currentDate}) - Expert Consensus | DailyAI`,
  description: `Get today's best free NFL picks from our AI-powered consensus of 10 professional cappers. Fire picks where 3+ experts agree. Spread, moneyline, and totals.`,
  keywords: [
    'NFL picks today',
    'free NFL picks',
    'NFL expert picks',
    'NFL consensus picks',
    'NFL betting picks',
    'NFL spread picks',
    'NFL moneyline picks',
    'NFL best bets',
    'football picks today',
  ],
  openGraph: {
    title: 'Free NFL Picks Today - Expert Consensus',
    description: 'AI-powered consensus picks from 10 professional cappers. Fire picks where 3+ experts agree.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/nfl-picks-today',
  },
};

// Structured data for SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Free NFL Picks Today',
  description: 'Expert NFL betting picks and predictions from professional handicappers',
  url: 'https://dailyaibetting.com/nfl-picks-today',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
  about: {
    '@type': 'Thing',
    name: 'NFL Football Betting',
  },
};

export default function NFLPicksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}

      {/* SEO Content Footer */}
      <section className="container px-4 py-12 border-t mt-8">
        <div className="max-w-4xl mx-auto prose prose-invert">
          <h2 className="text-2xl font-bold mb-4">About Our NFL Picks</h2>
          <p className="text-muted-foreground mb-4">
            Our free NFL picks are generated using an AI-powered consensus system that analyzes predictions
            from 10 of the top professional sports handicappers. When 3 or more cappers agree on a pick,
            we flag it as a &quot;fire pick&quot; 🔥 - these high-consensus picks historically show stronger performance.
          </p>

          <h3 className="text-xl font-semibold mb-3">How We Pick NFL Winners</h3>
          <ul className="text-muted-foreground space-y-2 mb-4">
            <li>• Aggregate picks from 10+ professional handicappers daily</li>
            <li>• Identify consensus where multiple experts agree</li>
            <li>• Flag &quot;fire picks&quot; with 3+ capper agreement</li>
            <li>• Cover spreads, moneylines, and totals (over/under)</li>
            <li>• Update picks in real-time as games approach</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">NFL Betting Types We Cover</h3>
          <div className="grid md:grid-cols-3 gap-4 text-muted-foreground mb-4">
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Point Spreads</strong>
              <p className="text-sm mt-1">Bet on the margin of victory. The favorite must win by more than the spread.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Moneylines</strong>
              <p className="text-sm mt-1">Simply pick the winner. Odds vary based on team strength.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Totals (O/U)</strong>
              <p className="text-sm mt-1">Bet on combined score going over or under the posted total.</p>
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
