# DailyAI + HiddenBag launch checkpoint (2026-11-18)

Runbook: `docs/PRODUCTION-RUNBOOK-2026-11-18.md` (stages, checks, rollback).

## Where things are
| Repo | Worktree | Branch | State |
|---|---|---|---|
| DailyAI | `C:/Users/mpmmo/wt/dai-integrate` | `integrate/launch-bundle` | local only, not pushed |
| HiddenBag | `C:/Users/mpmmo/wt/hb-trial-merge` | `feat/shared-consensus-on-master` (on `origin/master`) | local only, not pushed |
| Re-grade artifacts | `C:/Users/mpmmo/wt/regrade-20261118-v6` = latest clean, rehearsed plan (`-final` is an incomplete run stopped by low memory; `-v2..v5` history), exclusions `C:/Users/mpmmo/wt/regrade-exclude-20261118.json` | not in git (prod data) |
| Stripe test e2e | `C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/local-test/` (`run-founding-e2e.sh`, git-excluded) | key on disk, never ask for it |

`hb-trial-merge/node_modules` and `bot/node_modules` are junctions to `C:/Users/mpmmo/hiddenbag-v2`; Turbopack refuses them,
so build there with `npx next build --webpack`, or build a clean clone (attempted 2026-11-18, stopped by low memory).

## Stages
| # | Stage | Status |
|---|---|---|
| 1 | Shared consensus table + writer | ✅ LIVE 2026-11-18 09:10Z |
| 1b | Monitor PM2 fix (`ba981d8`) | prepared |
| 2 | Migrations `20261117b` + `20261118_hb_picks_stats_excluded` | prepared |
| 3 | HB website PR | prepared; blocked on HB local-master decision |
| 4 | Ingestion + grading matcher fixes (5 files) | prepared |
| 5 | Historical re-grade | prepared; `regrade-prepare.sh` on apply day |
| 6 | DailyAI bundle | prepared |
| 7 | Daily AI report | waits for OpenRouter credits (paid flag already on, $20 cap) |
| 8 | Founding pricing | prepared; trial-reuse fixed (no charge) |

## Found and fixed during this pass (all with regression tests, mutation-checked)
- **Cross-team matches in the grader** (live today): "Arizona Diamondbacks" graded on St. Louis Cardinals games (311 picks), Falcons→Seahawks, Nets→Hornets, Wyoming/Oklahoma St Cowboys→McNeese. Root causes: sport-blind city map, substring mascots, shared college mascots. HB `0264025`.
- **Trial reuse charged at once** after Checkout said "$0 due today" → now cancelled with no invoice, email + truthful success page. DAI `acdebed`, `9b9f986`, `4191757` (independent security review: no Critical/High; its 2 Medium + 2 Low fixed).
- **Success page said "Welcome to Pro" / "Payment received"** for a refused or $0 trial → confirms the real state via `/api/checkout/status` (state word only), fails closed.
- **Monitor never ran under PM2** → `ba981d8`.
- **Unverifiable grades** → `hb_picks.stats_excluded`; every record/leaderboard/units query skips them (HB guard test + DAI test). HB `37b9699`, DAI `497252b`.
- Windows CRLF fixture made a bot test fail locally → `.gitattributes`.

## Interrupted (system low on memory, 2026-11-18): rerun when memory allows
- Founding Stripe-test e2e on `4191757` (last full pass 75/0 was on `9b9f986`; the review fixes are covered by the harness, 408/408). Needed before Stage 8.
- Clean-clone Turbopack build of the HB branch (webpack build passes). Needed before Stage 3.
- `regrade-prepare.sh` full run (v6 plan already verified + rehearsed). Run on apply day anyway.

## Open items (not launch-blocking unless noted)
- **Owner/counsel:** legal copy (refund terms, renewal acknowledgment, Terms placeholders, trial-refusal wording); HB local master (blocks Stage 3); OpenRouter credits.
- `units_result` is NULL for graded wins with no price (695 in 14 days): by policy (unknown payout); capper stats compute units themselves and are unaffected.
- Individual pick lists still show a held pick's old grade (they make no performance claim); a "not verified" badge is a follow-up.
- Trial abuse via wallets without a card fingerprint, Gmail aliases: known, accepted gaps.

## Recovery steps
- **Writer down / stale consensus:** both sites already hide today's board after 5 min. `pm2 logs hb-consensus-writer`; `pm2 restart hb-consensus-writer`. Full removal: Stage 1 rollback.
- **Bad deploy on Hetzner files:** each copied file has `<file>.bak-<date>`; restore + `pm2 restart <proc> && pm2 save`.
- **Re-grade wrong:** `final/sql/99-ROLLBACK.sql` (prints `0|0` when exact), then `update-capper-stats.mjs`.
- **DailyAI:** `CONSENSUS_SOURCE=legacy`, unset `PRICING_MODE`, or redeploy `ad8cd80`.
- **Resume this work:** read this file, then the runbook; branches above; `npm test` (DAI), `npx jest && npm run -s test:consensus && (cd bot && npx vitest run)` (HB).
