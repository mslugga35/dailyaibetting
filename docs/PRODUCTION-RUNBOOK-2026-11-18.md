# Production runbook: shared consensus, re-grade, DailyAI bundle, founding pricing (v2, 2026-11-18)

Run stages in order; stop at the first failed check. Each stage lists its exact changes, checks and
rollback. Stage 1 is DONE. Every other stage needs the owner's production authorization.
Progress, open items and recovery steps: `docs/LAUNCH-CHECKPOINT-2026-11-18.md`.

| Artifact | Where | Evidence |
|---|---|---|
| DailyAI bundle | `integrate/launch-bundle` (worktree `C:/Users/mpmmo/wt/dai-integrate`) | harness 408/408, tsc 0, build OK; founding Stripe-test e2e 75/0 (+1 blocked: portal bot challenge) on `9b9f986`; the rerun on `4191757` (security-review fixes) was stopped by low memory, **rerun before Stage 8** |
| HiddenBag branch on `origin/master` | `feat/shared-consensus-on-master` (worktree `C:/Users/mpmmo/wt/hb-trial-merge`) | jest 486, bot 434, consensus 50, tsc 0, `next build --webpack` OK (clean-clone Turbopack build stopped by low memory: rerun before Stage 3) |
| Re-grade pipeline | HB `scripts/qa/regrade-prepare.sh` (dry run → independent verify → exclusions → verify → local rehearsal) | final plan 0 verification failures, rehearsal 16/16 incl. exact rollback |

Hand-deployed files on Hetzner (`/root/hiddenbag-v2`, never `git pull`): copy LF blobs with
`git show <commit>:<path>`, check sha256 before and after, keep `<file>.bak-<date>`.

## Stage 1: shared consensus table + writer ✅ DONE 2026-11-18 09:10Z
- `hb_consensus_live`, `hb_consensus_meta`, view `hb_consensus_record` (service_role only; anon GET/POST 401).
- PM2 `hb-consensus-writer` online (60 s, ~0.8 s/cycle, ~115 MB), backfill 2026-06-01..11-17 (3,971 rows).
- **Rollback:** `pm2 delete hb-consensus-writer hb-consensus-monitor && pm2 save`, then `20261117_hb_consensus_live_ROLLBACK.sql`.

## Stage 1b: consensus monitor fix (1 file)
The monitor is idle under PM2: PM2 fork mode loads the script via `import(pm_exec_path)`, so its
`argv[1]` entry guard never ran `main()`. No consensus stale alerts until this ships (the sites'
own stale guards are unaffected).
1. Backup, copy `scripts/consensus-monitor.mjs` from HB `ba981d8` (sha check), `pm2 restart hb-consensus-monitor && pm2 save`.
2. **Check:** within 5 min `pm2 logs hb-consensus-monitor` shows three `[consensus-monitor] OK` lines.
3. **Rollback:** restore the `.bak`, restart.

## Stage 2: database migrations (Supabase A; additive)
1. `20261117b_consensus_track_from_live.sql`: HB trust-bar views read the shared record; revokes anon
   INSERT/UPDATE/DELETE/TRUNCATE that anon holds today. Only HiddenBag reads these views (service key).
2. `20261118_hb_picks_stats_excluded.sql`: adds `hb_picks.stats_excluded boolean NOT NULL DEFAULT false`
   + `stats_excluded_reason` + a partial index. Metadata-only (no rewrite), `lock_timeout 3s` (re-run if it times out).
   **Must precede Stages 3, 4 and 6** (their stats queries filter on it).
- **Checks:** `/` and `/results` on thehiddenbag.com show the record; `select count(*) from hb_picks where stats_excluded` = 0;
  parse-worker keeps inserting (newest `hb_picks.created_at` < 15 min in active hours).
- **Rollback:** `20261117b_..._ROLLBACK.sql`; `20261118_hb_picks_stats_excluded_ROLLBACK.sql` only after Stages 3/4/6 code is rolled back.

