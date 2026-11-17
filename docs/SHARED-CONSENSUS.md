# Shared consensus: one writer, two readers

Status: built and tested locally on branch `feat/shared-consensus`. Nothing is
deployed. The production steps are in `docs/SHARED-CONSENSUS-RUNBOOK.md` and each one
needs approval.

## Why

Before this branch, four different algorithms computed "consensus" from the same `hb_picks` rows:

| Where | Window | Grouping | Capper dedupe | Problems |
|---|---|---|---|---|
| DailyAI `consensus-builder.ts` | created_at 00:00Z → +1d 04:59Z, **no pagination** (1000-row cap) | team + sport + betType + **exact line string** | capper **name** | "+2.0" ≠ "+2"; one side split across lines; aggregators counted; cancelled/late picks counted |
| HB `/consensus` page | posted_at, `limit(2000)` | per game side, **ML + spread merged**, no totals | capper name | late picks after tip skipped; totals missing |
| HB `consensus-engine.mjs` | created_at, **result = pending only**, 1000 cap | game\|team\|side, **ML + spread merged**, totals separate | capper_id | groups vanish once graded; duplicate capper rows count twice |
| DailyAI `ai-picks/engine.ts` | its own query, `limit(500)` | sport\|team\|type\|line | name | a fourth count |

The two sites showed different numbers, and the two track records disagreed: DailyAI's
was 963-908-17 and HB's trust bar showed 2611-2346-40.

## Architecture

```
hb_picks ─┐
hb_games ─┼─► scripts/consensus-writer.mjs (60 s loop, PM2 hb-consensus-writer)
hb_cappers┘        uses scripts/lib/consensus-core.mjs (pure engine)
                   │ upsert changed groups, delete vanished groups, heartbeat
                   ▼
           hb_consensus_live  (RLS on, service_role only)
           hb_consensus_meta  (writer heartbeat)
           hb_consensus_record (view, consensus_results-compatible columns)
             │                                   │
             ▼                                   ▼
 thehiddenbag.com /consensus           dailyaibetting.com /api/consensus,
 (src/lib/consensus-live.ts)           ?date=yesterday, /api/results, results page,
                                       AI-picks prompt (src/lib/data/hb-consensus.ts)
```

* **One writer.** Only `consensus-writer.mjs` computes consensus. DailyAI with
  `CONSENSUS_SOURCE=hb` computes nothing. It reads, maps to its `ConsensusPick` shape,
  and applies its own Free/Pro gate on the server (free = overall top 5, unknown
  entitlement = free slice).
* **Same read semantics.** Both readers filter on `et_date IN dates`,
  `capper_count >= min` (min clamped to 2..100), `result <> 'void'` and an optional
  sport, then sort with the same `compareLiveRows`. The parity tests pin this.
* **No LLM, no paid API.** It works with zero OpenRouter credits.

## Engine rules (`scripts/lib/consensus-core.mjs`)

* **Markets.** `moneyline`, `spread` and `total` are separate and never merged. A group is
  `(et_date, game, market, side)`, where side is home/away for ML and spread, and
  over/under for totals.
* **Lines.** Within a market, different lines are one side: +3 and +3.5 group together,
  and so do U41 and U41.5. Each pick keeps its original line, odds and timestamps in
  `picks` (jsonb).
  * `consensus_line` is the mode of the counted lines. Ties go to the line worse for the
    bettor.
  * `line_min` and `line_max` give the range, and `lines` gives the per-line count.
  * A spread pick whose sign is against the majority, or any pick far from the median
    (spread: more than max(3, 20%); total: more than max(3, 10%)), is a `line_outlier`.
    This catches first-half lines filed as game lines.
* **Game resolution.** Each pick's game is resolved from scratch: the `game_time` hint
  first, then `matched_game_id` if it is not stale, then the team's next unstarted game.
  Only the strongest team-name match competes. A game is only a candidate if it starts
  in [pick time − 6 h, pick time + 72 h], or + 8 days for NFL/NCAAF. Pick time is
  min(posted_at, created_at), because `posted_at` is synthetic for some sources.
  `matched_game_id` is NOT trusted; see "Data-quality findings".
