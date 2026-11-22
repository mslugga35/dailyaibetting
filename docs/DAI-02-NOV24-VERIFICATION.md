# DAI-02: grader production check 2 (run on or after 2026-11-24 00:00 ET)

Read-only. Do **not** run the grader manually, `--backfill`, or edit any pending row. The 31 rows held on 11-20 and every row dated before the 11-21 floor must stay untouched.

## Baseline (taken 2026-11-22 20:44Z, read-only)
| Metric | Value |
|---|---|
| Pending (all) | 96 |
| Pending, et_date < 2026-11-21 (pre-floor, never auto-regraded) | 52 |
| Pending, et_date ≥ 11-21 and started > 6 h ago | 3 |
| Rows with `grade_source` ending `_twin` | 162 |
| Fire record W-L-P (all rows) | 1303-1203-28 |

## Checks
1. **Writer log** (Hetzner, read-only): `pm2 logs hb-consensus-writer --lines 400 --nostream | grep "regrade older pending"`. Pass: at least one cycle after 11-24 00:00 ET shows `twin>0`, and no errors.
2. **Twin grades are correct.** List rows newly twin-graded since the baseline:
   ```sql
   select id, et_date, sport, market, side, team, opponent, home_team, away_team,
          consensus_line, result, grade_source, home_score, away_score, final_score, graded_at
   from hb_consensus_live
   where grade_source like '%_twin' and graded_at > '2026-11-22 20:44Z'
   order by graded_at;
   ```
   For each row, check against ESPN's final for that exact game (teams, date, score), and that the result follows from `side` + `consensus_line`. Any mismatch fails DAI-02.
3. **Nothing stuck.** Pending rows ≥ floor whose game started more than 6 h ago:
   ```sql
   select id, et_date, sport, team, opponent, commence_time, warnings
   from hb_consensus_live
   where result='pending' and et_date >= '2026-11-21' and commence_time < now() - interval '6 hours'
   order by commence_time;
   ```
   Pass: each one either has no final ESPN twin yet, or the writer log shows a hold reason for it (`held_conflict`, `row_orientation_mismatch`, `status_conflict`).
4. **Pre-floor rows untouched:**
   ```sql
   select count(*) from hb_consensus_live where et_date < '2026-11-21' and graded_at > '2026-11-22 20:44Z';
   ```
   Pass: 0, or every counted row is et_date 2026-11-20 and was graded before 2026-11-23 by the normal live `writeCycle` path (its 2-day window). Any row dated before 11-20 that changed fails the check.
5. **Record moves only by the new rows:** rerun the baseline query. The change in W/L/P equals the results of the rows from check 2 plus any normal fresh grades of games played since the baseline.

Result goes in `docs/DAILYAI-LAUNCH-MASTER-TRACKER.md` § DAI-02, as **VERIFIED** only if 1–5 pass.
