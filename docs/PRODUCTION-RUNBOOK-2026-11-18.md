# Production runbook: shared consensus, re-grade, DailyAI bundle, founding pricing (2026-11-18)

Each stage is a **separate owner approval**. Run them in order; stop at the first failed check.
Prepared and tested locally only. Nothing below has been applied.

| Artifact | Where |
|---|---|
| DailyAI bundle | `integrate/launch-bundle` @ `27241c7` (worktree `C:/Users/mpmmo/wt/dai-integrate`), harness 402/402, tsc 0, build OK, founding e2e 69/0 |
| HiddenBag branch, rebased onto `origin/master` | `feat/shared-consensus-on-master` @ `85606a2` (worktree `C:/Users/mpmmo/wt/hb-trial-merge`), jest 478/478, consensus 40/40, tsc 0 |
| Re-grade dry run (prod data, not in git) | `C:/Users/mpmmo/wt/regrade-20261117/` (`summary.json`, `plan.json`, `holds.json`, `samples.json`, `sql/`) |
| Re-grade script | HB `scripts/qa/rematch-regrade-dryrun.mjs` (read-only; client blocks all writes) |

## Stage 0: pre-flight (read-only, plus owner items)
1. Run `/sessions`: no other session is touching Supabase A, Hetzner PM2 or either repo.
2. HiddenBag git: local `hiddenbag-v2` master has **10 unpushed commits** (`b6567ff`..`ae961bd`) and is behind `origin/master` by 21. The rebased branch is built on `origin/master`. **Owner decides** whether the 10 local commits get pushed (two-PC sync, PR #20) before or after this work. Stage 1 does not depend on that; Stage 3 does.
3. Owner: add OpenRouter credits (balance about $0.03; the daily report returns 402 every morning, alerting to Telegram). The $20 cap stays.

## Stage 1: shared consensus table + writer (HiddenBag, Supabase A, Hetzner PM2)
**Changes**
1. `node scripts/lib/supabase-sql.mjs "$(cat supabase/migrations/20261117_hb_consensus_live.sql)"`. This only creates **new** objects (`hb_consensus_live`, `hb_consensus_meta`, view `hb_consensus_record`). No existing table, view, policy or grant is changed.
2. Copy these files to `/root/hiddenbag-v2/` (hand-deployed; never `git pull`):
   - `scripts/consensus-writer.mjs`
   - `scripts/consensus-monitor.mjs`
   - `scripts/ecosystem.consensus.config.cjs`
   - `scripts/lib/consensus-core.mjs`
   - `scripts/lib/consensus-store.mjs`
   - `scripts/lib/db.mjs` already exists there.
3. `node scripts/consensus-writer.mjs --once`, then `--backfill 2026-06-01 <yesterday>`.
4. `pm2 start scripts/ecosystem.consensus.config.cjs && pm2 save`. This starts the writer (every 60 s) and the monitor (`--live-alerts`).

**Validation**
- Grants on the 3 new objects: only `service_role`/`postgres`. An anon REST `GET /rest/v1/hb_consensus_live` returns 401/403; **`200 []` = stop and revoke**.
- `select * from hb_consensus_meta`: `last_success_at` is under 2 min old, `last_error` is null.
- Groups per `et_date` are plausible; today has rows once picks exist.
- Load: about 2.3k rows read per cycle (894 picks/3 d, 907 games, 536 cappers, 481 aliases), only changed rows written, over PostgREST (no direct DB connections; 42/90 in use today).

**Already verified read-only on prod:** PostgreSQL 17.4 (supports `security_invoker`); none of the 3 new names exist.

**Rollback:** `pm2 delete hb-consensus-writer hb-consensus-monitor && pm2 save`, then `20261117_hb_consensus_live_ROLLBACK.sql`. No other app reads these objects.

## Stage 2: re-point HB trust-bar views (`20261117b`)
**Change:** replace `hb_consensus_track` / `hb_consensus_stats` / `hb_consensus_by_sport` so they read the shared record (`security_invoker`). Revoke anon/authenticated.

**Impact check (done):**
- Only HiddenBag reads these views (and its clones). Both readers (`src/app/page.tsx` `getConsensusRecord`, `src/app/results/page.tsx`) already use the **service key**. A missing key already yields "no record", not an error.
- Today anon holds **INSERT/UPDATE/DELETE/TRUNCATE** on all three views, so revoking it closes a hole.
- The planned paywall RLS migration (`planned/20261015_paywall_rls.sql`) skips `security_invoker` views, so the two are compatible.

**Validation:** `/` and `/results` on thehiddenbag.com show the record. `select * from hb_consensus_stats` equals DailyAI's `/api/results` record.

**Rollback:** `20261117b_consensus_track_from_live_ROLLBACK.sql` (restores the old definitions and grants).

## Stage 3: HiddenBag website (Vercel auto-deploys on push to `origin/master`)
1. Push `feat/shared-consensus-on-master` as a PR → CI green → merge. That deploys `/consensus` reading the shared table, with the stale-writer guard.
2. **Validation:** `/consensus` today matches DailyAI `/api/consensus` (same groups/counts). Stop the writer for 6 min on purpose: today shows "temporarily unavailable" and yesterday stays visible; restart the writer.
3. **Rollback:** Vercel "promote previous deployment", or revert the merge commit.

## Stage 4: parse-worker matcher fix (live ingestion)
1. Copy `bot/lib/game-window.mjs` and `bot/workers/parse-worker.mjs` (from the rebased branch) to `/root/hiddenbag-v2`. Back up the old `parse-worker.mjs` first as `parse-worker.mjs.bak-20261118`.
   - Verified 2026-11-18: the live file (sha256 `332926fd…`) is byte-identical to `origin/master`, so the copy changes only the 53-line matcher fix.
   - Re-check the sha immediately before copying.
2. `pm2 restart hiddenbag-parse-worker && pm2 save`.
3. **Validation (1 h):** every new pick with `matched_game_id` has a `commence_time` ≥ `posted_at − 4 h`. Run `select count(*) from hb_picks p join hb_games g on g.id=p.matched_game_id where p.created_at > now()-interval '1 hour' and g.commence_time < p.posted_at - interval '4 hours'`; expect 0. The match rate should be no lower than yesterday's.
4. **Rollback:** restore the `.bak`, then restart and save.

## Stage 5: historical re-grade (production data change)
**Dry run (prod, read-only, 2026-11-18): team-market picks since 2026-06-01, cancelled/void excluded**

| | Count |
|---|---|
| Picks examined | 29,548 |
| Matched to a game that had **already started** | 21,848 (74%) |
| Re-matched to a different game | 21,645 |
| **Re-graded (apply)** | **20,924** |
| Re-matched only, still pending (engine grades later) | 58 |
| **Held, not changed** (would lose a grade: 760 no game found, 664 ungradeable, 458 no final score) | 1,868 |
| Unchanged | 6,698 |
| Overall record before | 14,970-13,921-422 (51.8%) |
| Overall record after | 15,192-13,725-413 (52.5%) |
| Cappers whose record changes | 239 |

Flips are near-symmetric (win→loss 4,770 vs loss→win 4,915 in the raw scan), consistent with random wrong-game grading rather than a systematic bias.

**Does it change published records? Yes:**
- Every capper page and leaderboard on HiddenBag and DailyAI that reads `hb_picks.result` (239 cappers).
- Units/ROI: the `hb_picks_grade_trigger` recomputes `units_result` on every changed result.
- **Not** the consensus/fire record: from Stage 1 on, that is graded independently from final scores by the writer and does not read `hb_picks.result`.
- The old DailyAI `dailyai-track-record` number (963-910-17) is replaced by the shared record in Stage 6.

**Changes (in order):**
1. **Re-run the dry run immediately before applying** (data moves daily): `node scripts/qa/rematch-regrade-dryrun.mjs --emit-sql --out <dir>`. Compare `summary.json` with the table above; a large swing means stop.
2. `sql/01-backup.sql`: creates `hb_picks_regrade_bak_20261117` (RLS on, anon revoked) holding every touched row's `result`, `matched_game_id`, `game_time`, `graded_at`, `grading_source`, `match_confidence`, `actual_value`, `units_result`. Its count must equal `plan.json` length.
3. `sql/02-apply-01..11.sql` (2,000 rows each) through `scripts/lib/supabase-sql.mjs`.
   - Each UPDATE only touches a row whose `result` **and** `matched_game_id` still equal what the dry run saw, so concurrent grading is never overwritten.
   - Re-graded rows are tagged `grading_source='regrade_20261117'`.
4. `sql/03-verify.sql`, then `node scripts/update-capper-stats.mjs`.
5. Holds (1,868): report to the owner; never auto-applied.

**Rehearsed locally** (throwaway Postgres, real enum and trigger, the 20,982 affected rows):
- backup count 20,982;
- apply re-graded 20,924 and re-matched 58;
- second apply changed 0 rows (idempotent);
- rollback left 0 mismatches against the original.

**Rollback:** `sql/99-ROLLBACK.sql` (restores from the backup table; `graded_at` becomes now() for changed rows), then `update-capper-stats.mjs`. Keep the backup table until the owner signs off.

## Stage 6: DailyAI bundle deploy (behaviour unchanged by default)
1. Push `integrate/launch-bundle` to `master`, which runs the GitHub Actions deploy. Defaults: `CONSENSUS_SOURCE` unset (legacy builder + 1000-row fix), `PRICING_MODE` unset ($20 exactly as today).
2. **Validation:**
   - `/`, `/pricing`, `/pro`, `/account`, `/results`, `/daily-ai-picks` render;
   - `/api/consensus` is 200;
   - checkout start shows $20;
   - admin is still locked;
   - no "real-time / Verified / Unlock All" copy.
3. Set `CONSENSUS_SOURCE=hb` (requires Stage 1), then restart.
   - **Validation:** DailyAI `/api/consensus` equals HB `/consensus`.
   - Stop the HB writer for 6 min: DailyAI returns **503 `stale:true`**, the page shows "Unable to load picks", and the AI report prompt carries no consensus section.
   - Restart the writer, then `pm2 stop dailyai-track-record && pm2 save`.
4. **Rollback:** `CONSENSUS_SOURCE=legacy` and restart (start `dailyai-track-record` again); or redeploy `ad8cd80`.

## Stage 7: daily AI report
- Paid jobs have been enabled since the 11-17 GO (`/etc/dailyai-cron/paid-jobs.enabled`). They fail closed: today's 402 cost nothing.
- After credits are added: the 10:20 ET run succeeds; check `/var/log/dailyai-cron/daily-report.log` and the budget percentage.
- To pause until then (needs your OK): `rm /etc/dailyai-cron/paid-jobs.enabled`.
- With `CONSENSUS_SOURCE=hb` the report and blog recap read only the shared consensus.
- Bundle fix: the expert-pick window now uses the ET calendar day. A UTC date dropped today's picks for evening reruns.

## Stage 8: founding pricing (live Stripe + DailyAI DB)
**Verified read-only on live Stripe:**
- `STRIPE_PRICE_ID` = **$20.00/month, active**;
- 2 active and 8 canceled $20 subscriptions (plus 1 canceled $49 from another product);
- no founding env is set.

The bundle never modifies an existing subscription: no `subscriptions.update` on legacy-price subs, and the portal blocks plan switching.

**Seat ceiling:**
- At most 100 at the app (`FOUNDING_SEAT_CAP` max 100) and in the DB (`least(p_cap, 100)` in `dailyai_founding_reserve`).
- Paid seats are permanent (no "live" mode).
- Probe: 150 requests at cap 150 gave 100; with 100 paid, a cap of 100,000 returns `sold_out`.

**Changes:**
1. Apply `20261117000000_dailyai_founding_seats.sql` (new objects only; service_role only).
2. Live Stripe:
   - price $9.99 (`dailyai_pro_founding_monthly`) and price $19.99 (`dailyai_pro_regular_monthly`);
   - a portal configuration (no plan switch, cancel at period end);
   - webhook endpoint: add `invoice.paid`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`.
3. Env: `STRIPE_PRICE_FOUNDING`, `STRIPE_PRICE_PRO`, `STRIPE_PORTAL_CONFIGURATION_ID`; keep `STRIPE_PRICE_ID`. Then `PRICING_MODE=founding`, rebuild, restart.
4. **Validation:**
   - /pricing shows $9.99, "100 of 100 left" and the dated first charge;
   - one real owner purchase on the owner's own card: invoice $9.99 and a seat `trialing` → `converted`;
   - the 2 active $20 subscriptions are unchanged (price id, next invoice $20).
5. **Rollback:** unset `PRICING_MODE` and rebuild. Keep the founding/regular price ids allowed so existing founders keep access.

## Decisions needed from the owner (legal/business)
1. **Trial reuse handling (highest risk).** A card that already had a trial gets its trial ended right after checkout and is charged at once, although Checkout showed "$0 due today". Recommended instead: cancel that subscription with no charge and email "trial already used; subscribe without a trial". This needs your choice (and counsel's), because some state auto-renewal laws require clear consent to the charge.
2. **Refund policy text** (`docs/legal-drafts/cancellation-refund-policy.md` §4): choose the refund window/terms. The live site copy no longer cites the unpublished policy page; it says "email support@dailyaibetting.com and we will review your request".
3. **Renewal acknowledgment/reminder emails**: the policy has a placeholder. Some states require a post-purchase acknowledgment with cancellation instructions. Today only Stripe's receipt is sent.
4. **Terms placeholders**: entity, address, governing law and venue, liability cap enforceability, `[[FOUNDING_MEMBER_TERMS]]`, analytics consent approach.
5. **Re-grade holds** (1,868 graded picks whose correct game has no final score or cannot be found): leave as is (recommended), or void.
6. **HiddenBag local master** (10 unpushed commits): push or drop, before Stage 3.

This is not legal advice. Counsel should approve items 1–4 before founding mode or the legal pages go live.
