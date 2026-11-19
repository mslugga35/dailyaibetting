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
import { describeSubscriptionPrice } from '@/lib/pricing/subscription-price';
import { offerCopy, CANCEL_POLICY, REFUND_NOTE, PLANS } from '@/lib/pricing/plans';
import { EmailSafeText } from '@/components/ui/email-safe-text';

export const metadata = { title: 'Account' };
export const dynamic = 'force-dynamic';

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
  // Pro granted by hand (test/comp accounts): no Stripe subscription, so nothing bills,
  // nothing renews and there is no billing portal to open.
  const complimentary = isPremium && !sub?.stripeSubscriptionId;
  const justUpgraded = searchParams.upgraded === '1';
  // The plan and amount this subscriber is actually billed (their Stripe Price), not today's offer.
  const billed = sub?.stripeSubscriptionId && (isPremium || paymentProblem)
    ? await describeSubscriptionPrice(sub.priceId)
    : null;
  const lockTerms = billed?.plan === 'founding'
    ? offerCopy({ mode: 'founding', plan: 'founding', amountCents: PLANS.founding.cents, trialDays: 0, founding: null }).lock
    : null;

  return (
    <div className="container px-4 py-12 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Account</h1>

      {justUpgraded && (
        <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-3">
          <Check className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm font-medium">
            Welcome to DailyAI Pro! You now have access to every consensus pick.
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
            <span><EmailSafeText text={user.email} /></span>
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
                {isPremium ? '⚡ Pro' : paymentProblem ? 'Payment problem' : 'Free'}
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
                {billed && (
                  <div className="flex justify-between" data-testid="account-plan">
                    <span className="text-muted-foreground">Plan</span>
                    <span>
                      {billed.plan === 'founding' ? 'Founding Member' : 'Pro'}
                      {billed.perPeriod ? ` – ${billed.perPeriod}` : ''}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize text-emerald-400">{sub.status}</span>
                </div>
                {sub.currentPeriodEnd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {complimentary ? 'Access until' : sub.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
                    </span>
                    <span>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              {billed?.plan === 'founding' && (
                <p className="text-xs text-muted-foreground" data-testid="founding-lock">
                  {sub.cancelAtPeriodEnd
                    ? `Your Founding Member price stays in effect until ${sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'the end of this period'}. If you let the subscription end, the founding price ends with it; renew before then to keep it.`
                    : lockTerms}
                </p>
              )}
              {complimentary ? (
                <p className="text-xs text-muted-foreground" data-testid="complimentary-access">
                  Complimentary Pro access. No card is on file and nothing will be charged, so there
                  is no billing portal for this account.
                </p>
              ) : (
              <>
              <p className="text-xs text-muted-foreground">
                {billed?.amount && !sub.cancelAtPeriodEnd
                  ? `Renews every month at ${billed.amount} until you cancel${sub.status === 'trialing' ? ' (first charge when the free trial ends)' : ''}. `
                  : ''}
                {CANCEL_POLICY} <EmailSafeText text={REFUND_NOTE} />
              </p>
              <ManageSubscriptionButton />
              </>
              )}
            </>
          ) : paymentProblem ? (
            <>
              <p className="text-sm text-muted-foreground">
                Your last payment didn&apos;t go through, so Pro is paused. Update your card to
                restore access; Stripe will retry the charge.
                {billed?.perPeriod ? ` Your plan: ${billed.plan === 'founding' ? 'Founding Member' : 'Pro'} – ${billed.perPeriod}.` : ''}
                {billed?.plan === 'founding'
                  ? ' Fixing the card keeps your Founding Member price; if the subscription ends because the payment cannot be collected, the founding price ends too.'
                  : ''}
              </p>
              <ManageSubscriptionButton />
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                You&apos;re on the free plan. Upgrade to get every consensus pick,
                individual capper pick detail and pick-by-pick results for the latest graded fire picks.
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
