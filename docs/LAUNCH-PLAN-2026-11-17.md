# DailyAI + HiddenBag: coordinated launch plan (2026-11-17)

Everything below is built and tested **locally only**. Nothing is pushed, deployed, migrated, or created in live Stripe.
Every numbered stage is a separate owner approval.

## What is ready

| Workstream | Branch / commit | Local evidence |
|---|---|---|
| DailyAI bundle (all 4 below merged) | `integrate/launch-bundle` (worktree `wt/dai-integrate`) | tsc clean, harness 395/395, `next build` OK |
| Shared consensus (HiddenBag side) | HB `feat/shared-consensus` `78010ea` | `test:consensus` 40/40, jest 219/219, real-PG e2e 25/25 |
| Shared consensus (DailyAI reader) | DAI `feat/shared-consensus` `d3afec7` | parity goldens byte-identical with HB |
| Founding pricing | DAI `feat/founding-pricing` `6dcfaaf` | Stripe test-mode lifecycle 68/0 (pre-final), DB concurrency 27/27, unit 37 |
| Daily AI report, season-aware, BallparkPal/Statcast removed | DAI `feat/report-season-aware` `141cb6a` | 13 season tests |
| Customer-facing fixes (claims, AI empty states, blog, legal drafts) | DAI `feat/cx-critical-fixes` `b67f181` + bundle copy fix `46edc1c` | claims guard 15 tests |

## Launch order

### Stage 0: pre-flight (no customer impact)
- Check for parallel Claude sessions touching Supabase A / Hetzner.
- Owner: add OpenRouter credits (account at ~$0.03; today's daily report failed with 402). The $20/month cap stays.
- Owner: unpublish the broken `blog_posts` rows; retitle the Harbor article "...for Consistent Profits" in Harbor.

### Stage 1: data foundation (HiddenBag, Supabase A)
1. Apply `hb_consensus_live` migration (`20261117_hb_consensus_live.sql`); verify anon/authenticated get permission denied.
2. Hand-copy writer + monitor scripts to `/root/hiddenbag-v2`; run `consensus-writer.mjs --once`; check heartbeat.
3. Backfill from 2026-06-01.
4. `pm2 start scripts/ecosystem.consensus.config.cjs && pm2 save` (writer every 60 s, monitor with `--live-alerts`).
5. Deploy the HiddenBag `/consensus` page reading the table.
- **Rollback:** `pm2 delete hb-consensus-writer hb-consensus-monitor && pm2 save`; redeploy old page; drop table last via the rollback SQL.

### Stage 2: fix wrong-game matching (HiddenBag ingestion), then re-grade
1. Deploy the `parse-worker` matcher fix (`bot/lib/game-window.mjs`): picks only match games starting after `posted_at`.
2. Historical re-grade as a separate, dry-run-first data job.
3. Apply `20261117b` (trust bar / results views read the shared record) after grepping the other 16 apps for those views.
- Until this stage finishes, published records (DailyAI 963-910-17, HB trust bar, leaderboards) are not reliable. That is why the bundle now says "Graded", not "Verified".
- **Rollback:** restore the old parse-worker; `20261117b` rollback SQL.

### Stage 3: DailyAI deploy, behaviour unchanged by default
1. Push `integrate/launch-bundle` → GitHub Actions deploy. Defaults: `CONSENSUS_SOURCE=legacy` (old builder + 1000-row fix), `PRICING_MODE` unset ($20, exactly as today).
2. Smoke: home, /pricing, /pro, /account, /results, /daily-ai-picks, /api/consensus, checkout start (test), admin still locked.
3. Set `CONSENSUS_SOURCE=hb`, restart, verify both sites show the same groups; retire `dailyai-track-record`.
- **Rollback:** `CONSENSUS_SOURCE=legacy` + restart; or redeploy `ad8cd80`.

### Stage 4: daily AI report
- One writer: DailyAI's OpenRouter job (10:20 ET) owns `daily_ai_report`; the HiddenBag Max job stays retired (dead BallparkPal, 18:00 ET publish, terms risk). Plan: `docs/DAILY-REPORT-OWNERSHIP-PLAN.md`.
- The season-aware report only covers in-season sports; tokens are 12k with MLB in season, otherwise 8k (~$0.10–0.25/run).
- With `CONSENSUS_SOURCE=hb` the report and the blog recap read the shared consensus, so the AI never builds a competing consensus.
- Verify the first run after credits: success in `/var/log/dailyai-cron/daily-report.log`, budget pct, page renders.

### Stage 5: founding pricing ($9.99 for the first 100)
1. Apply `20261117000000_dailyai_founding_seats.sql` (seats, trial fingerprints, billing events; service_role only).
2. Live Stripe: create $9.99 (`dailyai_pro_founding_monthly`) and $19.99 (`dailyai_pro_regular_monthly`) prices; a portal configuration (no plan switching, cancel at period end); confirm the live `STRIPE_PRICE_ID` is $20.00/month.
3. Live webhook: add `invoice.paid`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`.
4. Env: `STRIPE_PRICE_FOUNDING`, `STRIPE_PRICE_PRO`, `STRIPE_PORTAL_CONFIGURATION_ID`; keep `STRIPE_PRICE_ID` ($20).
5. Deploy with `PRICING_MODE` unset → verify unchanged → `PRICING_MODE=founding`, rebuild, restart.
6. One real low-risk purchase check by the owner (owner's own card), then announce.
- Sold out → $19.99 sells automatically; Pro never closes. Existing $20 subscribers are never touched.
- **Rollback:** unset `PRICING_MODE`, rebuild; keep the founding/regular price ids allowed so founders keep access.

### Stage 6: legal + copy
- Owner/counsel review `docs/legal-drafts/` (terms, privacy, cancellation-refund policy) and fill placeholders; then route them.
- Counsel approves the "trial ended because card already used a trial" wording.

## Owner decisions implemented (founding)
1. Cancelled $20 subscribers may join at $9.99 while seats remain; active $20 subs never modified.
2. One 7-day trial per customer (email across Stripe customers + card fingerprint); dated first charge disclosed on pricing, /pro and Checkout.
3. Sold out → $19.99 automatically.
4. A converted seat counts permanently.
5. Founders keep $9.99 while continuously subscribed; a founder who returns after their subscription ends pays the regular price.
6. No "no refunds" copy; neutral policy pointer; refunds/disputes logged, never auto-actioned; policy is a draft for legal review.

## Known gaps (accepted or deferred)
- Trial abuse: wallets/Link have no card fingerprint; Gmail dot/plus aliases only caught by the card check; a third party could burn someone's trial via guest checkout.
- Displayed price can lag a sell-out by ~10 s; checkout's price check prevents a wrong charge.
- HB Discord alerter/digest still compute their own counts (can differ from the sites).
- "One writer" is by convention (17 apps share the service key).
- Line-movement tier and capper-quality weighting wait for re-graded data.
- DailyAI `/api/results` daily/monthly/sport views still read the legacy record.
