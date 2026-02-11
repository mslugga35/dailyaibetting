import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const currentDate = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const metadata: Metadata = {
  title: `Best Bets Today (${currentDate}) - Top Ranked Picks | DailyAI`,
  description: `Today's best bets ranked by expert consensus. Our highest-confidence plays where multiple professional handicappers agree. NFL, NBA, MLB, NHL best bets.`,
  keywords: [
    'best bets today',
    'best bets',
    'top picks today',
    'best sports bets',
    'highest confidence picks',
    'lock of the day',
    'best NFL bets',
    'best NBA bets',
    'sure bets',
    'top consensus picks',
    'betting picks ranked',
  ],
  openGraph: {
    title: 'Best Bets Today - Top Ranked Picks',
    description: 'Our highest-confidence plays ranked by expert consensus agreement.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/best-bets',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Best Bets Today',
  description: 'Top ranked sports betting picks by expert consensus',
  url: 'https://dailyaibetting.com/best-bets',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
  about: {
    '@type': 'Thing',
    name: 'Sports Betting Best Bets',
  },
};

export default function BestBetsLayout({
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
          <h2 className="text-2xl font-bold mb-4">About Our Best Bets</h2>
          <p className="text-muted-foreground mb-4">
            Best Bets represent our highest-confidence plays of the day. These picks have the strongest
            consensus from professional handicappers - when the experts agree, it&apos;s worth paying attention.
          </p>

          <h3 className="text-xl font-semibold mb-3">Best Bet Selection Criteria</h3>
          <ul className="text-muted-foreground space-y-2 mb-4">
            <li>• <strong>Minimum 3 cappers</strong> must independently select the same bet</li>
            <li>• <strong>Ranked by agreement</strong> - more experts = higher ranking</li>
            <li>• <strong>Same bet type</strong> - spread, moneyline, and totals tracked separately</li>
            <li>• <strong>Updated in real-time</strong> as handicappers release picks</li>
            <li>• <strong>Cross-sport comparison</strong> - best bets ranked across all sports</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">How to Use Best Bets</h3>
          <div className="grid md:grid-cols-2 gap-4 text-muted-foreground mb-4">
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">As a Starting Point</strong>
              <p className="text-sm mt-1">Use best bets to identify value, then do your own research before betting.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Bankroll Management</strong>
              <p className="text-sm mt-1">Consider larger unit sizes on best bets vs. standard plays.</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-3">Why Consensus Outperforms</h3>
          <p className="text-muted-foreground mb-4">
            When multiple professional handicappers independently identify the same play, it often indicates
            line value that the market has mispriced. These convergence points historically outperform
            random selection and can provide an edge against the sportsbooks.
          </p>

          <p className="text-sm text-muted-foreground">
            <strong>Disclaimer:</strong> No bet is guaranteed. Sports betting involves risk.
            Our picks are for entertainment purposes only. Must be 21+ to bet.
          </p>
        </div>
      </section>
    </>
  );
}
