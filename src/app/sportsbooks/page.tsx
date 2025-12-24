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
import { Star, Gift, Shield, Zap, ExternalLink, Check } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Best Sports Betting Apps 2025 - Sportsbook Bonuses & Promos',
  description: 'Compare the best sports betting apps and sportsbook bonuses for 2025. Get up to $1,000 in signup bonuses from DraftKings, FanDuel, BetMGM, and more.',
  keywords: [
    'best sports betting apps',
    'sportsbook bonus',
    'DraftKings promo code',
    'FanDuel bonus',
    'BetMGM promo',
    'sports betting signup bonus',
    'best sportsbook 2025',
  ],
};

// Sportsbook data - UPDATE AFFILIATE LINKS when you get approved
const sportsbooks = [
  {
    name: 'DraftKings',
    logo: '🏈',
    rating: 4.9,
    bonus: 'Bet $5, Get $150 in Bonus Bets',
    bonusValue: '$150',
    promoCode: 'DAILYAI',
    pros: ['Best mobile app', 'Fast payouts', 'Live streaming'],
    cons: ['Lower odds occasionally'],
    features: ['Live betting', 'Same-game parlays', 'Odds boosts'],
    affiliateUrl: 'https://draftkings.com', // Replace with your affiliate link
    highlight: true,
  },
  {
    name: 'FanDuel',
    logo: '🏀',
    rating: 4.8,
    bonus: 'Bet $5, Get $150 in Bonus Bets',
    bonusValue: '$150',
    promoCode: 'DAILYAI',
    pros: ['Best odds', 'User-friendly', 'Great promos'],
    cons: ['Withdrawal limits'],
    features: ['Live betting', 'Cash out', 'Parlay insurance'],
    affiliateUrl: 'https://fanduel.com', // Replace with your affiliate link
    highlight: true,
  },
  {
    name: 'BetMGM',
    logo: '🎰',
    rating: 4.7,
    bonus: 'Up to $1,500 in Bonus Bets',
    bonusValue: '$1,500',
    promoCode: 'DAILYAI',
    pros: ['Huge bonus', 'Rewards program', 'Wide market selection'],
    cons: ['App can be slow'],
    features: ['Edit my bet', 'Live streaming', 'Parlays+'],
    affiliateUrl: 'https://betmgm.com', // Replace with your affiliate link
    highlight: false,
  },
  {
    name: 'Caesars',
    logo: '👑',
    rating: 4.6,
    bonus: 'Up to $1,000 First Bet',
    bonusValue: '$1,000',
    promoCode: 'DAILYAI',
    pros: ['Caesars Rewards', 'Competitive odds', 'Live betting'],
    cons: ['Fewer promos'],
    features: ['Same-game parlays', 'Profit boosts', 'Early cash out'],
    affiliateUrl: 'https://caesars.com/sportsbook', // Replace with your affiliate link
    highlight: false,
  },
  {
    name: 'ESPN BET',
    logo: '📺',
    rating: 4.5,
    bonus: 'Bet $10, Get $150',
    bonusValue: '$150',
    promoCode: 'DAILYAI',
    pros: ['ESPN integration', 'Easy to use', 'Hollywood access'],
    cons: ['Newer platform'],
    features: ['ESPN content', 'Live betting', 'Boosts'],
    affiliateUrl: 'https://espnbet.com', // Replace with your affiliate link
    highlight: false,
  },
];

export default function SportsbooksPage() {
  return (
    <div className="container px-4 py-8">
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
                          href={book.affiliateUrl}
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
                      href={book.affiliateUrl}
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
