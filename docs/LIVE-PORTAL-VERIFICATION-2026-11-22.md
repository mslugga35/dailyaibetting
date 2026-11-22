# DAI-03: live paid-subscriber portal check (owner-run, $0)

Goal: prove a real live-mode subscriber can open Manage Subscription, sees the right plan, card and invoices, and can cancel, all **without being charged** and without touching any real member.

Who runs it: Matt, with his own card. Claude watches the webhook, database and Stripe objects read-only and records the evidence. Nobody else's subscription is opened.

## Costs and side effects (read first)
- **$0 charged.** It's a 7-day trial and it is cancelled before it ends.
- **The card can never get a DailyAI free trial again** (the one-trial-per-card rule). Use a card you are fine "spending" the trial on.
- **It takes 1 founding seat for up to a few minutes.** Step 7 cancels immediately, which frees the seat (`ended`). If you skip step 7, the seat comes back on its own when the trial would have ended.
- It shows up in Stripe as one trialing, then canceled, DailyAI subscription. Metrics count it as a cancellation (`canceled_30d`) for 30 days.
- **Never use:** the founding seat #3 member, or any customer you don't own.

## Before you start (Claude)
1. `commit-info.json` shows the build being tested.
2. Read-only snapshot: founding seat counter, open Checkout Sessions = 0, DailyAI live subscriptions (count only).
3. Decide which portal configuration is live. Today the app uses the account **default** (`bpc_1TIA…`). If the DailyAI-specific configuration (decision B3) is approved first, test that one instead.

## Steps (Matt, ordinary browser window)
| # | Action | Expected | Evidence |
|---|---|---|---|
| 1 | Sign in as the FREE tester (`+daifree`) | Free tier, "Upgrade to Pro" | screenshot |
| 2 | /pricing → Founding → Checkout. Pay with your own card | Checkout top shows the name decided in B3. "$0.00 due today", trial ends on <date+7>, then $9.99/mo. The statement line includes DAILYAI | screenshot of Checkout before paying |
| 3 | Return to the site | "Your Pro Account", trial end date shown on /account | screenshot |
| 4 | /account → Manage Subscription | The Stripe portal opens in about 3 s with no "Opening portal…" hang | screenshot |
| 5 | In the portal check: plan "DailyAI Pro", $9.99/month, trial end date, card ending ••••, invoice list ($0 trial invoice). **No** switch-plan option. Headline and terms/privacy links per decision B3 | screenshot |
| 6 | Cancel → confirm | "Cancels on <trial end>". Back on /account: still Pro until that date, "cancels on …" shown | screenshot |
| 7 | Tell Claude "done". Claude (or you in the Dashboard) cancels the subscription **immediately**, with no invoice and no proration | Stripe: status canceled, amount paid $0. DB: row status canceled, account back to Free, founding seat `ended` (counter back) | Claude's read-only queries |

## Pass criteria
All 7 rows as expected. Stripe shows **total charged $0.00**. `user_subscriptions` matches Stripe. The founding counter is back to its value before the test. The webhook log has no errors for this subscription.

## If something fails
Stop. Don't retry the purchase: a second checkout with the same card is refused as a second trial, by design. Send Claude the screenshot. Claude cancels the test subscription immediately so nothing is ever charged.
