import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Star, Gift, Shield, Zap, ExternalLink, Check, HelpCircle, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Best Sports Betting Apps 2025 - Sportsbook Bonuses & Promos | DailyAI',
  description: 'Compare the best sports betting apps and sportsbook bonuses for 2025. Get up to $1,500 in signup bonuses from DraftKings, FanDuel, BetMGM, and more. Exclusive promo codes.',
  keywords: [
    'best sports betting apps',
    'sportsbook bonus',
    'DraftKings promo code',
    'FanDuel bonus',
    'BetMGM promo',
    'sports betting signup bonus',
    'best sportsbook 2025',
    'Caesars sportsbook promo',
    'ESPN BET bonus',
    'legal sports betting',
  ],
  openGraph: {
    title: 'Best Sports Betting Apps & Bonuses 2025',
    description: 'Compare top sportsbooks and claim up to $1,500 in signup bonuses.',
    type: 'website',
  },
};

// UTM parameters for tracking - Update affiliate IDs when approved
const UTM_SOURCE = 'dailyaibetting';
const UTM_MEDIUM = 'affiliate';
const UTM_CAMPAIGN = 'sportsbooks';

function buildAffiliateUrl(baseUrl: string, sportsbook: string): string {
  const utm = `utm_source=${UTM_SOURCE}&utm_medium=${UTM_MEDIUM}&utm_campaign=${UTM_CAMPAIGN}&utm_content=${sportsbook.toLowerCase().replace(/\s/g, '')}`;
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${utm}`;
}

// Sportsbook data with affiliate tracking
const sportsbooks = [
  {
    name: 'DraftKings',
    logo: '🏈',
    rating: 4.9,
    bonus: 'Bet $5, Get $150 in Bonus Bets',
    bonusValue: '$150',
    promoCode: 'DAILYAI',
    pros: ['Best mobile app', 'Fast payouts', 'Live streaming', '24/7 support'],
    cons: ['Lower odds occasionally'],
    features: ['Live betting', 'Same-game parlays', 'Odds boosts', 'DK Rewards'],
    baseUrl: 'https://sportsbook.draftkings.com',
    states: ['AZ', 'CO', 'CT', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MA', 'MD', 'MI', 'NH', 'NJ', 'NY', 'OH', 'OR', 'PA', 'TN', 'VA', 'WV', 'WY'],
    highlight: true,
  },
  {
    name: 'FanDuel',
    logo: '🏀',
    rating: 4.8,
    bonus: 'Bet $5, Get $150 in Bonus Bets',
    bonusValue: '$150',
    promoCode: 'DAILYAI',
    pros: ['Best odds', 'User-friendly', 'Great daily promos', 'Fast withdrawals'],
    cons: ['Withdrawal limits'],
    features: ['Live betting', 'Cash out', 'Parlay insurance', 'Same-game parlays'],
    baseUrl: 'https://sportsbook.fanduel.com',
    states: ['AZ', 'CO', 'CT', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MA', 'MD', 'MI', 'NH', 'NJ', 'NY', 'OH', 'PA', 'TN', 'VA', 'WV', 'WY'],
    highlight: true,
  },
  {
    name: 'BetMGM',
    logo: '🎰',
    rating: 4.7,
    bonus: 'Up to $1,500 in Bonus Bets',
    bonusValue: '$1,500',
    promoCode: 'DAILYAI',
    pros: ['Highest bonus', 'MGM Rewards', 'Wide market selection', 'Great parlay builder'],
    cons: ['App can be slow'],
    features: ['Edit my bet', 'Live streaming', 'Parlays+', 'One Game Parlay'],
    baseUrl: 'https://sports.betmgm.com',
    states: ['AZ', 'CO', 'DC', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MA', 'MD', 'MI', 'MS', 'NJ', 'NV', 'NY', 'OH', 'PA', 'TN', 'VA', 'WV', 'WY'],
    highlight: false,
  },
  {
    name: 'Caesars',
    logo: '👑',
    rating: 4.6,
    bonus: 'Up to $1,000 First Bet',
    bonusValue: '$1,000',
    promoCode: 'DAILYAI',
    pros: ['Caesars Rewards tier credits', 'Competitive odds', 'Hotel comps', 'Wide state coverage'],
    cons: ['Fewer daily promos'],
    features: ['Same-game parlays', 'Profit boosts', 'Early cash out', 'Dynasty Rewards'],
    baseUrl: 'https://www.caesars.com/sportsbook-and-casino',
    states: ['AZ', 'CO', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MA', 'MD', 'MI', 'NJ', 'NV', 'NY', 'OH', 'PA', 'TN', 'VA', 'WV', 'WY'],
    highlight: false,
  },
  {
    name: 'ESPN BET',
    logo: '📺',
    rating: 4.5,
    bonus: 'Bet $10, Get $150 + Hollywood Perks',
    bonusValue: '$150',
    promoCode: 'DAILYAI',
    pros: ['ESPN integration', 'Easy to use', 'Hollywood Casino perks', 'ESPN+ included'],
    cons: ['Newer platform', 'Fewer markets'],
    features: ['ESPN content', 'Live betting', 'Boosts', 'Quick picks'],
    baseUrl: 'https://espnbet.com',
    states: ['AZ', 'CO', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MA', 'MD', 'MI', 'NJ', 'OH', 'PA', 'TN', 'VA', 'WV'],
    highlight: false,
  },
  {
    name: 'bet365',
    logo: '🌍',
    rating: 4.5,
    bonus: 'Bet $1, Get $150 in Bonus Bets',
    bonusValue: '$150',
    promoCode: 'DAILYAI365',
    pros: ['Global brand', 'Best live betting', 'Extensive markets', 'Early payout offers'],
    cons: ['Limited US states', 'Complex interface'],
    features: ['Live streaming', 'Cash out', 'Bet builder', 'Edit bet'],
    baseUrl: 'https://www.bet365.com',
    states: ['CO', 'IA', 'IN', 'KY', 'LA', 'NJ', 'OH', 'VA'],
    highlight: false,
  },
  {
    name: 'Hard Rock Bet',
    logo: '🎸',
    rating: 4.4,
    bonus: 'No Sweat First Bet up to $100',
    bonusValue: '$100',
    promoCode: 'DAILYROCK',
    pros: ['Hard Rock Rewards', 'Sleek app', 'Quick registration', 'Hotel perks'],
    cons: ['Fewer states', 'Lower bonus'],
    features: ['Live betting', 'Parlays', 'Cash out', 'Rewards program'],
    baseUrl: 'https://www.hardrock.bet',
    states: ['AZ', 'FL', 'IN', 'NJ', 'OH', 'TN', 'VA'],
    highlight: false,
  },
];

// FAQ data for SEO
const faqs = [
  {
    question: 'What is the best sports betting app in 2025?',
    answer: 'DraftKings and FanDuel are consistently rated as the top sports betting apps in 2025. DraftKings offers the best mobile experience and rewards program, while FanDuel typically has the best odds and most user-friendly interface. Both offer $150 in bonus bets for new users.',
  },
  {
    question: 'Which sportsbook has the biggest signup bonus?',
    answer: 'BetMGM currently offers the highest signup bonus at up to $1,500 in bonus bets if your first bet loses. Caesars Sportsbook offers up to $1,000, while DraftKings and FanDuel offer $150 guaranteed bonus bets.',
  },
  {
    question: 'Are online sportsbooks legal?',
    answer: 'Yes, online sports betting is legal in over 30 US states. Each state regulates its own market, so availability varies. All sportsbooks listed on this page are fully licensed and regulated in their operating states.',
  },
  {
    question: 'How do sportsbook promo codes work?',
    answer: 'Promo codes unlock special signup bonuses when you create a new account. Enter the code during registration (like DAILYAI) to activate bonus bets, deposit matches, or other promotions. Each code can typically only be used once per person.',
  },
  {
    question: 'Can I use multiple sportsbook apps?',
    answer: "Yes! Most bettors use 2-3 sportsbook apps to compare odds and maximize bonuses. You can claim the signup bonus at each sportsbook separately. This is called 'line shopping' and is a smart betting strategy.",
  },
  {
    question: 'How long do withdrawals take?',
    answer: 'Withdrawal times vary by sportsbook and payment method. E-wallets like PayPal are fastest (24-48 hours). Bank transfers take 3-5 business days. DraftKings and FanDuel are known for the fastest payouts in the industry.',
  },
];

export default function SportsbooksPage() {
  return (
    <div className="container px-4 py-8">
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })
        }}
      />

      {/* Header */}
      <div className="mb-8 text-center">
        <Badge className="mb-4">Updated December 2025</Badge>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Best Sports Betting Apps & Bonuses
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Compare top sportsbooks and claim up to $1,500 in signup bonuses.
          All apps are legal, licensed, and tested by our team.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
          <span>Available in: </span>
          {['NJ', 'PA', 'NY', 'OH', 'MI', 'IL', 'CO', 'AZ', 'VA', 'MA'].map(state => (
            <Badge key={state} variant="outline" className="text-xs">{state}</Badge>
          ))}
          <span className="text-muted-foreground">+20 more</span>
        </div>
      </div>

      {/* Quick Comparison Table */}
      <Card className="mb-8 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sportsbook</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Best For</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sportsbooks.map((book) => (
                  <TableRow key={book.name} className={book.highlight ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{book.logo}</span>
                        <span className="font-semibold">{book.name}</span>
                        {book.highlight && <Badge className="bg-primary">Top Pick</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span>{book.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-primary">{book.bonusValue}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {book.pros[0]}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm">
                        <a
                          href={buildAffiliateUrl(book.baseUrl, book.name)}
                          target="_blank"
                          rel="sponsored noopener"
                          className="gap-1"
                        >
                          Claim Bonus
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Cards */}
      <div className="space-y-6 mb-12">
        {sportsbooks.map((book, index) => (
          <Card key={book.name} className={book.highlight ? 'border-primary' : ''}>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left - Logo & Rating */}
                <div className="flex flex-col items-center lg:w-48">
                  <span className="text-6xl mb-2">{book.logo}</span>
                  <h2 className="text-xl font-bold">{book.name}</h2>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(book.rating)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-muted'
                        }`}
                      />
                    ))}
                    <span className="text-sm ml-1">{book.rating}/5</span>
                  </div>
                  {book.highlight && (
                    <Badge className="mt-2 bg-primary">#{index + 1} Rated</Badge>
                  )}
                </div>

                {/* Middle - Details */}
                <div className="flex-1 grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-primary mb-2 flex items-center gap-1">
                      <Check className="h-4 w-4" /> Pros
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {book.pros.map((pro) => (
                        <li key={pro} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Features</h3>
                    <div className="flex flex-wrap gap-1">
                      {book.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right - Bonus & CTA */}
                <div className="lg:w-64 flex flex-col items-center justify-center p-4 bg-primary/10 rounded-lg">
                  <Gift className="h-8 w-8 text-primary mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Welcome Bonus</p>
                  <p className="text-2xl font-bold text-primary mb-1">{book.bonusValue}</p>
                  <p className="text-xs text-center text-muted-foreground mb-4">
                    {book.bonus}
                  </p>
                  <Button asChild className="w-full">
                    <a
                      href={buildAffiliateUrl(book.baseUrl, book.name)}
                      target="_blank"
                      rel="sponsored noopener"
                      className="gap-2"
                    >
                      Claim Bonus
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  {book.promoCode && (
                    <p className="text-xs mt-2 text-muted-foreground">
                      Code: <span className="font-mono font-bold">{book.promoCode}</span>
                    </p>
                  )}
                  <p className="text-xs mt-2 text-muted-foreground">
                    {book.states.length} states
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trust Signals */}
      <Card className="mb-8">
        <CardContent className="py-6">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-sm">Licensed & Legal</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500" />
              <span className="text-sm">Tested by Our Team</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-sm">Fast Payouts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-sm">
                  {index + 1}
                </span>
                {faq.question}
              </h3>
              <p className="text-sm text-muted-foreground pl-8">
                {faq.answer}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CTA Banner */}
      <Card className="mb-8 bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30">
        <CardContent className="py-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to Start Betting?</h2>
          <p className="text-muted-foreground mb-4">
            Sign up with multiple sportsbooks to maximize your bonuses and compare odds.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <a href={buildAffiliateUrl(sportsbooks[0].baseUrl, sportsbooks[0].name)} target="_blank" rel="sponsored noopener">
                Get DraftKings $150 Bonus
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={buildAffiliateUrl(sportsbooks[1].baseUrl, sportsbooks[1].name)} target="_blank" rel="sponsored noopener">
                Get FanDuel $150 Bonus
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Internal Links */}
      <div className="text-center mb-8">
        <p className="text-sm text-muted-foreground mb-4">Use your bonus on today&apos;s best picks:</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="link">
            <Link href="/">Today&apos;s Consensus Picks</Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/results">Our Track Record</Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/best-bets">Best Bets</Link>
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-muted-foreground max-w-2xl mx-auto">
        <p className="mb-2">
          <strong>Affiliate Disclosure:</strong> Some links on this page are affiliate links.
          If you sign up through our links, we may earn a commission at no extra cost to you.
          We only recommend sportsbooks we trust.
        </p>
        <p>
          <strong>Gambling Problem?</strong> Call 1-800-GAMBLER. Must be 21+. Terms apply.
        </p>
      </div>
    </div>
  );
}
