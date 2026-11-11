import { Metadata } from 'next';

const currentDate = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const metadata: Metadata = {
  title: `Expert Sports Picks Today (${currentDate}) - Expert Capper Consensus | DailyAI`,
  description: `Expert sports picks from the cappers we track, ranked by consensus agreement. Top consensus (4+), fire picks (3+). NFL, NBA, MLB, NHL.`,
  keywords: [
    'expert picks',
    'expert sports picks',
    'expert capper picks',
    'expert picks today',
    'expert betting picks',
    'capper consensus',
    'expert NFL picks',
    'expert NBA picks',
    'sports expert predictions',
    'consensus sports picks',
  ],
  openGraph: {
    title: 'Expert Sports Picks Today - Expert Capper Consensus',
    description: 'Picks from expert cappers ranked by how many chose the same bet.',
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
  description: 'Expert capper picks ranked by consensus agreement',
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
            Our expert picks are aggregated from the expert cappers we track.
            We track services like BetFirm, Dimers, Covers, and SportsLine to identify consensus plays
            where multiple experts independently arrive at the same pick.
          </p>

          <h3 className="text-xl font-semibold mb-3">Agreement Levels</h3>
          <ul className="text-muted-foreground space-y-2 mb-4">
            <li>• <strong>Top consensus (4+ experts)</strong> - four or more cappers chose the same pick</li>
            <li>• <strong>Fire (3 experts)</strong> - three cappers chose the same pick</li>
            <li>• <strong>Standard (2 experts)</strong> - two cappers chose the same pick</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">How Expert Consensus Works</h3>
          <div className="grid md:grid-cols-2 gap-4 text-muted-foreground mb-4">
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Capper Count</strong>
              <p className="text-sm mt-1">Each pick shows how many of the cappers we track chose the same bet.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Independent Analysis</strong>
              <p className="text-sm mt-1">Each capper uses their own methodology. Agreement means they reached the same pick; no outcome is guaranteed.</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-3">Cappers We Track</h3>
          <p className="text-muted-foreground mb-4">
            We monitor picks from Dave Price, Jack Jones, Matt Fargo, Pure Lock (BetFirm), Chris Vasile,
            Quinn Allen (Covers), Dimers AI, SportsLine projections, and other expert cappers.
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
