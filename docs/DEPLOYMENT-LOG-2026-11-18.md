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
