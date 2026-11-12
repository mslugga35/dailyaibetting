import { redirect } from 'next/navigation';
import { getCurrentUser, getUserSubscription, EntitlementUnavailableError, type UserSubscription } from '@/lib/auth/subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, CreditCard, Zap, Check } from 'lucide-react';
import Link from 'next/link';
import { ManageSubscriptionButton } from '@/components/subscription/ManageSubscriptionButton';
import { UpgradeButton } from '@/components/subscription/UpgradeButton';
import { EntitlementUnknownNotice } from '@/components/subscription/EntitlementUnknownNotice';

export const metadata = { title: 'Account – DailyAI Betting' };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { upgraded?: string };
}) {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch (err) {
    if (!(err instanceof EntitlementUnavailableError)) throw err;
    // Sign-in could not be checked (auth outage): do not bounce a signed-in user to
    // the login page and do not show any plan.
    return (
      <div className="container px-4 py-12 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Account</h1>
        <EntitlementUnknownNotice />
      </div>
    );
  }
  if (!user) {
    redirect('/login?redirect=/account');
  }

  // null = the subscription could not be read: show neither Free nor Premium.
  let sub: UserSubscription | null = null;
  try {
    sub = await getUserSubscription(user.id);
  } catch (err) {
    if (!(err instanceof EntitlementUnavailableError)) throw err;
  }
  const unknown = sub === null;
  const isPremium = sub?.plan === 'premium';
  // Stripe is still billing a past_due customer (retrying the card): not "Free",
  // and the fix is updating the card in the portal, not a second subscription.
  const paymentProblem = !isPremium && sub?.status === 'past_due';
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
            {!unknown && (
              <Badge
                variant={isPremium ? 'default' : 'outline'}
                className={isPremium ? 'bg-primary text-primary-foreground ml-auto' : paymentProblem ? 'ml-auto border-amber-500/50 text-amber-400' : 'ml-auto'}
              >
                {isPremium ? '⚡ Premium' : paymentProblem ? 'Payment problem' : 'Free'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {unknown ? (
            <EntitlementUnknownNotice />
          ) : sub && isPremium ? (
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
          ) : paymentProblem ? (
            <>
              <p className="text-sm text-muted-foreground">
                Your last payment didn&apos;t go through, so Pro is paused. Update your card to
                restore access; Stripe will retry the charge.
              </p>
              <ManageSubscriptionButton />
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                You&apos;re on the free plan. Upgrade to get real-time consensus picks,
                MEGA/NUCLEAR alerts, full leaderboards, and AI analysis.
              </p>
              <UpgradeButton />
              {/* Portal only for a real (e.g. canceled) subscription, not a checkout placeholder. */}
              {sub?.stripeSubscriptionId && <ManageSubscriptionButton />}
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
