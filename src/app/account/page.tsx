import { redirect } from 'next/navigation';
import { getCurrentUser, getUserSubscription } from '@/lib/auth/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, CreditCard, Zap, Check } from 'lucide-react';
import Link from 'next/link';
import { ManageSubscriptionButton } from '@/components/subscription/ManageSubscriptionButton';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';

export const metadata = { title: 'Account – DailyAI Betting' };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { upgraded?: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login?redirect=/account');
  }

  const sub = await getUserSubscription(user.id);
  const isPremium = sub.plan === 'premium';
  const justUpgraded = searchParams.upgraded === '1';

  return (
    <div className="container px-4 py-12 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Account</h1>

      {justUpgraded && (
        <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-3">
          <Check className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm font-medium">
            Welcome to Premium! You now have real-time access to all consensus picks.
          </p>
        </div>
      )}

      {/* Profile */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Member since</span>
            <span>{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
            <Badge
              variant={isPremium ? 'default' : 'outline'}
              className={isPremium ? 'bg-primary text-primary-foreground ml-auto' : 'ml-auto'}
            >
              {isPremium ? '⚡ Premium' : 'Free'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPremium ? (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize text-emerald-400">{sub.status}</span>
                </div>
                {sub.currentPeriodEnd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {sub.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
                    </span>
                    <span>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <ManageSubscriptionButton />
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                You&apos;re on the free plan. Upgrade to get real-time consensus picks,
                MEGA/NUCLEAR alerts, full leaderboards, and AI analysis.
              </p>
              <UpgradeButton />
              <Button variant="link" className="w-full text-muted-foreground" asChild>
                <Link href="/pricing">See what&apos;s included</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sign out */}
      <div className="mt-8 text-center">
        <SignOutButton />
      </div>
    </div>
  );
}

function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="POST">
      <button type="submit" className="text-sm text-muted-foreground hover:text-foreground underline">
        Sign out
      </button>
    </form>
  );
}
