# Deploy record: billing hardening DAI-11..15 (2026-11-22)

From 4a33957 → integrate/launch-bundle merge 3199c50 (+ this doc). Deployed by pushing to `master` (GitHub Action → `/root/scripts/gh-deploy.sh dailyaibetting`).

## Files changed (app code)
`src/app/api/checkout/route.ts`, `src/app/api/checkout/status/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/lib/guest-checkout.ts`, `src/lib/cancel-reason.ts` (new), `src/lib/pricing/hold-limit.ts` (new), `src/lib/pricing/offer.ts`, `scripts/billing/reconcile-stripe-db.mjs` (new, read-only, manual). Tests/fakes under `tests/`. Docs under `docs/`. No UI components, no prices, no plan copy (only the "busy" message mentions the regular price).

## Environment (`/root/apps/dailyaibetting/.env.local`, backup `.env.local.bak-20261122-billing`)
| Variable | Before | After |
|---|---|---|
| `GUEST_CHECKOUT_ENABLED` | `true` | `false` |
| `DAI_TRIAL_REUSE_COMMENT_CUTOFF` | unset | `2026-11-22T22:45:00Z` |
| `DAI_AUTO_CANCEL_DUPLICATE_TRIAL` | unset | unset (= off) |
| `FOUNDING_HOLDS_PER_IP` / `FOUNDING_HOLD_IP_WINDOW_MIN` | unset | unset (defaults 3 / 30 min) |
| `STRIPE_PORTAL_CONFIGURATION_ID` | default config `bpc_1TIA…` | **unchanged** (DailyAI-only portal waits for published policies) |

## Database migrations
None.

## Stripe configuration changes
None. Checkout Sessions now send `branding_settings.display_name = "DailyAI Betting"` per session (verified accepted in test mode, SDK 21.0.1 / API 2026-03-25.dahlia). No account branding, product, price, portal, or subscription changes.

## Tests and reviews
- Harness 561/561 GREEN (41 files, per-file counts enforced), `tsc --noEmit` clean, `next build` exit 0 on the merge.
- Builder → Breaker + Security (round 1: APPROVE WITH CHANGES) → fix round 2 → re-review (N1 regression found) → fix round 3 → **Breaker APPROVE, Security APPROVE, Verifier GATE GREEN** (561/561 re-run independently).

## Outstanding risks (accepted, minor)
- Per-IP hold limiter is in memory (single pm2 fork instance); resets on restart.
- Stripe search is eventually consistent (~1 min); same-customer list calls back it up; webhook duplicate alert is the backstop.
- No SQL-level seat guard; all webhook seat paths go through `transitionSeat`.
- After a tracked founding sub ends and a duplicate is promoted, the seat stays `ended` (cap accounting only).
- Shared-NAT users share 3 founding holds / 30 min; regular price still available.
- Live portal (default config) still lets customers edit their email; code no longer trusts it for blocking or trial eligibility.

## Rollback
1. Code: `git revert -m 1 <merge>` on master and push (no force-push) → Action redeploys the previous code. Or on the server, emergency: `cd /root/apps/dailyaibetting && git reset --hard 4a33957 && npm run build && pm2 restart dailyaibetting --update-env` (then revert on master so the next deploy doesn't re-apply).
2. Env: `cp .env.local.bak-20261122-billing .env.local && pm2 restart dailyaibetting --update-env`.
3. No data migration to undo. Subscriptions are never modified by the deploy.
