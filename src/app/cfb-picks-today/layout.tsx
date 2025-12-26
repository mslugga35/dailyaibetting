import { Metadata } from 'next';

const currentDate = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export const metadata: Metadata = {
  title: `Free College Football Picks Today (${currentDate}) - Expert Consensus | DailyAI`,
  description: `Get today's best free NCAAF picks from our AI-powered consensus of 10 professional cappers. Fire picks where 3+ experts agree. Spread, moneyline, and totals.`,
  keywords: [
    'college football picks today',
    'free NCAAF picks',
    'CFB expert picks',
    'college football consensus picks',
    'NCAAF betting picks',
    'CFB spread picks',
    'college football best bets',
    'CFB picks today',
    'Saturday football picks',
  ],
  openGraph: {
    title: 'Free College Football Picks Today - Expert Consensus',
    description: 'AI-powered consensus picks from 10 professional cappers. Fire picks where 3+ experts agree.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/cfb-picks-today',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Free College Football Picks Today',
  description: 'Expert NCAAF betting picks and predictions from professional handicappers',
  url: 'https://dailyaibetting.com/cfb-picks-today',
  publisher: {
    '@type': 'Organization',
    name: 'DailyAI Betting',
    url: 'https://dailyaibetting.com',
  },
};

export default function CFBPicksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}

      <section className="container px-4 py-12 border-t mt-8">
        <div className="max-w-4xl mx-auto prose prose-invert">
          <h2 className="text-2xl font-bold mb-4">About Our College Football Picks</h2>
          <p className="text-muted-foreground mb-4">
            Our free college football picks are generated using an AI-powered consensus system that analyzes predictions
            from 10 of the top professional sports handicappers. When 3 or more cappers agree on a pick,
            we flag it as a &quot;fire pick&quot; 🔥 - critical for navigating the massive CFB slate.
          </p>

          <h3 className="text-xl font-semibold mb-3">Why CFB Consensus Picks Work</h3>
          <ul className="text-muted-foreground space-y-2 mb-4">
            <li>• 130+ FBS teams create market inefficiencies</li>
            <li>• Large point spreads (20+) are common and beatable</li>
            <li>• Motivation differences (bowl games, rivalry weeks)</li>
            <li>• Weather impacts outdoor games significantly</li>
            <li>• Home field advantage is huge in college</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">College Football Betting Types</h3>
          <div className="grid md:grid-cols-3 gap-4 text-muted-foreground mb-4">
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Point Spreads</strong>
              <p className="text-sm mt-1">CFB spreads can be 30+ points. Look for garbage time covers.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Moneylines</strong>
              <p className="text-sm mt-1">Big underdogs offer value. Upsets happen more in college.</p>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <strong className="text-foreground">Totals (O/U)</strong>
              <p className="text-sm mt-1">Varies wildly by conference. SEC vs Big 12 play very differently.</p>
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
