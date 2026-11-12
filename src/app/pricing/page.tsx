import { getCurrentUser, getUserSubscription, EntitlementUnavailableError, type UserSubscription } from '@/lib/auth/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Lock, Brain, TrendingUp, Bell, Trophy, BarChart } from 'lucide-react';
import Link from 'next/link';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';
import { EntitlementUnknownNotice } from '@/components/subscription/EntitlementUnknownNotice';
import { PRO_PRICE_DISPLAY, TRIAL_AFTER, TRIAL_CTA, TRIAL_LABEL, TRIAL_TERMS, UPGRADE_CTA } from '@/lib/constants/subscription';

export const metadata = {
  title: 'Pricing – DailyAI Betting Premium',
  description: `Get all consensus picks, MEGA/NUCLEAR alerts, and full capper leaderboards for ${PRO_PRICE_DISPLAY}. ${TRIAL_LABEL} for first-time members.`,
};

export default async function PricingPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let sub: UserSubscription | null = null;
  let unknown = false;
  try {
    user = await getCurrentUser();
    if (user) sub = await getUserSubscription(user.id);
  } catch (err) {
    if (!(err instanceof EntitlementUnavailableError)) throw err;
    unknown = true;
  }
  const isPremium = sub?.plan === 'premium';

  return (
    <div className="container px-4 py-16 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Pricing</Badge>
        <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
        <p className="text-lg text-muted-foreground">
          Start free. Upgrade to see every consensus pick.
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
              'All consensus picks',
              'MEGA/NUCLEAR alerts',
              'Full capper leaderboard',
              'AI trend analysis',
              'Historical data access',
            ].map(f => (
              <div key={f} className="flex items-start gap-2 text-sm">
                <Lock className="h-4 w-4 text-muted-foreground/70 mt-0.5 shrink-0" />
                <span className="text-muted-foreground/70">{f}</span>
              </div>
            ))}
            {unknown ? null : !user ? (
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/login">Get Started Free</Link>
              </Button>
            ) : !isPremium && !unknown ? (
              <Button variant="outline" className="w-full mt-4" disabled>
                Current Plan
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* Premium Tier */}
        <Card className="border-primary/50 bg-primary/5 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground px-4">Full Access</Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Premium
            </CardTitle>
            <div className="mt-2">
              <span className="text-4xl font-bold">{PRO_PRICE_DISPLAY.split('/')[0]}</span>
              <span className="text-muted-foreground">/{PRO_PRICE_DISPLAY.split('/')[1] ?? 'mo'}</span>
            </div>
            <p className="text-sm text-emerald-400 font-medium">{TRIAL_LABEL} for first-time members</p>
            <p className="text-xs text-muted-foreground">{TRIAL_AFTER}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: Zap, text: 'All consensus picks, updated throughout the day' },
              { icon: Bell, text: 'MEGA alerts (7+ cappers) & NUCLEAR alerts (10+)' },
              { icon: Trophy, text: 'Full capper leaderboard' },
              { icon: Brain, text: 'AI-powered trend analysis & insights' },
              { icon: BarChart, text: 'Full historical data (all past picks)' },
              { icon: TrendingUp, text: 'Fade-the-public alerts' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-2 text-sm">
                <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
            {unknown ? (
              <div className="mt-4"><EntitlementUnknownNotice /></div>
            ) : isPremium ? (
              <Button className="w-full mt-4" variant="outline" asChild>
                <Link href="/account">Manage Subscription</Link>
              </Button>
            ) : user && sub?.status === 'past_due' ? (
              // Payment problem: fix the card on the existing subscription, never buy a second one.
              <Button className="w-full mt-4" asChild>
                <Link href="/account">Fix payment to restore Pro</Link>
              </Button>
            ) : user ? (
              // The trial is for first-time subscribers only (checkout enforces it too).
              <UpgradeButton className="w-full mt-4" label={sub?.stripeSubscriptionId ? UPGRADE_CTA : TRIAL_CTA} />
            ) : (
              <Button className="w-full mt-4" asChild>
                <Link href="/login?redirect=/pricing">{TRIAL_CTA}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="max-w-3xl mx-auto mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" aria-hidden="true" /> Secure checkout by Stripe</span>
        <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" aria-hidden="true" /> Cancel anytime from your account</span>
        <Link href="/results" className="inline-flex items-center gap-1.5 hover:text-foreground underline-offset-4 hover:underline">
          <Trophy className="h-4 w-4 text-primary" aria-hidden="true" /> See our full graded track record
        </Link>
      </div>

      <section aria-labelledby="pricing-faq" className="max-w-3xl mx-auto mt-12">
        <h2 id="pricing-faq" className="text-2xl font-bold mb-4 text-center">Questions</h2>
        <div className="divide-y rounded-xl border bg-card">
          {[
            ['How does the free trial work?', TRIAL_TERMS],
            ['How do I cancel?', 'Open Account and choose Manage Subscription. Billing and cancellation are handled in the secure Stripe customer portal.'],
            ['What do I get that free users do not?', 'Every consensus pick each day instead of the top 5, the strongest MEGA/NUCLEAR consensus alerts, the full capper leaderboard and every past pick from every capper. (The graded consensus track record on /results is free for everyone.)'],
            ['Is this betting advice? Do you guarantee wins?', 'No. We aggregate and grade picks from third-party cappers. Consensus means several cappers chose the same bet; it does not guarantee any outcome. Please bet responsibly.'],
            ['How is the track record calculated?', 'Every fire pick is graded win, loss or push from the final score. Win rate excludes pushes. Nothing is estimated; the full method is on the Results page.'],
          ].map(([q, a]) => (
            <details key={q} className="group p-4">
              <summary className="cursor-pointer list-none font-medium flex items-center justify-between gap-4">
                {q}
                <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">21+. Gambling problem? Call 1-800-GAMBLER.</p>
      </section>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Questions? Email us at{' '}
        <a href="mailto:support@dailyaibetting.com" className="text-primary hover:underline">
          support@dailyaibetting.com
        </a>
      </p>
    </div>
  );
}
