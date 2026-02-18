import { Metadata } from 'next';

const currentDate = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const metadata: Metadata = {
  title: `Free Sports Picks Today (${currentDate}) - Expert Consensus | DailyAI`,
  description: `Get today's best free sports picks from our AI-powered consensus of professional cappers. NFL, NBA, MLB, NHL, and college sports. Fire picks where 3+ experts agree.`,
  keywords: [
    'free sports picks',
    'free picks today',
    'sports betting picks',
    'expert picks',
    'consensus picks',
    'free NFL picks',
    'free NBA picks',
    'free MLB picks',
    'free NHL picks',
    'best free picks',
    'sports predictions',
    'betting predictions',
  ],
  openGraph: {
    title: 'Free Sports Picks Today - Expert Consensus',
    description: 'AI-powered consensus picks from professional cappers. NFL, NBA, MLB, NHL, and college sports.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Sports Picks Today | DailyAI Betting',
    description: 'Free expert picks across NFL, NBA, MLB, NHL, and college sports. No signup needed.',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/free-sports-picks',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Free Sports Picks Today',
  description: 'Expert sports betting picks and predictions from professional handicappers across all major sports',
  url: 'https://dailyaibetting.com/free-sports-picks',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
  about: {
    '@type': 'Thing',
    name: 'Sports Betting',
  },
};

export default function FreeSportsPicksLayout({
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
          <h2 className="text-2xl font-bold mb-4">About Our Free Sports Picks</h2>
          <p className="text-muted-foreground mb-4">
            DailyAI Betting provides free sports picks generated using an AI-powered consensus system.
            We analyze predictions from professional handicappers across NFL, NBA, MLB, NHL, and college sports
            to find high-confidence plays where multiple experts agree.
          </p>

          <h3 className="text-xl font-semibold mb-3">Why Consensus Betting Works</h3>
          <ul className="text-muted-foreground space-y-2 mb-4">
            <li>• Multiple expert opinions reduce individual handicapper variance</li>
            <li>• Fire picks (3+ cappers) represent strongest agreement</li>
            <li>• Real-time updates as new picks are released</li>
            <li>• Coverage across all major sports and bet types</li>
            <li>• 100% free - no subscription required</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Sports We Cover</h3>
          <div className="grid md:grid-cols-3 gap-4 text-muted-foreground mb-4">
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Pro Sports</strong>
              <p className="text-sm mt-1">NFL, NBA, MLB, NHL - daily picks for all major leagues</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">College Sports</strong>
              <p className="text-sm mt-1">NCAAF and NCAAB picks during their respective seasons</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">All Bet Types</strong>
              <p className="text-sm mt-1">Spreads, moneylines, totals - we cover it all</p>
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