* **Who counts.**
  * Cancelled or void picks never count.
  * Picks posted after the game started never count (`late_pick_count`).
  * One vote per canonical capper per (game, market). The capper's latest pick wins, so
    an edit or a flip to the other side replaces the earlier pick (`superseded` or
    `duplicate`) instead of adding a vote.
  * Canonical capper means rows merged by `hb_capper_aliases`, by normalized name
    ("Match Point Bets" = "MatchPointBets"), and by `NAME_MERGES` (Razor Ray Monohan →
    Ray Monohan).
* **Aggregators and group names never count** (`aggregator_count`, for transparency).
  * Aggregators are the known re-poster channels in `AGGREGATOR_NAMES`: Consensus Plays,
    THB Worker, THB Tech, thehiddenbag, Leaks, Info Plays, Bonus Cappers, Picks,
    Picks 4 Days, Your Daily Capper, R&R Totals, SRC Group and TheCapperConsensus. They
    are about 23% of rows.
  * **Group-name rule:** split the name on `, & + / and`. It is a group if at least two
    parts are known capper names, or if it is a comma list of three or more. Example:
    "MatchPointBets, Mojo, LearLocks & ThisGirlBetz" is a group. "R&R Totals" is not a
    group by this rule, but it is on the aggregator list.
  * A group name is never split into its members, because that would turn one message
    into several votes.
* **Tiers.** Agreement alone did not predict wins (see "Grading accuracy"), so there is
  no lock or nuclear wording.
  * `lean`: 2 cappers.
  * `consensus`: 3+ independent cappers.
  * `caution`: `opposing_count >= capper_count`.
  * Warnings: `crowded_7plus` and `contested`. `is_fire` = 3+ is the record's
    definition.
* **Grading.** Groups are graded only from the resolved game's final score in `hb_games`,
  at `graded_line`. With no final score the result is `pending`; a postponed or canceled
  game is `void`, which readers hide and the record excludes. `graded_odds` is the median
  of stated odds at that line.
  * Stored per-pick grades are never used, because they are graded against the often
    wrong `matched_game_id`.
  * The record can therefore be rebuilt with `--backfill` once the matcher is fixed.

### Table `hb_consensus_live`

One row per `(et_date, group_key)`, UNIQUE. `group_key = et_date|game_id|market|side`.
The columns are in the migration `supabase/migrations/20261117_hb_consensus_live.sql`.
Security:

* RLS is enabled, with policies only for service_role.
* `REVOKE ALL ... FROM PUBLIC, anon, authenticated` on both tables, the sequence and the
  view. Supabase's default privileges would otherwise grant ALL to anon.
* The record view is `security_invoker`.

### Writer behaviour

* **Each cycle (60 s).** It recomputes ET dates [today−2 .. today+1], upserts only rows
  whose content hash changed, and deletes groups that vanished on those dates. It never
  deletes when the pick read came back empty. Older dates are frozen history.
* **Reads.** Every read pages until an empty page arrives, so it is robust to any
  `max_rows`.
* **Timestamps.** `first_seen` is preserved across rewrites. `updated_at` changes only
  when content changes. `last_pick_at` is the newest counted pick's `created_at`.
* **Heartbeat.** It writes `hb_consensus_meta`.
* **Backfill.** `--backfill FROM TO` rebuilds history in 3-day chunks.

### Monitoring (`scripts/consensus-monitor.mjs`, PM2 cron every 5 min)

| Kind | Condition | Severity |
|---|---|---|
| `consensus_stale` | `hb_consensus_meta.last_success_at` > 5 min old | critical |
| `consensus_ingest` | no new `hb_picks` row for 90 min, 11:00–24:00 ET | warning |
| `consensus_lag` | p95(updated_at − last_pick_at) over the last hour > 120 s | warning |

It uses the same incident model as `sync-monitor.mjs`: `hb_sync_incidents` with scope
`consensus`, one alert when an incident opens and one on recovery. Alerts go to the
Discord `DISCORD_ALERT_WEBHOOK_URL` and, if set, to Telegram via `TELEGRAM_BOT_TOKEN` /
`TELEGRAM_CHAT_ID`. Without `--live-alerts` it only prints.

