import { getCurrentUser, getUserSubscription } from '@/lib/auth/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Lock, Brain, TrendingUp, Bell, Trophy, BarChart } from 'lucide-react';
import Link from 'next/link';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';

export const metadata = {
  title: 'Pricing – DailyAI Betting Premium',
  description: 'Get real-time consensus picks, MEGA/NUCLEAR alerts, and full capper leaderboards for $20/mo.',
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  const sub = user ? await getUserSubscription(user.id) : null;
  const isPremium = sub?.plan === 'premium';

  return (
    <div className="container px-4 py-16 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Pricing</Badge>
        <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
        <p className="text-lg text-muted-foreground">
          Start free. Upgrade when you&apos;re ready for an edge.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* Free Tier */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-muted-foreground" />
              Free
            </CardTitle>
            <div className="mt-2">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <p className="text-sm text-muted-foreground">No credit card required</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              'Top 5 consensus picks (daily)',
              'Basic sport filtering',
              'Yesterday\'s results overview',
              'Public capper count',
            ].map(f => (
              <div key={f} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{f}</span>
              </div>
            ))}
            {[
              'Real-time updates',
              'MEGA/NUCLEAR alerts',
              'Full capper leaderboard',
              'AI trend analysis',
              'Historical data access',
            ].map(f => (
              <div key={f} className="flex items-start gap-2 text-sm">
                <Lock className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                <span className="text-muted-foreground/40">{f}</span>
              </div>
            ))}
            {!user ? (
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/login">Get Started Free</Link>
              </Button>
            ) : !isPremium ? (
              <Button variant="outline" className="w-full mt-4" disabled>
                Current Plan
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* Premium Tier */}
        <Card className="border-primary/50 bg-primary/5 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground px-4">Most Popular</Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Premium
            </CardTitle>
            <div className="mt-2">
              <span className="text-4xl font-bold">$20</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <p className="text-sm text-muted-foreground">Cancel anytime</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Zap, text: 'Real-time consensus (updated every 5 min)' },
              { icon: Bell, text: 'MEGA alerts (7+ cappers) & NUCLEAR alerts (10+)' },
              { icon: Trophy, text: 'Full capper leaderboard with ROI stats' },
              { icon: Brain, text: 'AI-powered trend analysis & insights' },
              { icon: BarChart, text: 'Full historical data (all past picks)' },
              { icon: TrendingUp, text: 'Fade-the-public alerts' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-2 text-sm">
                <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
            {isPremium ? (
              <Button className="w-full mt-4" variant="outline" asChild>
                <Link href="/account">Manage Subscription</Link>
              </Button>
            ) : user ? (
              <UpgradeButton className="w-full mt-4" />
            ) : (
              <Button className="w-full mt-4" asChild>
                <Link href="/login?redirect=/pricing">Start Premium – $20/mo</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Questions? Email us at{' '}
        <a href="mailto:support@dailyaibetting.com" className="text-primary hover:underline">
          support@dailyaibetting.com
        </a>
      </p>
    </div>
  );
}
