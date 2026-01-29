import { Metadata } from 'next';

const currentDate = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const metadata: Metadata = {
  title: `Expert Sports Picks Today (${currentDate}) - Pro Handicapper Consensus | DailyAI`,
  description: `Get expert sports picks from professional handicappers. Ranked by consensus agreement. Premium picks (4+), fire picks (3+). NFL, NBA, MLB, NHL experts.`,
  keywords: [
    'expert picks',
    'expert sports picks',
    'professional handicapper picks',
    'pro picks today',
    'expert betting picks',
    'handicapper consensus',
    'expert NFL picks',
    'expert NBA picks',
    'sports expert predictions',
    'professional sports picks',
  ],
  openGraph: {
    title: 'Expert Sports Picks Today - Pro Handicapper Consensus',
    description: 'Curated picks from professional handicappers ranked by expert agreement.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/expert-picks',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Expert Sports Picks Today',
  description: 'Professional handicapper picks ranked by consensus agreement',
  url: 'https://dailyaibetting.com/expert-picks',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
  about: {
    '@type': 'Thing',
    name: 'Expert Sports Betting',
  },
};

export default function ExpertPicksLayout({
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
          <h2 className="text-2xl font-bold mb-4">About Our Expert Picks</h2>
          <p className="text-muted-foreground mb-4">
            Our expert picks are aggregated from professional handicappers with documented track records.
            We track services like BetFirm, Dimers, Covers, and SportsLine to identify consensus plays
            where multiple experts independently arrive at the same conclusion.
          </p>

          <h3 className="text-xl font-semibold mb-3">Expert Confidence Levels</h3>
          <ul className="text-muted-foreground space-y-2 mb-4">
            <li>• <strong>Premium (4+ experts)</strong> - Highest confidence, rare opportunities</li>
            <li>• <strong>Fire (3 experts)</strong> - Strong consensus, reliable plays</li>
            <li>• <strong>Standard (2 experts)</strong> - Moderate agreement, good value potential</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Why Expert Consensus Matters</h3>
          <div className="grid md:grid-cols-2 gap-4 text-muted-foreground mb-4">
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Reduced Variance</strong>
              <p className="text-sm mt-1">Multiple expert opinions smooth out individual handicapper streaks and biases.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Independent Analysis</strong>
              <p className="text-sm mt-1">Each capper uses their own methodology - agreement signals strong value.</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-3">Cappers We Track</h3>
          <p className="text-muted-foreground mb-4">
            We monitor picks from Dave Price, Jack Jones, Matt Fargo, Pure Lock (BetFirm), Chris Vasile,
            Quinn Allen (Covers), Dimers AI, SportsLine projections, and other verified professionals.
          </p>

          <p className="text-sm text-muted-foreground">
            <strong>Disclaimer:</strong> Past performance does not guarantee future results.
            Our picks are for entertainment purposes only. Must be 21+ to bet.
          </p>
        </div>
      </section>
    </>
  );
}
