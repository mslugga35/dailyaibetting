# DailyAI + HiddenBag launch checkpoint (2026-11-18, updated ~12:50Z)

Runbook: `docs/PRODUCTION-RUNBOOK-2026-11-18.md` (stages, checks, rollback).
**Everything local is green. Nothing beyond Stage 1 is in production. All remaining stages wait for owner authorization.**

## Where things are
| Repo | Worktree | Branch | State |
|---|---|---|---|
| DailyAI | `C:/Users/mpmmo/wt/dai-integrate` | `integrate/launch-bundle` | local only, not pushed |
| HiddenBag | `C:/Users/mpmmo/wt/hb-trial-merge` | `feat/shared-consensus-on-master` @ `1e90f29` (on `origin/master`) | local only, not pushed |
| HB local-master rescue | `C:/Users/mpmmo/wt/hb-master-rescue` | `rescue/hb-local-master-2026-11-18` (3 commits on `origin/master`) | local only, not pushed |
| Re-grade artifacts | `C:/Users/mpmmo/wt/regrade-20261118-final2` = latest READY plan (`-v6` earlier clean plan, `-final` incomplete); exclusions `C:/Users/mpmmo/wt/regrade-exclude-20261118.json` | not in git (prod data) |
| Stripe test e2e | `C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/local-test/` (`run-founding-e2e.sh`, git-excluded) | key on disk, never ask for it |
| HB clean-clone build | `C:/Users/mpmmo/wt/hb-cleanbuild-20261118` (throwaway; safe to delete) | |

The HB worktree had been on a detached HEAD; its commits are now on `feat/shared-consensus-on-master` (fast-forward, 2026-11-18).
`hb-trial-merge/node_modules` and `bot/node_modules` are junctions to `C:/Users/mpmmo/hiddenbag-v2`: Turbopack refuses
them there, so build in a clean clone (as done) or with `npx next build --webpack`.

## Verification results (2026-11-18)
| Check | Result |
|---|---|
| Founding Stripe test-mode e2e on the final billing code | **76 pass / 0 fail / 0 blocked** (first rerun hit a harness flake, Stripe Checkout left Cash App Pay selected; submit step hardened, rerun clean) |
| DailyAI harness / tsc | 408/408 / 0 |
| HB jest / consensus / bot / tsc | 493/493 / 50/50 / 434/434 / 0 |
| HB clean-clone Turbopack `next build` (Vercel-style) | OK, 74 routes (needs server env at build, as Vercel has) |
| Re-grade `regrade-prepare.sh` full run | READY: 20,350 rows, 0 verification failures, 0 disagreements, rehearsal 16/16 |
| Independent security review of today's HB DB/admin changes | nothing introduced at Medium+; 2 Low fixed (transaction-local lock_timeout, stricter guard); pre-existing anon-write hole fixed in `20261118c` |

## Production, read-only checks (2026-11-18 ~12:05Z)
- **Stage 1 writer: healthy.** `hb_consensus_meta.last_success_at` 12:03:49Z, `last_error` null, ~0.86 s/cycle, PM2 0 restarts.
- **Consensus monitor: NOT working.** PM2 `hb-consensus-monitor` cron-restarts every 5 min but its logs are 0 bytes since 04:12; live file still has the `argv[1]` guard. Fixed by Stage 1b. The sites' own 5-min stale guards are unaffected.
- **OpenRouter: no active spend.** Paid flag on since 11-17, budget $20/month (app gate fails closed), $20.00 credited / $20.04 used, `usage_monthly` $0, jobs 402 daily. Adding credits starts spending at the next 10:00 ET run. Auto top-up is not readable via API.

## Stages
| # | Stage | Status |
|---|---|---|
| 1 | Shared consensus table + writer | ✅ LIVE 2026-11-18 09:10Z |
| 1b | Monitor PM2 fix (`ba981d8`) | prepared; production monitoring confirmed idle until it ships |
| 2 | Migrations `20261117b`, `20261118`, `20261118b` (DB stats functions), `20261118c` (lock legacy stats tables) | prepared, rehearsed locally |
| 3 | HB website PR | prepared; **no longer blocked** (local-master commits analysed, see below) |
| 4 | Ingestion + grading matcher fixes (5 files) | prepared |
| 5 | Historical re-grade | READY plan; re-run `regrade-prepare.sh` on apply day |
| 6 | DailyAI bundle | prepared |
| 7 | Daily AI report | waits for OpenRouter credits (paid flag already on, $20 cap) |
| 8 | Founding pricing | prepared; e2e 76/0/0 |

