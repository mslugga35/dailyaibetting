# Production deployment log: Stages 1b–6 (2026-11-18)

Authorized by the owner on 2026-11-18 (Stages 1b through 6, sequential, stop on material deviation).
Not in scope: founding pricing / live Stripe changes (Stage 8), OpenRouter credits or paid activity (Stage 7).
Branches: HB `feat/shared-consensus-on-master` @ `1e90f29`; DAI `integrate/launch-bundle` @ `6cb04d7`.
Times UTC.

## Pre-flight (13:20)
- Peer Claude sessions: 96 listed; none active on HiddenBag/DailyAI (HB sessions offline).
- Hetzner `scripts/consensus-monitor.mjs` sha256 `789328…` = planned base `85606a2`; PM2 `hb-consensus-monitor` args `--live-alerts`, cron `*/5`.
- `hb_sync_incidents` (scope consensus): no rows.

## Stage 1b: consensus monitor (13:20–13:27) ✅
- Dry run of `ba981d8` on Hetzner: runs, but `consensus_lag` FAILED falsely (p95 502 s): it measured
  `row.updated_at - last_pick_at`, and rows get rewritten for unrelated reasons (picks were counted 22 s after creation,
  12:32:49 cycle; rows rewritten 12:40:50). Would have raised false lag alerts. Fixed before activation: lag = newest
  pick not yet read by the writer (`meta.max_pick_created_at`) waiting > 120 s; a failed read gives no verdict
  (HB `7663ac8`, regression test from the production case, mutation-checked, consensus suite 51/51).
- Stale detection proven on live data with the deployed code (read-only): clock +0 → OK, clock +10 min → STALE DETECTED.
- Deployed: backup `scripts/consensus-monitor.mjs.bak-20261118` (sha `789328…`), new sha `16c9e687…`; `pm2 restart hb-consensus-monitor && pm2 save`.
- Verified: runs under PM2 for the first time; 13:24 and 13:25 cron runs each log 3 × OK (stale / ingest / lag).
- Rollback: restore the `.bak`, restart, save.

## Stage 2: database migrations (13:28–13:36) ✅
Pre-flight: 5/5 live function bodies byte-identical to `20261118b_ROLLBACK`; `stats_excluded` absent; 3 open
`hb_service_*` policies present; only HB `/` and `/results` read the consensus views (service role).
Snapshots of the live views, grants, functions and policies: `C:/Users/mpmmo/wt/deploy-20261118/pre-*.json`.

| Migration | Result |
|---|---|
| `20261117b_consensus_track_from_live` | applied. HB record now = shared FIRE record (same rows DailyAI reads): **1,236-1,140-26 (52.0%)**, 2,402 groups since 2026-06-01. Before (old per-site grouping of all-history picks): 2,614-2,352-40 (52.6%). anon SELECT revoked (service role only) |
| `20261118_hb_picks_stats_excluded` | applied. Column boolean NOT NULL DEFAULT false, partial index, 0 flagged |
| `20261118b_stats_excluded_db_functions` | applied. 5/5 functions carry the filter; output unchanged (nothing flagged yet); anon EXECUTE on read RPCs preserved |
| `20261118c_lock_legacy_stats_tables` | applied. anon INSERT/TRUNCATE false, SELECT true; policies `TO service_role`; anon EXECUTE on the 2 recompute functions false; service_role unaffected |

Smoke: thehiddenbag.com `/` and `/results` render with the new record (52%, 1236-1140-26, by-sport table, recent plays);
parse-worker processing batches normally, 0 restarts added; writer and monitor OK.
Rollback (reverse order): `20261118c_ROLLBACK`, `20261118b_ROLLBACK`, `20261117b_ROLLBACK`, then `20261118_ROLLBACK` only after Stages 3/4/6 code is rolled back.