## Before / after (real picks, read-only, 2026-11-16)

Reproduced from the read-only production dump with each old algorithm's grouping rules
(script: session scratchpad `beforeafter.mjs`).

| Game / market | Old DailyAI | Old HB engine | **New shared** | Why |
|---|---|---|---|---|
| NFL Ravens spread (vs Chargers) | "-4.5" **7** cappers, -3.5: 2, -2.5: 1 | "side" **11** (ML merged with spreads) | **5** independent at -4.5 (range -4.5..-2.5), 4 aggregators excluded, 2 opposing; result **loss** | aggregators re-posted the same play; ML ≠ spread |
| NFL Chargers@Ravens Over | 38.5: 3, 39.5: 2, 39: 1, plus junk "242": 1 (max group 3) | over **5** | **6** at 38.5 (range 38.5..39.5); **win** | exact-line split; a 242 total is a parse error |
| NBA Heat spread | "+2.0": **3** and "+2": **1** (same line, two strings), +2.5: 2, +8.5: 1 | not shown (matched to a past game) | **5** at +2 (range 2..2.5); **win** | string-exact lines; stale matched_game_id |
| NBA 76ers spread | max 2 (split over 5 lines) | not shown | **4**, but **4 opposing**: tier **caution** | lines fragmented; opposing side ignored |
| NFL Chargers +4.5 | "+5.0": 2, "+4.5": 2, "+10.5": 1, "+6": 1 | side **6** incl. ML and a +10.5 outlier | **2** with **5 opposing**: caution | ML merge + outlier inflated a contested side |

Old HB engine, live: it read `result='pending'` only, so this day's board was
**empty (0 groups)** by the time the games were graded.

## Latency

Measured on the local e2e (Postgres + PostgREST in Docker, fixture 1,251 picks):

* **A full writer cycle** takes 2.4 s for the first cycle (62 groups written) and ~1 s for a steady-state
  cycle, both including node start.
* **A new pick** (insert → one writer cycle → visible through both readers): **1.2–3.4 s**
  across two runs, with the writer cycle at 1.0–3.0 s including node start. This excludes
  the poll wait.
* **Engine alone:** ~2.6 s on 11,770 real picks; ~0.4 s at production cycle size
  (~2–3k picks).

Design worst case (pick inserted → both sites):

| Component | Time |
|---|---|
| Writer interval | 60 s |
| Cycle | ~2 s |
| DailyAI reader cache | 30 s |
| HB page (force-dynamic, no cache) | 0 s |
| **Total** | **≈ 92 s (< 2 min)** |

Ingestion before `hb_picks` (Discord → parse-worker, 10 s poll) is outside this budget.
Measured `created_at − posted_at`: p50 6 s, p90 33 min (backfill and reconcile picks).

## Grading accuracy (record recomputed under the new grouping)

Read-only, 2026-06-01..2026-11-16, 54,090 picks, 15,889 games:

* Old DailyAI record (`consensus_results`): **963-910-17 (51.4%)** at the 2026-11-17
  re-read (963-908-17 earlier the same day), 2,074 fire rows, 184 pending.
* **New shared fire record (post-review engine): 1236-1137-26 (52.1%)**. Breakdown:
  * By tier: consensus 1020-934-22 (52.2%), caution 216-203-4 (51.6%).
  * By market: ML 707-624 (53.1%), spread 316-311-13 (50.4%), total 213-202-13 (51.3%).
  * Crowded 7+: 199-204-3 (49.4%).
  * Lean (2 cappers): 694-614-17 (53.1%).
  * 113 pending (no final score in `hb_games`) and 18 void.
* Stored per-pick grades vs the final-score group grade disagree on **39.0%** of graded
  fire groups (936 of 2,399). The stored hb-auto-grade results cannot be trusted while
  the matcher bug stands.
* Conclusion: the consensus has no demonstrated edge (≈ break-even at −110). More
  agreement does not mean better results, so the product should not imply it does.

## Data-quality findings (need owner decisions)

