# DAI-03: live paid-subscriber portal check (owner-run, $0)

Goal: prove a real live-mode subscriber can open Manage Subscription, sees the right plan, card and invoices, and can cancel, all **without being charged** and without touching any real member.

**When (updated 2026-11-23):** run it right **after** the DailyAI-only portal is activated, which itself waits on the policies being published and support@ working (`docs/PORTAL-SWITCH-DAILYAI-2026-11-22.md` § Activation gate). The same configuration already passed 10/10 in TEST mode in a real browser (`qa/launch-verify/portal-config-test-probe.mjs`). This live run proves it with a real card and real webhooks.

Who runs it: Matt, with his own card. Claude watches the webhook, database and Stripe objects read-only and records the evidence. Nobody else's subscription is opened.

## Costs and side effects (read first)
- **$0 charged.** It's a 7-day trial and it is cancelled before it ends.
- **The card can never get a DailyAI free trial again** (the one-trial-per-card rule). Use a card you are fine "spending" the trial on.
- **It takes 1 founding seat for up to a few minutes.** Step 7 (your immediate cancel) frees it within seconds. If you skip step 7, it comes back when the trial ends.
- It shows up in Stripe as one trialing, then canceled, DailyAI subscription. Metrics count it as a cancellation (`canceled_30d`) for 30 days.
- **Never use:** the founding seat #3 member, or any customer you don't own.

## Before you start (Claude)
1. `commit-info.json` shows the build being tested.
2. Read-only snapshot: founding seat counter, open Checkout Sessions = 0, DailyAI live subscriptions (count only).
3. Confirm `STRIPE_PORTAL_CONFIGURATION_ID` on the server is the DailyAI-only configuration (`bpc_1Udau…`, metadata `app=dailyai`), not the account default (`bpc_1TIA…`).

## Steps (Matt, ordinary browser window)
| # | Action | Expected | Evidence |
|---|---|---|---|
| 1 | Sign in as the FREE tester (`+daifree`) | Free tier, "Upgrade to Pro" | screenshot |
| 2 | /pricing → Founding → Checkout. Pay with your own card | Checkout top shows "DailyAI Betting". "$0.00 due today", trial ends on <date+7>, then $9.99/mo. The statement line includes DAILYAI | screenshot of Checkout before paying |
| 3 | Return to the site | "Your Pro Account", trial end date shown on /account | screenshot |
| 4 | /account → Manage Subscription | The Stripe portal opens in about 3 s with no "Opening portal…" hang | screenshot |
| 5 | In the portal check: plan "DailyAI Pro", $9.99/month, trial end date, card ending ••••, invoice list ($0 trial invoice). **No** switch-plan option. Headline "DailyAI Betting: manage your DailyAI Pro subscription". Terms/Privacy links only once the policies are published. No option to change the account email | screenshot |
| 6 | Cancel → confirm (no reason survey appears) | Portal shows "Cancels <trial end>". Stripe stores this as `cancel_at` = trial end, which the site treats as cancel-at-period-end (TEST-verified 11-23). Back on /account: still Pro until that date, "cancels on …" shown | screenshot |
| 7 | Optional, **you** do it (Claude never cancels a live subscription): Stripe Dashboard → the test subscription → Cancel → **Immediately**, no refund, no proration. Skip it and the step-6 cancel ends the trial at its end date with $0 charged | Stripe: canceled, amount paid $0. DB: row canceled, account back to Free, founding seat `ended` | Claude's read-only queries |

## Pass criteria
All 7 rows as expected. Stripe shows **total charged $0.00**. `user_subscriptions` matches Stripe. The founding counter is back to its value before the test. The webhook log has no errors for this subscription.

## If something fails
Stop. Don't retry the purchase: a second checkout with the same card is refused as a second trial, by design. Send Claude the screenshot. Cancel the test subscription yourself (portal or Dashboard) before the trial end date so nothing is charged; Claude confirms the state read-only.
