import { Metadata } from 'next';

const currentDate = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const metadata: Metadata = {
  title: `Free College Basketball Picks Today (${currentDate}) - Expert Consensus | DailyAI`,
  description: `Get today's best free NCAAB picks from our AI-powered consensus of 10 professional cappers. Fire picks where 3+ experts agree. Spread, moneyline, and totals.`,
  keywords: [
    'college basketball picks today',
    'free NCAAB picks',
    'CBB expert picks',
    'college basketball consensus picks',
    'NCAAB betting picks',
    'CBB spread picks',
    'college basketball best bets',
    'CBB picks today',
    'March Madness picks',
  ],
  openGraph: {
    title: 'Free College Basketball Picks Today - Expert Consensus',
    description: 'AI-powered consensus picks from 10 professional cappers. Fire picks where 3+ experts agree.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/cbb-picks-today',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Free College Basketball Picks Today',
  description: 'Expert NCAAB betting picks and predictions from professional handicappers',
  url: 'https://dailyaibetting.com/cbb-picks-today',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
};

export default function CBBPicksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}

      <section className="container px-4 py-12 border-t mt-8">
        <div className="max-w-4xl mx-auto prose prose-invert">
          <h2 className="text-2xl font-bold mb-4">About Our College Basketball Picks</h2>
          <p className="text-muted-foreground mb-4">
            Our free college basketball picks are generated using an AI-powered consensus system that analyzes predictions
            from 10 of the top professional sports handicappers. When 3 or more cappers agree on a pick,
            we flag it as a &quot;fire pick&quot; 🔥 - essential for the 300+ daily CBB games.
          </p>

          <h3 className="text-xl font-semibold mb-3">Why CBB Consensus Picks Work</h3>
          <ul className="text-muted-foreground space-y-2 mb-4">
            <li>• 350+ Division I teams create massive value opportunities</li>
            <li>• Conference play trends are predictable</li>
            <li>• Home court advantage is stronger than NBA</li>
            <li>• Young players are inconsistent (exploit variance)</li>
            <li>• March Madness creates emotional betting</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">College Basketball Betting Types</h3>
          <div className="grid md:grid-cols-3 gap-4 text-muted-foreground mb-4">
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Point Spreads</strong>
              <p className="text-sm mt-1">Lower scoring means tighter games. 3-point variance is huge.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Moneylines</strong>
              <p className="text-sm mt-1">Upsets are common. Mid-majors beat power schools regularly.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Totals (O/U)</strong>
              <p className="text-sm mt-1">Usually 130-150. Shot clock changes affect pace significantly.</p>
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