1. **The parse-worker matcher matches picks to the PREVIOUS game.**
   * `resolveGameTime()` kept games within ±2 days and called
     `findMatchingGame({team, sport})` with no time. Every candidate's `hoursDiff` was
     Infinity, so the first team match in cache order won.
   * Its games cache was also unpaginated (1000-row cap over a 6-day window).
   * **Fix on this branch:** `bot/lib/game-window.mjs`, `parse-worker.mjs`, and test
     `scripts/tests/game-match.test.mjs`. The worker now checks upcoming games first
     (earliest wins), then games in progress; never a game more than 4 h old; and it
     pages the cache.
   * Deploying it touches the live ingestion worker, so it needs approval. Re-grading
     historical `hb_picks` is a data operation, so it also needs approval.
2. `hb_capper_stats` and the leaderboards are built on those per-pick grades and inherit
   the error.
3. Duplicate capper identities exist: 71 normalized-name collisions in `hb_cappers`, plus
   Ray Monohan / Razor Ray Monohan. The writer merges them at read time. Merging the rows
   themselves is a data operation.

## Independent review (2026-11-17), what was fixed

**Adversarial Evaluator: APPROVE WITH FIXES.** Fixed, each with a regression test
that fails on the pre-fix core:

* **Empty or failed `hb_games` / `hb_cappers` reads.** These used to wipe or corrupt the
  board. The cycle now aborts on such a read, and also when more than 60% of in-scope
  picks match no game. A mass delete (more than 30% of a date's groups in one cycle) is
  refused unless `--allow-mass-delete` is passed.
* **Sibling-team mismatch.** "Kansas" went to Kansas State. Only the strongest name
  match now competes.
* **Picks posted during game A for game B.** They now prefer the unstarted game.
* **NFL/NCAAF lookahead.** Picks posted up to 8 days ahead are now matched (the old
  limit was 72 h).
* **Line outliers.** Two voters on different lines are both kept, and a line crossing
  pick'em is no longer a sign outlier. The magnitude rule needs 3 or more voters.
* **Team or period totals without `bet_category`.** These are dropped below a per-sport
  game-total minimum (`GAME_TOTAL_MIN`).
* **Unknown capper ids.** A pick whose capper is not in `hb_cappers` never counts.
* **Late final scores.** Older pending groups are re-graded (`regradePending`, every
  ~30 min, 14 days back).
* **`hb_consensus_stats` 30-day window.** It now uses the ET date, not UTC.

**Security Engineer: APPROVE WITH FIXES, no critical or high findings.** Fixed:

* `/api/results` no longer falls back to the anon key in hb mode; it returns 503
  without the service key.
* `recent` now lists fire rows only.
* The monitor incident lookup uses `limit(1)` instead of `maybeSingle()`, so a
  duplicate open row cannot cause alert spam, and insert errors are logged.
* The e2e refuses any Docker container that is not `hbsc-*`.

Still open, by design or deferred:

* `import 'server-only'` guards. The `server-only` package is not installed in DailyAI.
* "One writer" is enforced by convention. Project A shares one service_role across 17
  apps, and a dedicated writer role would be stronger.
* Before applying 20261117b, grep the other 16 apps on project A for anon reads of
  `hb_consensus_track`, `hb_consensus_stats` and `hb_consensus_by_sport`.
* `first_seen` resets if a group vanishes for a cycle and comes back.

## Deferred (with reason)

* **Line open/current/move and the `consensus_market` tier.** Deferred because the
  `hb_games` opening and closing spread perspective is unverified.
* **`capper_quality` and `weighted_score` (shadow).** Deferred because no clean
  re-graded sample exists until the matcher fix plus a re-grade.
* **The `hb_cappers.is_aggregator` column.** The writer honours it if present. The
  aggregator list lives in code for now.
* **DailyAI `/api/results` views `daily`, `monthly` and `sport`.** They still read the
  legacy `consensus_results`-based views. `stats` and `recent`, and the results page
  (`performance.ts`), use the shared record.
* **The HB Discord alerter and digest still use their own queries.** They should move to
  `hb_consensus_live` in a follow-up, so Discord matches the sites.
