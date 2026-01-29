import { Metadata } from 'next';

const currentDate = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const metadata: Metadata = {
  title: `Best Parlay Picks Today (${currentDate}) - High Confidence Legs | DailyAI`,
  description: `Build winning parlays with our highest-confidence picks. Each leg features consensus from 3+ expert cappers. NFL, NBA, MLB, NHL parlay picks daily.`,
  keywords: [
    'parlay picks',
    'parlay picks today',
    'best parlay bets',
    'parlay of the day',
    'free parlay picks',
    'NFL parlay',
    'NBA parlay',
    'MLB parlay',
    'parlay betting',
    'same game parlay',
    'parlay builder',
    'expert parlay picks',
  ],
  openGraph: {
    title: 'Best Parlay Picks Today - High Confidence Legs',
    description: 'Build winning parlays with consensus picks from 3+ expert cappers.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/parlay-picks',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Best Parlay Picks Today',
  description: 'High-confidence parlay legs from expert consensus betting picks',
  url: 'https://dailyaibetting.com/parlay-picks',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
  about: {
    '@type': 'Thing',
    name: 'Parlay Betting',
  },
};

export default function ParlayPicksLayout({
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
          <h2 className="text-2xl font-bold mb-4">About Our Parlay Picks</h2>
          <p className="text-muted-foreground mb-4">
            Our parlay picks are curated from our highest-confidence consensus plays. Each leg
            features agreement from 3 or more professional handicappers, giving you the strongest
            foundation for multi-leg bets.
          </p>

          <h3 className="text-xl font-semibold mb-3">Parlay Betting Strategy</h3>
          <ul className="text-muted-foreground space-y-2 mb-4">
            <li>• <strong>2-3 legs</strong> offer the best balance of risk and reward</li>
            <li>• Focus on <strong>high-confidence consensus</strong> picks for each leg</li>
            <li>• Consider <strong>correlated parlays</strong> within the same game</li>
            <li>• Never chase losses with larger parlays</li>
            <li>• Allocate only 5-10% of bankroll to parlay bets</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Types of Parlays</h3>
          <div className="grid md:grid-cols-3 gap-4 text-muted-foreground mb-4">
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Standard Parlay</strong>
              <p className="text-sm mt-1">Combine picks from multiple games. All legs must hit.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Same Game Parlay</strong>
              <p className="text-sm mt-1">Multiple bets within a single game (SGP).</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Round Robin</strong>
              <p className="text-sm mt-1">Multiple parlay combinations from your selections.</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            <strong>Disclaimer:</strong> Parlays are high-risk bets. Please bet responsibly.
            Our picks are for entertainment purposes only. Must be 21+ to bet.
          </p>
        </div>
      </section>
    </>
  );
}
