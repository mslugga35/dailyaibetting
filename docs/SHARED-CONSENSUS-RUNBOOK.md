# Shared consensus — production deploy runbook

Every step below changes production and **needs owner approval**. Do them in order,
and verify each one before starting the next.

* **Project:** Supabase project **A** (`aeeyk…`). It serves 17 apps. The new objects
  are additive (two tables, one view), and steps 1–6 change nothing that existing apps
  read.
* **Branches:**
  * HiddenBag: `hiddenbag-v2` `feat/shared-consensus`.
  * DailyAI: `dailyaibetting-emg` `feat/shared-consensus`, cut from production `ad8cd80`.
* **Design:** `docs/SHARED-CONSENSUS.md` in the HiddenBag repo.

## 0. Preconditions

- [ ] Check for parallel Claude sessions working on HB/DailyAI production, and Supabase/PM2 on Hetzner.
- [ ] Merge or rebase both branches onto current production. The DailyAI branch is cut
      from `ad8cd80`; another agent is editing marketing pages on a different branch.
- [ ] Both test suites are green on the final commits:
  - HB: `npm test` (jest), `npm run test:consensus`, `cd bot && npx vitest run`.
    Two vitest failures exist at base `ae961bd` and are unrelated.
  - DailyAI: `node tests/harness/run.mjs`.
- [ ] Local e2e passes: `node --experimental-strip-types scripts/consensus-parity-e2e.mjs`
      (needs the local `hbsc-db` / `hbsc-rest` containers).

## 1. Create the table (project A)

```
node scripts/lib/supabase-sql.mjs "$(cat supabase/migrations/20261117_hb_consensus_live.sql)"
```
Verify:
```
select grantee, privilege_type from information_schema.role_table_grants
 where table_name in ('hb_consensus_live','hb_consensus_meta','hb_consensus_record');
-- expect ONLY service_role (and postgres)
select relname, relrowsecurity from pg_class where relname in ('hb_consensus_live','hb_consensus_meta');
```
Make an anon REST call: `GET /rest/v1/hb_consensus_live` with the anon key. It must
return **401 or 403 permission denied**. `200 []` means a grant leaked; stop and revoke.

## 2. Deploy the writer files to Hetzner (hand-deployed; never `git pull` there)

Copy the following to `/root/hiddenbag-v2/`:

* `scripts/lib/consensus-core.mjs`
* `scripts/lib/consensus-store.mjs`
* `scripts/consensus-writer.mjs`
* `scripts/consensus-monitor.mjs`
* `scripts/ecosystem.consensus.config.cjs`

Then run one cycle and check the heartbeat:
```
cd /root/hiddenbag-v2 && node scripts/consensus-writer.mjs --once
node scripts/lib/supabase-sql.mjs "select * from hb_consensus_meta"
node scripts/lib/supabase-sql.mjs "select et_date, count(*), sum((is_fire)::int) from hb_consensus_live group by 1 order by 1"
```

## 3. Backfill history (one record for both sites)

```
node scripts/consensus-writer.mjs --backfill 2026-06-01 <today-3>
```
This takes about 1 minute per month of data and only reads `hb_picks` / `hb_games`. The
expected order of magnitude (from the 2026-11-17 local recompute) is fire
**1186-1101-26** for 2026-06-01..11-16, with ~118 pending for games that have no final
score.

## 4. Start the writer and monitor (PM2)

```
pm2 start scripts/ecosystem.consensus.config.cjs && pm2 save
```
Check that `.env.local` has `DISCORD_ALERT_WEBHOOK_URL`, plus `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_CHAT_ID` if you want Telegram. Names only; never print the values.

Watch it for one hour:

* `pm2 logs hb-consensus-writer` shows `ok … written=…` every 60 s.
* `node scripts/consensus-monitor.mjs` (dry run) shows all checks OK.

## 5. HiddenBag website

Deploy `src/app/consensus/page.tsx` and `src/lib/consensus-live.ts`. The page reads with
the service-role key server-side, and the paywall is unchanged. Load `/consensus` as a
subscriber and check that it shows separate ML, spread and total cards with line ranges.

## 6. DailyAI

1. Deploy the branch build with `CONSENSUS_SOURCE=hb` in the production env (the app's
   `.env.local` on Hetzner).
2. Verify `GET /api/consensus` with the cron bearer returns `"source":"hb"`, and that its
   ids and counts equal the HB `/consensus` cards for today.
3. Verify anonymous `GET /api/consensus` returns ≤ 5 picks.
4. Verify `/results` shows the shared record (it reads `hb_consensus_record`).
5. Retire the old track-record job. It would keep writing a record nobody reads:
   `pm2 delete dailyai-track-record && pm2 save`.

## 7. HiddenBag trust bar and results page on the shared record

Only after step 3 is verified:
```
node scripts/lib/supabase-sql.mjs "$(cat supabase/migrations/20261117b_consensus_track_from_live.sql)"
```
Check that the homepage and `/results` numbers equal DailyAI `/api/results?view=stats`.

## 8. (Separate approval) Fix the parse-worker game matcher

Ship `bot/lib/game-window.mjs` + `bot/workers/parse-worker.mjs`. This touches the
**live ingestion worker**.

1. Deploy both files.
2. `pm2 restart hiddenbag-parse-worker && pm2 save`.
3. Watch `matched_game_id` on new picks for 1 hour. New picks should match games that
   have not started.

Then, as a separate **data operation** that needs its own approval:

1. Re-match and re-grade historical `hb_picks`.
2. Rebuild capper stats.
3. Re-run `--backfill` so the consensus record uses the corrected games. The consensus
   record grades from final scores, so it only needs the corrected game assignment.

## Rollback (reverse order; each step is independent)

| What | Rollback |
|---|---|
| DailyAI consensus/results | unset `CONSENSUS_SOURCE` (or set `legacy`), restart/redeploy; `pm2 start dailyai-track-record` from its previous definition + `pm2 save` |
| HB trust-bar views | `supabase/migrations/20261117b_consensus_track_from_live_ROLLBACK.sql` |
| HB /consensus page | redeploy the previous build (the page before this branch) |
| Writer + monitor | `pm2 delete hb-consensus-writer hb-consensus-monitor && pm2 save` |
| Table + view | `supabase/migrations/20261117_hb_consensus_live_ROLLBACK.sql`. Run it LAST, only after both sites stop reading it |
| Parse-worker matcher | restore the previous `bot/workers/parse-worker.mjs`, delete `bot/lib/game-window.mjs`, `pm2 restart hiddenbag-parse-worker && pm2 save` |

The legacy DailyAI path (`CONSENSUS_SOURCE=legacy`) keeps the old builder, with the
1000-row pagination fix applied, so it is a working fallback.
