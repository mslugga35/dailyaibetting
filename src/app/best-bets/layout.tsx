import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const currentDate = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const metadata: Metadata = {
  title: `Ranked Consensus Picks Today (${currentDate}) | DailyAI`,
  description: `Today's consensus picks ranked by how many expert cappers chose the same bet. NFL, NBA, MLB and NHL picks. No outcome is guaranteed.`,
  keywords: [
    'ranked consensus picks',
    'consensus picks today',
    'top consensus picks',
    'capper agreement',
    'NFL consensus picks',
    'NBA consensus picks',
    'betting picks ranked',
  ],
  openGraph: {
    title: 'Ranked Consensus Picks Today',
    description: 'Today\'s picks ranked by how many expert cappers chose the same bet.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ranked Consensus Picks Today | DailyAI Betting',
    description: 'Today\'s picks ranked by how many expert cappers chose the same bet.',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/best-bets',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Ranked Consensus Picks Today',
  description: 'Sports betting picks ranked by how many expert cappers chose the same bet',
  url: 'https://dailyaibetting.com/best-bets',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
  about: {
    '@type': 'Thing',
    name: 'Sports Betting Consensus Picks',
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
          <h2 className="text-2xl font-bold mb-4">About These Rankings</h2>
          <p className="text-muted-foreground mb-4">
            This page lists today&apos;s consensus picks in order of capper agreement. Each pick was chosen
            independently by at least three expert cappers.
          </p>

          <h3 className="text-xl font-semibold mb-3">Ranking Criteria</h3>
          <ul className="text-muted-foreground space-y-2 mb-4">
            <li>• <strong>Minimum 3 cappers</strong> must independently select the same bet</li>
            <li>• <strong>Ranked by agreement</strong> - more experts = higher ranking</li>
            <li>• <strong>Same bet type</strong> - spread, moneyline, and totals tracked separately</li>
            <li>• <strong>Updated throughout the day</strong> as cappers release picks</li>
            <li>• <strong>Cross-sport comparison</strong> - picks ranked across all sports</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">How to Use These Rankings</h3>
          <div className="grid md:grid-cols-2 gap-4 text-muted-foreground mb-4">
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">As a Starting Point</strong>
              <p className="text-sm mt-1">Use the rankings to see where cappers agree, then do your own research before betting.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Bankroll Management</strong>
              <p className="text-sm mt-1">Only bet what you can afford to lose. Capper agreement does not reduce the risk of a bet.</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-3">How Consensus Works</h3>
          <p className="text-muted-foreground mb-4">
            Consensus means several expert cappers independently chose the same pick. It shows agreement
            between cappers, not a predicted or guaranteed outcome.
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
