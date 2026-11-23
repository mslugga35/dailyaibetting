# DailyAI-only billing portal: APPROVED 2026-11-23, prepared, NOT activated

Read live from Stripe (GET only) on 2026-11-22. Prod `STRIPE_PORTAL_CONFIGURATION_ID` = default `bpc_1TIAnA…` (unchanged).

## Capabilities: current default vs DailyAI-only `bpc_1UdauM…`
| Capability | Default `bpc_1TIAnA…` (live today) | DailyAI `bpc_1UdauM…` (prepared) |
|---|---|---|
| Cancel subscription | yes, at period end, no proration | **same** |
| Cancellation-reason survey | on | off |
| Invoice history | yes | **same** |
| Update payment method | yes | **same** |
| Plan switching / price changes | off (0 products) | **same** (off, so founding prices can't be changed from the portal) |
| Pause | off | **same** |
| Edit name / email / address / phone | yes | **off** |
| Headline | none | "DailyAI Betting: manage your DailyAI Pro subscription" |
| Terms / Privacy links | none | https://dailyaibetting.com/terms, /privacy (404 until policies publish) |
| Return URL | none (app passes /account) | https://dailyaibetting.com/account |
| Metadata | none | app=dailyai |

The portal config never changes prices or subscriptions; existing subscriptions and founding prices are untouched by a switch.

## Switch (11-22 draft, SUPERSEDED by "Activation" below)
1. `cp .env.local .env.local.bak-<date>-portal`
2. Set `STRIPE_PORTAL_CONFIGURATION_ID=bpc_1UdauM…` (full id from Stripe), `pm2 restart dailyaibetting --update-env`, `pm2 save`.
3. Verify: Stripe config read shows the table above; Matt's live portal test (`docs/LIVE-PORTAL-VERIFICATION-2026-11-22.md`) shows cancel, invoices, card update, headline, working legal links, no email edit.
4. Rollback: restore the backup env, restart. No Stripe object changes either way.

## 2026-11-23 (owner approved the DailyAI-only configuration)
- **Changed (live, DailyAI config only):** removed the Terms/Privacy URLs from `bpc_1UdauM…` (owner: add legal links only after the policies are published). After: privacy None, terms None; every other setting unchanged. Metadata note updated.
- **Shared default untouched:** default `bpc_1TIAnA…` `updated` stamp 1775234516 before and after; prod env still points at it.
- **Functional check (TEST mode, real headless browser):** `node qa/launch-verify/portal-config-test-probe.mjs` builds a TEST config with the same features, a trialing test subscription, opens the portal: **10/10 PASS**: headline shown, Cancel subscription offered, Payment method section (card + Add payment method), Invoice history, no plan switching, no customer-info editing, no Terms/Privacy links (the "Terms / Privacy" text is Stripe's own "Powered by" footer), no cancellation-reason survey, cancel → "Cancels Nov 30", subscription stays `trialing` with `cancel_at` = trial end (access kept to period end). Test customer deleted, test config deactivated.
- **API behaviour noted:** on API 2026-03-25.dahlia a portal cancel sets `cancel_at` (= period end) and leaves `cancel_at_period_end=false`. The webhook already maps either to "cancels at period end" (`src/app/api/webhooks/stripe/route.ts:144-146`), so /account shows "Cancels on". No defect.
- **Still shows "Matthew Morales"** (tab title "Matthew Morales Billing", "Return to Matthew Morales"): account-wide name, same as today's default portal and Checkout (DAI-20). Unchanged by this config.

## Activation gate (owner condition: no broken legal links; customer disclosures ready)
Activate only when **both**: (a) the policies are approved and published (/terms, /privacy, /refund-policy return 200), and (b) support@ works (DAI-18 verified), because after the switch the only way to change email, name or address is through support.

## Activation (env only, no build)
1. Re-add the legal links to the DailyAI config: `business_profile[privacy_policy_url]=https://dailyaibetting.com/privacy`, `business_profile[terms_of_service_url]=https://dailyaibetting.com/terms` (after both return 200).
2. Server: `cp .env.local .env.local.bak-<date>-portal`; set `STRIPE_PORTAL_CONFIGURATION_ID=<full bpc_1UdauM… id>`; `pm2 restart dailyaibetting --update-env`; `pm2 save`.
3. Verify: Stripe read shows the table above; billing-prod-check twice; Matt's live portal check (`docs/LIVE-PORTAL-VERIFICATION-2026-11-22.md`).
4. Rollback (seconds): restore the env backup, `pm2 restart dailyaibetting --update-env`. No Stripe object changes needed; subscriptions are never touched by a portal configuration.

## Account-detail changes through support (after activation)
Customers can no longer edit email, name or address in the portal, and the site has no self-serve email change. Proposed /account line, under Manage Subscription (ship with activation; needs a small code change + review + deploy, owner decides): *"Need to change your email or billing details? Email support@dailyaibetting.com from the address on your account."*

Support procedure (owner):
1. **Identity:** act only on a request sent **from the account's current email**, or confirm by replying to that address. Never change anything on a request from a different address alone.
2. **Email change:** update the login email in Supabase Auth (Dashboard → Authentication → Users → the user → change email) **and** the Stripe customer email (Dashboard → Customers → the customer → Edit). Change both so receipts and the duplicate-subscription checks (DAI-13) keep matching. Do not change the Stripe customer id or the subscription.
3. **Name / billing address:** Stripe Dashboard → customer → Edit (affects future invoices only).
4. **Never** change a subscription, price, trial or billing date as part of a details request.
5. Reply from support@ (see `docs/SUPPORT-EMAIL-ROUTING.md` "Send mail as").