## Stage 3: HiddenBag website (Vercel deploys on push to `origin/master`)
Prerequisite: owner decision on HB local master (10 commits not on GitHub). The branch is built on `origin/master` and does not include them.
1. Push `feat/shared-consensus-on-master`, open PR, CI green, merge.
   Ships: `/consensus` from the shared table with the stale-writer guard; stats pages/leaderboard skip `stats_excluded`.
2. **Checks:** `/consensus` today = DailyAI groups; stop the writer 6 min → today shows "temporarily unavailable", yesterday stays; restart.
3. **Rollback:** Vercel "promote previous deployment" (or revert the merge).

## Stage 4: ingestion + grading fixes on Hetzner (4 + 1 files)
Fixes: picks no longer matched to games that already started (`posted_at` windows), paged games cache, and
**no more cross-team matches** (sport-blind city map "arizona → Cardinals", substring mascots "nets ⊂ hornets",
shared college mascots "Cowboys"). The grading engine `hb-auto-grade` uses the same matcher.
Live files are byte-identical to `origin/master` (verified 2026-11-18).
1. Backup + copy from HB branch HEAD: `bot/workers/parse-worker.mjs`, `bot/lib/game-window.mjs` (new),
   `scripts/grading/matchers/game-matcher.mjs`, `scripts/grading/matchers/team-matcher.mjs`,
   `scripts/update-capper-stats.mjs` (skips `stats_excluded`; needs Stage 2).
2. `pm2 restart hiddenbag-parse-worker && pm2 save` (auto-grade and capper stats pick the files up on their next cron).
3. **Checks (1 h):** 0 new picks matched to a game that started > 15 min before posting:
   `select count(*) from hb_picks p join hb_games g on g.id=p.matched_game_id where p.created_at > now()-interval '1 hour' and g.commence_time < p.posted_at - interval '15 minutes'`;
   match rate not below yesterday's; next `hb-auto-grade` run ends with `0 errors`; `update-capper-stats` completes.
4. **Rollback:** restore the five `.bak` files, restart parse-worker, save.

## Stage 5: historical re-grade (production data change)
Day of: `bash scripts/qa/regrade-prepare.sh <dir> C:/Users/mpmmo/wt/regrade-exclude-20261118.json` (≈10 min, read-only + local rehearsal).
It must end `READY`, with the final plan clean (0 verification failures, 0 grade disagreements) and rehearsal 16/16.

**Plan as of 2026-11-18 (`C:/Users/mpmmo/wt/regrade-20261118-v6`, verified clean and rehearsed 16/16; the first full `regrade-prepare.sh` run was stopped by low memory and must be run on apply day anyway):**

| | Count |
|---|---|
| Team-market picks since 2026-06-01 examined | ≈29,570 |
| Re-graded (game corrected, result recomputed) | 20,302 |
| Game link corrected only (still pending) | 47 |
| **Held, unchanged, excluded from stats** | **2,375** = 1,925 no gradeable game/score + 450 the independent check could not confirm |
| Independent re-grade agreement (own matcher + grader) | 20,120 / 20,120 (182 team totals / ML draws not independently gradeable) |
| Overall record now | 15,004-13,939-423 (51.8%) |
| Overall record after (holds excluded) | 14,043-12,662-286 (52.6%) |
| Cappers whose record changes | 237 |

**Changes:** run `final/sql` through `scripts/lib/supabase-sql.mjs` in order:
`01-backup` (expect = plan rows) → `02-apply-01..11` (optimistic: only rows still as the plan saw them) → `03-verify` →
`04-flag-holds-backup` → `04-flag-holds-01..02` → `05-verify-holds` (flagged = holds, `result_changed_must_be_0` = 0) →
`node scripts/update-capper-stats.mjs` on Hetzner.

**Published records change:** every capper page, leaderboard, units/ROI on both sites (237 cappers). Not the consensus/fire record (Stage 1 writer grades it independently).

**Rollback:** `99-ROLLBACK.sql` (two passes: results, then exact `graded_at`/`units_result`; unflags holds; self-check prints `0|0`), then `update-capper-stats.mjs`. Keep both backup tables until owner sign-off.

