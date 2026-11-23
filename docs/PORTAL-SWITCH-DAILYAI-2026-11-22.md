# DailyAI-only billing portal: prepared, NOT switched (2026-11-22)

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

## Switch (after the policies are published and /terms + /privacy return 200)
1. `cp .env.local .env.local.bak-<date>-portal`
2. Set `STRIPE_PORTAL_CONFIGURATION_ID=bpc_1UdauM…` (full id from Stripe), `pm2 restart dailyaibetting --update-env`, `pm2 save`.
3. Verify: Stripe config read shows the table above; Matt's live portal test (`docs/LIVE-PORTAL-VERIFICATION-2026-11-22.md`) shows cancel, invoices, card update, headline, working legal links, no email edit.
4. Rollback: restore the backup env, restart. No Stripe object changes either way.
