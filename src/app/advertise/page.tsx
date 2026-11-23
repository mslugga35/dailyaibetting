import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Zap, MessageSquare } from 'lucide-react';
import { EmailSafeText } from '@/components/ui/email-safe-text';

export const metadata: Metadata = {
  title: 'Advertise With Us',
  description: 'Advertising and sponsorship opportunities on DailyAI Betting, a sports betting consensus picks site.',
};

const opportunities = [
  {
    title: 'Banner Ads',
    price: '$200-500/month',
    description: 'Placement on site pages. 300x250, 728x90, or custom sizes.',
    features: ['Homepage placement', 'All pick pages', 'Sidebar visibility'],
  },
  {
    title: 'Sponsored Content',
    price: '$300-800/post',
    description: 'Native content that matches our editorial style. Reviews, guides, or features.',
    features: ['SEO optimized', 'Social promotion', 'Permanent placement'],
  },
  // DAI-27: no newsletter is sent (daily email is disabled), so no newsletter sponsorship is offered.
  // Re-add only when a newsletter is actually being delivered.
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
          Advertising and sponsorship opportunities on DailyAI Betting, a site that
          publishes daily consensus picks from expert cappers.
        </p>
      </div>

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
            <EmailSafeText text="advertise@dailyaibetting.com" />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
