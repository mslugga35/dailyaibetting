# Consensus Track-Record System

Honest, persisted win/loss record for DailyAI consensus **fire picks** (3+ cappers).
"Logged before the game, graded after" — no fabricated numbers. Built 2026-06-01.

## Why it exists
The `/results` page + `/api/results` were scaffolded in code but the DB objects were
never created, so the page showed "Results tracking not yet configured" and there was
no verified win rate to show buyers (the #1 trust signal a picks site can have).

## How it works (end to end)
```
PM2 cron (daily 15:00 UTC) → scripts/grade-and-persist.mjs
  1. SNAPSHOT: GET /api/consensus (Bearer CRON_SECRET = full, unsliced)
       → fire picks (capperCount>=3) → save_daily_consensus RPC → PENDING rows
  2. GRADE:    GET /api/consensus?date=yesterday (already graded vs ESPN)
       → match by dedup_key (date|pick.id) → UPDATE rows to WIN/LOSS/PUSH
        ↓
consensus_results table  →  views (daily/monthly/sport)  →  /api/results
        ↓                                                         ↓
homepage win-rate bar (self-activating)              /results page (track record)
```

## Components
| Piece | Location |
|-------|----------|
| Table + views + RPC | `supabase/migrations/20260601_consensus_results.sql` (applied to shared Supabase `aeeykasmymitzbuhdlfe`) |
| Cron job | `scripts/grade-and-persist.mjs` (⚠️ `scripts/` is **gitignored** — deployed to Hetzner manually, NOT via git) |
| PM2 | `dailyai-track-record`, `cron_restart: '0 15 * * *'`, `--no-autorestart` (shows "stopped" between runs = healthy) |
| Read API | `/api/results?view=recent|daily|monthly|sport|stats|pending` (public read) |
| Write API | `/api/results` POST (`save_picks`/`grade`/`bulk_grade`) — **auth-gated** (`Bearer CRON_SECRET`) so the record can't be forged |
| Consensus bypass | `/api/consensus` treats `Bearer CRON_SECRET` as premium → returns full unsliced list |
| UI | `/results` page + homepage hero win-rate bar (only renders when `total > 0`) |

## Schema
`consensus_results(id, pick_date, sport, team, line, bet, capper_count, is_fire,
result['PENDING'|'WIN'|'LOSS'|'PUSH'|'CANCELLED'], final_score, dedup_key UNIQUE,
graded_at, graded_by, created_at, updated_at)`. RLS: public SELECT, service-role write.

**`dedup_key = '<pick_date>|<pick.id>'`** — `pick.id` (e.g. `Marlins_OVER_8`) is the stable
unique id from `formatConsensusOutput`. Same id appears in today's snapshot and tomorrow's
`?date=yesterday` grade pass, so they match. (First attempt used team+side → all picks
collapsed to one key because the formatted picks expose `matchup`/`bet`/`betType`, not
`team`/`side`.)

## Operate / verify
```bash
ssh hetzner "cd /root/apps/dailyaibetting && node scripts/grade-and-persist.mjs"   # run now
# expect: "snapshot: N fire picks, M new rows inserted" + "grade: K graded, U updated"
```
Data accumulates daily. The homepage win-rate bar + `/results` tables populate
automatically once picks get graded (the day after they're snapshotted).

## Gotchas
- Cron READS via the live API (not localhost — localhost:3000 isn't reachable from the
  script context on Hetzner). Uses `NEXT_PUBLIC_SITE_URL`.
- Re-deploying DailyAI (`git reset --hard`) does NOT remove the gitignored cron script
  (untracked files survive). But if the app dir is ever re-cloned, re-transfer the script.
- Grading depends on the consensus `?date=yesterday` endpoint returning `result` (W/L/P)
  from ESPN scores — same logic the site already used for the yesterday tab.
- Win-rate bar is gated on real data — it will be empty for ~1 day after launch (until the
  first snapshot→grade cycle completes). This is intended; never show 0-0.
