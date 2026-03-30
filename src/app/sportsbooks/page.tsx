import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SportsbookLinks, SPORTSBOOKS } from '@/components/monetization/SportsbookLinks';
import { ExternalLink, Zap, Shield, Award, Clock } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'Live Odds',
    description: 'Real-time odds updates across all major sportsbooks',
  },
  {
    icon: Shield,
    title: 'Secure',
    description: 'Licensed and regulated by major sports betting commissions',
  },
  {
    icon: Award,
    title: 'Competitive',
    description: 'Compare lines across sportsbooks to find the best value',
  },
  {
    icon: Clock,
    title: 'Fast Cashouts',
    description: 'Quick deposit and withdrawal processes',
  },
];

export default function SportsbooksPage() {
  return (
    <div className="container px-4 py-8">
      {/* Hero */}
      <section className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Where to Place Your Bets
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Choose from the most trusted and competitive sportsbooks. Compare odds and find the
          best value for your bets.
        </p>
        <SportsbookLinks variant="full" className="max-w-2xl mx-auto" />
      </section>

      {/* Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Why Use These Sportsbooks?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <Icon className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Sportsbook Details */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Sportsbook Details</h2>
        <div className="space-y-4">
          {SPORTSBOOKS.map((book) => (
            <Card key={book.name}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{book.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Fast registration and competitive odds
                    </p>
                  </div>
                  <a
                    href={book.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold ${book.color} transition-colors`}
                  >
                    Visit {book.name}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Which sportsbook should I choose?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Each sportsbook has its strengths. DraftKings and FanDuel offer the best odds
                and user experience for most bettors. BetMGM and Caesars are great alternatives
                with competitive promotions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Are these sportsbooks legal?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes, all featured sportsbooks are licensed and regulated in states where sports
                betting is legal. Check your local regulations to see if you can use each
                sportsbook.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I use multiple sportsbooks?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Absolutely! Many experienced bettors maintain accounts with multiple sportsbooks
                to compare odds and find the best value for each bet.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What about responsible betting?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                All sportsbooks have tools to help with responsible gambling including deposit
                limits, self-exclusion options, and access to support resources. Bet responsibly
                and never wager more than you can afford to lose.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/5 border border-primary/20 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to start betting?</h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Sign up with any of our featured sportsbooks and start using our AI-powered consensus
          picks to find value bets.
        </p>
        <SportsbookLinks variant="compact" className="justify-center" />
      </section>
    </div>
  );
}
