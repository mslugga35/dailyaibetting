import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  Mail,
  Target,
  Zap,
  BarChart3,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Advertise With Us - DailyAI Betting',
  description: 'Reach thousands of engaged sports bettors. Advertising and sponsorship opportunities on DailyAI Betting.',
};

const stats = [
  { label: 'Monthly Visitors', value: '10,000+', icon: Users },
  { label: 'Email Subscribers', value: '1,000+', icon: Mail },
  { label: 'Daily Pick Views', value: '5,000+', icon: Target },
  { label: 'Avg Session Duration', value: '3+ mins', icon: TrendingUp },
];

const opportunities = [
  {
    title: 'Banner Ads',
    price: '$200-500/month',
    description: 'Premium placement on all pages. 300x250, 728x90, or custom sizes.',
    features: ['Homepage placement', 'All pick pages', 'Sidebar visibility'],
  },
  {
    title: 'Sponsored Content',
    price: '$300-800/post',
    description: 'Native content that matches our editorial style. Reviews, guides, or features.',
    features: ['SEO optimized', 'Social promotion', 'Permanent placement'],
  },
  {
    title: 'Newsletter Sponsorship',
    price: '$150-400/email',
    description: 'Reach our engaged email subscribers with dedicated or blended sponsorships.',
    features: ['1,000+ subscribers', 'High open rates', 'Betting-focused audience'],
  },
  {
    title: 'Exclusive Partnership',
    price: 'Custom',
    description: 'Long-term partnerships with category exclusivity and custom integrations.',
    features: ['Category exclusivity', 'Custom features', 'Priority placement'],
  },
];

export default function AdvertisePage() {
  return (
    <div className="container px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4">Advertising</Badge>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Advertise With DailyAI Betting
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Reach thousands of engaged sports bettors actively looking for picks,
          sportsbooks, and betting tools.
        </p>
      </div>

      {/* Audience Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audience Profile */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Our Audience
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Demographics</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Ages 25-54 (78%)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Male (82%)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  United States (95%)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Mobile users (68%)
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Interests</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Active sports bettors
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  NFL, NBA, MLB, NHL
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Seeking expert picks & analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  High purchase intent
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Advertising Opportunities</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {opportunities.map((opp) => (
            <Card key={opp.title}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{opp.title}</CardTitle>
                  <Badge variant="outline" className="font-mono">
                    {opp.price}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{opp.description}</p>
                <ul className="space-y-1">
                  {opp.features.map((feature) => (
                    <li key={feature} className="text-sm flex items-center gap-2">
                      <Zap className="h-3 w-3 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Card className="bg-primary/10 border-primary/30">
        <CardContent className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Ready to Reach Our Audience?</h2>
          <p className="text-muted-foreground mb-6">
            Get in touch to discuss your advertising goals and get a custom quote.
          </p>
          <Button size="lg" asChild>
            <a href="mailto:advertise@dailyaibetting.com" className="gap-2">
              <Mail className="h-5 w-5" />
              Contact Us
            </a>
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            advertise@dailyaibetting.com
          </p>
        </CardContent>
      </Card>

      {/* Why Us */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle>Why Advertise With Us?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <Target className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Targeted Audience</h3>
              <p className="text-sm text-muted-foreground">
                Our visitors are active sports bettors with high purchase intent.
              </p>
            </div>
            <div>
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">Growing Traffic</h3>
              <p className="text-sm text-muted-foreground">
                Rapidly growing audience with strong SEO positioning.
              </p>
            </div>
            <div>
              <Zap className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold mb-1">High Engagement</h3>
              <p className="text-sm text-muted-foreground">
                Users visit daily for picks, spending 3+ minutes per session.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