## HB local master (was "10 unpushed commits")
7 of the 10 are already on `origin/master` with identical content. The 3 unique ones (park hb-ballparkpal-scrape;
duplicate-safe window backfill + 11-09 incident doc; incident addendum) are cherry-picked cleanly onto `origin/master`
as `rescue/hb-local-master-2026-11-18`. Local master untouched and saved as `backup/hb-local-master-2026-11-18`.
Old uncommitted WIP in `hiddenbag-v2` (dashboard RPC rewrite, files dated 2026-09-08) left in place, copied to
`C:/Users/mpmmo/wt/hb-local-wip-2026-09-08.patch`. If that WIP is ever revived, it reads `hb_capper_leaderboard` /
`hb_sport_breakdown` / `hb_daily_performance`, which `20261118b` makes hold-safe.

## Found and fixed (all with regression tests, mutation-checked)
- **Cross-team matches in the grader** (live): Diamondbacks graded on Cardinals games (311 picks), Falcons→Seahawks, Nets→Hornets, college Cowboys→McNeese. HB `0264025`.
- **Trial reuse charged at once** after "$0 due today" → cancelled with no invoice, email + truthful success page. DAI `acdebed`, `9b9f986`, `4191757`.
- **Success page said "Welcome to Pro"** for a refused trial → confirms the real state, fails closed.
- **Monitor never ran under PM2** → `ba981d8`.
- **Unverifiable grades** → `hb_picks.stats_excluded`, skipped by every site query, `update-capper-stats`, DAI cappers API (HB `37b9699`, DAI `497252b`), **plus (today) the 5 database stats functions (`e01400a`) and the admin "recalculate capper" action (`c0cc23a`)**, which still counted them.
- **Anon could write/truncate the 3 legacy stats tables and run their recompute loops** (pre-existing) → `20261118c` (`de3a4ee`).
- Admin recalculation stored a NaN win rate for pushes-only cappers → `1e90f29`.
- Windows CRLF fixture made a bot test fail locally → `.gitattributes`.

## Open items (not launch-blocking)
- **Owner/counsel:** legal copy (refund terms, renewal acknowledgment, Terms placeholders, trial-refusal wording); OpenRouter credits/auto top-up.
- The 3 legacy stats tables are stale (last written 2026-02-06, duplicate "overall" rows); nothing reads them. Rebuild or drop later.
- `units_result` is NULL for graded wins with no price (policy); capper stats compute units themselves.
- Individual pick lists still show a held pick's old grade (no performance claim); a "not verified" badge is a follow-up.
- Trial abuse via wallets without a card fingerprint, Gmail aliases: known, accepted gaps.
- An old stash `stash@{0}` (feat/consensus-tracker WIP) lives in the shared hiddenbag-v2 repo; left untouched.

## Recovery steps
- **Writer down / stale consensus:** both sites hide today's board after 5 min. `pm2 logs hb-consensus-writer`; `pm2 restart hb-consensus-writer`. Full removal: Stage 1 rollback.
- **Bad deploy on Hetzner files:** each copied file has `<file>.bak-<date>`; restore + `pm2 restart <proc> && pm2 save`.
- **Re-grade wrong:** `<prepare-dir>/final/sql/99-ROLLBACK.sql` (prints `0|0` when exact), then `update-capper-stats.mjs`.
- **Migrations:** each has a `_ROLLBACK.sql`; order in the runbook Stage 2.
- **DailyAI:** `CONSENSUS_SOURCE=legacy`, unset `PRICING_MODE`, or redeploy `ad8cd80`.
- **Resume this work:** read this file, then the runbook; branches above; `npm test` (DAI), `npx jest && npm run -s test:consensus && (cd bot && npx vitest run)` (HB).