## Stage 3: HiddenBag PR #29 (13:28– ) ⏸️ BLOCKED on Vercel Preview env (owner action)
- PR opened; CI `lint-and-test` green. Owner's merge-guard blocks the merge: the Vercel PREVIEW check fails on every PR
  (#21, #27 too) because all 22 Vercel env vars are Production-only, so preview builds die at module load.
- Secure fix prepared: cherry-picked PC2's reviewed `2bdff39` (lazy clients in `/api/contact`, `/api/leaderboard`) as `9e562cb`;
  a clean-clone `next build` with ONLY the public URL + anon key passes (74 routes). No service-role key in Preview.
- Adding the two public values to Vercel Preview was refused by the auto-mode classifier: owner action (below).

## Stage 4: ingestion + grading (13:35, 14:26) ✅
- 13:35 five files deployed (parse-worker, game-window, game-matcher, team-matcher, update-capper-stats); backups `.bak-20261118`.
  13:40 auto-grade 0 errors; 13:50 capper-stats 354 cappers, 0 errors.
- Found live: the grading engine only loads COMPLETED games and matched without a time window, so scraper picks
  (`source=scrape`, placeholder posted_at noon ET) on tonight's games were graded against the team's previous game
  (one stored cross-team match from the old matcher was graded via the stored id). Fixed (`9580421`): engine uses the
  same posted_at windows as the parse-worker/re-grade; out-of-window stored ids ignored. Plus PR #29 review fixes (`ae1d7e9`):
  games-cache ceiling reported (keeps previous cache), deterministic one-vote tiebreak, JSDoc.
- 14:26 deployed engine, game-matcher, game-window, parse-worker, consensus-core; backups `.bak-20261118b`; parse-worker +
  writer restarted, `pm2 save`. Writer: 0 rows changed by the tiebreak change.
- Rollback: restore `.bak-20261118b` (then `.bak-20261118` for Stage 4a), restart parse-worker + writer, save.

## Paywall (owner-authorized security fix, 14:14) ✅
- Pre-check found production differs from the plan: Discord read policy named `hb_anyone_read`, and `hb_service_write`
  FOR ALL TO public USING (true); anon/authenticated held INSERT/UPDATE/DELETE/TRUNCATE on both message tables
  (anon DELETE accepted: 204). Migration extended (drop/narrow both policies, revoke public writes, guard step 5);
  test models production: 44/44 + reader identity 26/26; guard mutation-checked (`f384d3d`).
- Pre-flight: no HB member entitled under old or new rule (0/0, none lose access); DailyAI reads with the service role;
  only anon readers in a 10-min window were my probes. Snapshot + generated exact rollback saved
  (`deploy-20261118/paywall-snapshot-before.json`, `paywall-rollback-generated.sql`, 40 statements).
- Applied 14:14:44 (guard passed). After: anon pending/messages/raw/today = 0; anon writes 401; graded public record
  34,745 (= before); leaderboard 117 / by-sport 11 rows (= before); service role reads all; /leaderboard renders.
- Rollback: run `deploy-20261118/paywall-rollback-generated.sql` (exact pre-state incl. production-only policies + grants).

## PR #29 review (PC2) resolution
1 verify-anon/verify-as-roles (service-only consensus, write probes) ✅ · 2 games-cache ceiling ✅ · 3 tiebreak ✅ · 4 JSDoc ✅ ·
5 backfill: `hb_consensus_live` 2026-06-01..11-18, 170 days, 2,540 fire groups; the one empty day (07-13, MLB All-Star break)
recomputes to 0 groups with the writer's engine ✅ · 6 all five migrations (17, 17b, 18, 18b, 18c) verified live ✅.

## Stage 3: HB PR #29 merged (owner, 16:19Z)
- Preview build fixed by adding only NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (role=anon) to Preview; service key stays Production-only.
- Merge 488c5e2, Vercel prod dpl_8pXinPHTUawkhaDbiCuqmfc51eXX READY (rollback: dpl_6RFMUFTyXHsCgMEZwfFBUwjxQx6Y). `/`, `/results` (1236-1140-26), `/leaderboard` (92), `/consensus` (paywalled) OK.
- Paywall rollback (32ea808) now restores the read path only, never the anon write hole; paywall tests 45/45, mutation-checked.

## Stage 5: re-grade applied (16:2x-16:3xZ)
- Fresh prep `C:/Users/mpmmo/wt/regrade-20261118-stage5`: READY, 20,354 rows, holds 2,382, 0 disagree, rehearsal 16/16 (plan 20,350-20,351 / 2,381-2,383).
- 01-backup 20,354; 02-apply 01..11 all applied; 03-verify regraded 20,302 / rematched 20,354 (no optimistic skips); holds backup 2,382; 05 flagged 2,382, result_changed 0.
- `update-capper-stats.mjs` on Hetzner: 354 cappers, 0 errors.
- Team markets since 06-01, holds excluded: 14,065-12,680-286 (52.6%) vs plan 14,043-12,662-286 (difference = picks graded since the plan).
- Backups kept: `hb_picks_regrade_bak_20261118`, `hb_picks_regrade_holds_20261118`. Rollback: `final/sql/99-ROLLBACK.sql` then update-capper-stats.
- Follow-up (not in plan, not changed): 4 picks outside the plan graded on a game that started before posting: 965bd063, ca513e68, eb0b7864, 765f70d5. e9a025d8 (Nets) is held (stats-excluded) but still displays "loss".

## Stage 6: DailyAI deployed (f768379)
- Fast-forward ad8cd80..f768379, GH Actions run 44349504073 OK; commit-info = f768379. Rollback: redeploy ad8cd80.
- Server-local `src/lib/harbor-posts.json` (+18 lines) backed up to `/root/backups/dai-20261118/`, restored after the hard reset, rebuilt, restarted, `pm2 save`. NOTE: gh-deploy.sh stashes `lib/harbor-posts.json`, not `src/lib/...`, so each deploy wipes it.
- Checks: `/ /pricing /pro /results /daily-ai-picks /api/consensus` 200, `/account` -> login, `/admin` 404; pricing $20/mo + 7-day trial, no founding offer.
- `CONSENSUS_SOURCE=hb` (`.env.local`, backup `env.local.bak`): API source=hb, 11 consensus / 6 fire = HB `hb_consensus_live`.
- Stale test: writer stopped 16:41:16Z; 503 `stale:true` confirmed. At ~16:48Z a transient PostgREST pool timeout hung one DAI request and failed the writer's first run after restart; DAI rolled back to legacy for ~3 min, writer recovered 16:50:35Z, DB 35/90 connections, `hb` re-enabled 16:53Z, 4/4 checks 200 (11/6).
- `dailyai-track-record` stopped + saved, BUT it has `cron_restart 0 15 * * *`, so PM2 will start it again tomorrow 15:00Z. Retire with `pm2 delete dailyai-track-record && pm2 save` (owner OK).

## Follow-ups (17:00-17:30Z)
1. **Harbor posts / gh-deploy.sh** (home repo `ops/scripts/gh-deploy.sh`, commit 03fcb59, local): old script stashed only `lib/...` and never popped -> every deploy wiped live posts (rv-dump-stations: 58 orphaned stashes). New: copy each locally modified preserved file (`lib|src/lib` harbor-posts.json, blog-data.ts, public/blog/index.html) to `/root/backups/gh-deploy/<site>/<UTC>/`, stop (exit 5) before the reset if upstream changed the same file, restore + `cmp` verify (exit 6) before build. Tests `ops/tests/test_gh_deploy_preserve.py` 5/5, mutation-checked. Verified on a throwaway clone of the live DAI checkout (sha 4c0d02d7 before = after). Installed on Hetzner, backup `gh-deploy.sh.bak-20261118`. DEPLOYED_OPS_SHA not updated (hand install).
2. **dailyai-track-record NOT retired**: `/history` daily summary + `/api/results?view=daily|monthly|sport` still read `consensus_results` views. Left running (cron 15:00Z). Runbook updated.
3. **Five picks** (backup `hb_picks_fix5_bak_20261118`, rollback `deploy-20261118/fix5-rollback.sql`): Nets e9a025d8 -> Bulls@Nets espn_401910011, pending, unheld; Lightning ca513e68 -> CHI@TB espn_401892650 (final 1-4, win unchanged); held (misparsed parlay legs): 765f70d5 ("Cincinnati/Indiana ML parlay" = college football, not Pacers), 965bd063 ("New Mexico/Arizona ML parlay", NCAAF not NCAAB), eb0b7864 (Porter Jr. 3PM parlay leg read as Bucks over 4.5). update-capper-stats 354/0 errors; TheGamblingGawd 212-175, Nextlevelbets 102-120, Mike Lundin 144-120 = direct recount.
4. **Pool exhaustion**: PostgREST "Timed out acquiring connection" 16:47:56-16:49:20Z only (writer, reconcile-worker, one DAI request); 0 since; 16 idle authenticator conns now; writer ok every 60 s; monitor OK (stale/ingest/lag). Root cause not attributable from logs (shared project, hb-auto-grade hourly run in progress). Stale test no longer stops the prod writer (runbook).
5. **Testers** (project A auth, no passwords: DAI login is email magic link only): mpm.morales+daifree / +daipaid / +daiadmin @gmail.com, ids d0e6c02d / e66beb55 / 8aa4b24a. Paid = `user_subscriptions` row status active, period end 2026-12-18, no Stripe (revoke: delete row). Admin = `ADMIN_USER_IDS` + `ADMIN_EMAILS` (one identity) in DAI `.env.local` (backup `env.local.pre-admin`), restarted, `pm2 save`.
6. **Smoke**: DAI `/` `/api/consensus` (hb 12/7) `/results` (1236-1141-26) `/history` APIs (daily 60 rows, stats OK) blog post `consensus-picks-vs-public-bets...` 200; `/admin` 404 unauthenticated; `/daily-ai-picks` "unavailable" (OpenRouter on hold, expected). Note: `view=recent` bet text carries a stray `##` suffix (e.g. "San Antonio Spurs -9.5##").
