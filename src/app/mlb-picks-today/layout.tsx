import { Metadata } from 'next';

const currentDate = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const metadata: Metadata = {
  title: `Free MLB Picks Today (${currentDate}) - Expert Consensus | DailyAI`,
  description: `Get today's best free MLB picks from our AI-powered consensus of 10 professional cappers. Fire picks where 3+ experts agree. Runlines, moneylines, and totals.`,
  keywords: [
    'MLB picks today',
    'free MLB picks',
    'MLB expert picks',
    'MLB consensus picks',
    'MLB betting picks',
    'MLB runline picks',
    'MLB moneyline picks',
    'MLB best bets',
    'baseball picks today',
  ],
  openGraph: {
    title: 'Free MLB Picks Today - Expert Consensus',
    description: 'AI-powered consensus picks from 10 professional cappers. Fire picks where 3+ experts agree.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/mlb-picks-today',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Free MLB Picks Today',
  description: 'Expert MLB betting picks and predictions from professional handicappers',
  url: 'https://dailyaibetting.com/mlb-picks-today',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
};

export default function MLBPicksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}

      <section className="container px-4 py-12 border-t mt-8">
        <div className="max-w-4xl mx-auto prose prose-invert">
          <h2 className="text-2xl font-bold mb-4">About Our MLB Picks</h2>
          <p className="text-muted-foreground mb-4">
            Our free MLB picks are generated using an AI-powered consensus system that analyzes predictions
            from 10 of the top professional sports handicappers. When 3 or more cappers agree on a pick,
            we flag it as a &quot;fire pick&quot; 🔥 - especially valuable in baseball where value is key.
          </p>

          <h3 className="text-xl font-semibold mb-3">Why MLB Consensus Picks Work</h3>
          <ul className="text-muted-foreground space-y-2 mb-4">
            <li>• 162-game season provides massive sample size</li>
            <li>• Starting pitcher matchups are highly predictable</li>
            <li>• Bullpen fatigue creates exploitable spots</li>
            <li>• Home/away splits are more pronounced in baseball</li>
            <li>• Day games after night games favor underdogs</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">MLB Betting Types We Cover</h3>
          <div className="grid md:grid-cols-3 gap-4 text-muted-foreground mb-4">
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Runlines (-1.5)</strong>
              <p className="text-sm mt-1">The baseball version of spread betting. Favorite must win by 2+.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Moneylines</strong>
              <p className="text-sm mt-1">Most popular MLB bet type. Simply pick the winner.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Totals (O/U)</strong>
              <p className="text-sm mt-1">Typically 7-9 runs. Consider park factors and weather.</p>
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