## Stage 6: DailyAI bundle deploy (behaviour unchanged by default; needs Stage 2)
1. Push `integrate/launch-bundle` to `master` (GitHub Actions deploy). Defaults: `CONSENSUS_SOURCE` unset (legacy), `PRICING_MODE` unset ($20 exactly as today).
2. **Checks:** `/`, `/pricing`, `/pro`, `/account`, `/results`, `/daily-ai-picks` render; `/api/consensus` 200; checkout starts at $20; admin locked; capper profile loads (uses `stats_excluded`).
3. Set `CONSENSUS_SOURCE=hb`, restart. **Checks:** DailyAI `/api/consensus` = HB `/consensus`; stop the HB writer 6 min → DailyAI 503 `stale:true`, page "Unable to load picks"; restart writer; then `pm2 stop dailyai-track-record && pm2 save`.
4. **Rollback:** `CONSENSUS_SOURCE=legacy` + restart (restart `dailyai-track-record`), or redeploy `ad8cd80`.

## Stage 7: daily AI report (paid)
- Live state (checked 2026-11-18): `/etc/dailyai-cron/paid-jobs.enabled` exists since 11-17; `OPENROUTER_MONTHLY_BUDGET_USD=20`; the app's budget gate fails closed. Jobs: ai-picks 10:00, daily-report 10:20, blog-recap 10:40 ET. They fail with 402 today (credits ≈ $0.03), costing nothing.
- **Adding OpenRouter credits starts spending automatically** (≤ $20/month cap). To hold: `rm /etc/dailyai-cron/paid-jobs.enabled` (owner OK).
- **Check after credits:** `/var/log/dailyai-cron/daily-report.log` shows OK, budget % in the log, `/daily-ai-picks` renders.

## Stage 8: founding pricing (live Stripe + DailyAI DB)
Verified read-only on live Stripe: `STRIPE_PRICE_ID` = $20.00/month active; 2 active + 8 canceled $20 subscriptions; no founding env.
- Existing $20 subscriptions are never modified (card check and all automation apply only to the new prices; the portal blocks plan switching).
- Seat ceiling 100 enforced in the app (`FOUNDING_SEAT_CAP` max 100) and the DB (`least(p_cap, 100)`); paid seats are permanent.
- **Trial reuse (fixed):** a card that already had a DailyAI trial → the new trial is **cancelled with no invoice and no charge**, access ends, seat released, customer emailed "nothing was charged; subscribe without a trial"; the success page says the same (never "Welcome to Pro"). Crash-safe: a partial failure is finished on Stripe's redelivery; the email is never sent twice.

**Changes:**
1. Apply `20261117000000_dailyai_founding_seats.sql` (new objects; service_role only).
2. Live Stripe: price $9.99 `dailyai_pro_founding_monthly`, price $19.99 `dailyai_pro_regular_monthly`; portal configuration (no plan switch, cancel at period end); webhook endpoint + `invoice.paid`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`.
3. Env: `STRIPE_PRICE_FOUNDING`, `STRIPE_PRICE_PRO`, `STRIPE_PORTAL_CONFIGURATION_ID`, `RESEND_API_KEY` present (trial-refusal email); keep `STRIPE_PRICE_ID`. Then `PRICING_MODE=founding`, rebuild, restart.
4. **Checks:** /pricing shows $9.99, "100 of 100 left", dated first charge; one real owner purchase (owner's card) → invoice $9.99 after trial, seat `trialing` → `converted`; the 2 active $20 subscriptions unchanged (price id, next invoice $20).
5. **Rollback:** unset `PRICING_MODE`, rebuild (keep founding/regular price ids allowed so founders keep access).

## Owner decisions (business/legal)
1. **Legal copy** (counsel): refund window/terms (policy §4); renewal acknowledgment emails; Terms placeholders (entity, address, governing law, liability cap, founding terms, analytics consent); the wording of the trial-refusal email/page.
2. **HB local master**: 10 commits not on GitHub; push or drop before Stage 3.
3. **OpenRouter**: add credits (starts paid jobs within the $20 cap) or remove the paid flag until Stage 7.

This is not legal advice.
