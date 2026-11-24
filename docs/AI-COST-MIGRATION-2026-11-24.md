# AI cost migration and Nov 24 grader check (2026-11-24)

Goal (owner): $0 additional recurring AI expense; no OpenRouter; no new paid service; no auto top-up.

## What runs where

| Function | Before | After | Cost |
|---|---|---|---|
| Blog recap (10:40 ET) | OpenRouter Haiku 4.5 | Data template (`src/lib/blog/recap-template.ts`), free job in the scheduler | $0 |
| AI Picks (10:00 ET) | OpenRouter Sonnet 4.6 (402 since 11-17) | Claude API Sonnet 4.6, dedicated DailyAI key, included Max credit (DEPLOYED d274737; inactive until the key + ledger exist) | covered by the credit |
| Daily AI Report (10:20 ET) | OpenRouter Sonnet 4.6 (402 since 11-17) | same as AI Picks | covered by the credit |
| Grading (03:15 ET) | ESPN | unchanged | $0 |

Expected usage: about $7-10/month (report about $0.15-0.20/run, picks under $0.13/run), against a $100/month
included credit (Max plan). App cap `AI_MONTHLY_BUDGET_USD=15`. Hard stop: the Console org has no payment
method and no auto-reload, so requests stop when the credit is gone. No fallback provider.

## Why things stopped
- **AI Picks:** only one run ever produced rows (15 picks, 2026-03-30). Nothing scheduled it after the move off
  Vercel (the Vercel project no longer exists); the Hetzner timer added 11-17 has failed daily on OpenRouter 402.
- **Daily AI Report:** written Apr-Oct by the HiddenBag script `hiddenbag-v2/scripts/daily-ai-report.mjs` on PC1
  via the owner's Max login (not allowed for a commercial product). Its pm2 entry disappeared around 10-19, the
  day BallparkPal/MLB was parked (commit 51df105); last report 2026-10-18. No explicit retirement record.
- **Duplicate prevention:** DailyAI's generator is the only writer of `daily_ai_report`. The HiddenBag script must
  stay unscheduled (PC1 pm2 entry absent; stale copy on Hetzner `/root/hiddenbag-v2/scripts/daily-ai-report.mjs`
  has no pm2 entry). HiddenBag's site does not read `daily_ai_report`.

## Retired (legacy)
- `src/lib/utils/openrouter.ts`, its tests, `scripts/run-ai-picks.mjs` (manual OpenRouter runner): removed (deployed d274737).
- Still to retire after the switch is verified (owner-visible, no code effect today): `vercel.json` crons (no
  Vercel project), `n8n-workflows/daily-ai-blog.json` (OpenAI, n8n not running), `hiddenbag-v2/scripts/daily-report/generate.mjs`
  (orphaned OpenRouter writer), the stale Hetzner copy above, `OPENROUTER_API_KEY` + `OPENROUTER_MONTHLY_BUDGET_USD`
  in prod `.env.local`, then the key itself in the OpenRouter dashboard (owner).

## DAI-02 Nov 24 grader check (read-only, 12:41Z)
- Check 4 PASS (no pre-floor rows changed). Check 1 PASS (writer cycle 05:13:51Z: twin=2, no errors).
- Check 2: 9 rows twin-graded since the baseline; all 9 match ESPN finals and the spread/ML math.
- Check 3 FAIL: 5 rows pending past 6 h although ESPN has finals (shared HiddenBag writer, not DailyAI code):
  - 4447 NM/Wichita St: deliberate hold `capper_grades_disagree` (AFS pick mis-resolved to another game); hold reason not stored.
  - 4732 LIU/Fairfield: name mismatch "LIU Sharks" vs "Long Island University Sharks".
  - 4607, 4748 Wyoming/Duquesne: home/away reversed vs ESPN; twins never matched.
  - 4908 Arizona/Colorado St: "Colorado St" vs "Colorado State" in the live path; the older-pending regrade window ends at yesterday-1.
- No records were modified. Fix belongs in the HiddenBag writer (`scripts/lib/consensus-core.mjs` / `consensus-store.mjs`), owner approval needed (shared).

## Deploys
- c3914ed (blog recap template): prod checks 19/19 x2; runner reinstalled (blog-recap free job).
- d274737 (Claude API client, OpenRouter code removed): prod checks 19/19 x2; runner reinstalled (timeouts 360/420 s,
  new alert text); budget route answers 503 "AI_MONTHLY_BUDGET_USD is not configured" = fail closed until setup.

## Owner setup to activate (then Claude verifies one real run of each job)
1. claude.ai > Settings > Billing > API credits > Link organization (new Console org, e.g. "DailyAI"). No card, auto-reload off.
2. Console > that org > API keys > create "dailyai-prod". Workspace spend limit if offered: $15/month.
3. On Hetzner (owner or Claude on request; never paste the key in chat): add to `/root/apps/dailyaibetting/.env.local`
   `ANTHROPIC_API_KEY=...`, `AI_MONTHLY_BUDGET_USD=15`, `AI_SPEND_LEDGER_PATH=/var/lib/dailyai/ai-spend.json`; create the
   ledger (ops/hetzner-cron/README.md step 1); `pm2 restart dailyaibetting`.

## Shared grader fix (HiddenBag consensus writer) — DEPLOYED 2026-11-24 14:44Z
- Source of truth: `hiddenbag-v2` branch `fix/consensus-writer-identity` (worktree `~/wt/hb-writer-identity`), commits
  1eb1def (exact deployed baseline, previously untracked copies) → f8c7126. Deploy ONLY with
  `scripts/tools/deploy-consensus-writer.sh` (from git blobs, md5-verified, drift guard, backups `*.bak-20261124T144429Z`,
  manifest `/root/hiddenbag-v2/scripts/CONSENSUS-WRITER-DEPLOYED.txt`). Branch not pushed (a push would start a Vercel preview).
- Design: one twin resolver for the live cycle and the late re-grade. Proof order: ESPN row `odds_api_id` = this game,
  then ESPN team id (committed map `scripts/lib/data/espn-teams.json` + reviewed `team-alias-overrides.json`), exact names
  outside the map. Never fuzzy; ambiguous = held. Reversed home/away graded through a view in the group's own orientation.
  Hold reasons in `grade_source` as `hold:<reason>` (fixed tokens; DailyAI never selects the column; HB page never renders it).
  Exact same-orientation matches grade as before; a graded group is never demoted; floor 2026-11-21 unchanged.
- "Regrade window excludes yesterday": not a gap. Yesterday and today-2 are graded by the live cycle every minute; the
  late re-grade covers today-16..today-3. The real defect was the live path's loose matcher + orientation rejection.
- Verification: 82 writer tests, 15 mutations (all caught), Architecture / Data / Breaker / Data-integrity / Verifier agents,
  production-input replay (live window: 0 graded rows changed), before/after snapshot of all 4,153 rows.
- Production effect (exactly 5 rows): 4732 LIU -2.5 loss (71-74); 4607 Wyoming +7.5 win and 4748 Wyoming ML win (79-61,
  ESPN listed Duquesne home); 4908 Arizona -15.5 loss (96-83); 4447 stays pending with `hold:capper_grades_disagree`.
  Fire record unchanged 1044-951-24 (these are 2-capper groups). Both sites 200.
- Open (needs owner approval, historical data): 17 pre-floor pending rows; most hold because stored capper grades came
  from other games (`game_resolved_by: next_game`), i.e. pick-level grading errors in HB, not consensus logic.

## Stripe MCP
- Stripe docs: from **2027-01-11** (not Nov 30) Stripe MCP rejects full-access `sk_` keys and non-agent restricted keys (401).
  Only the MCP server is named; app API calls with secret keys are not stated as affected.
- PC1 Claude Code, Claude Desktop, claude.ai connectors and Hetzner: **no Stripe MCP configured** → nothing breaks.
  To add it later: `claude mcp add --transport http stripe https://mcp.stripe.com/` then `/mcp` (OAuth, owner signs in;
  refresh tokens expire after 14 days) or an agent-tagged restricted key via env var. PC2 not checked from here.

## OpenRouter cleanup (prepared; credentials removed only after the Claude API switch is verified)
- Done locally (commit 25d1874, ships with the next code deploy): `vercel.json` crons removed, `n8n-workflows/daily-ai-blog.json` removed.
- Remaining: prod `.env.local` `OPENROUTER_API_KEY` + `OPENROUTER_MONTHLY_BUDGET_USD` (+ 2 backups) — no code reads them;
  HiddenBag `scripts/daily-report/generate.mjs` (orphan OpenRouter writer) and `scripts/daily-ai-report.mjs` (Max-login,
  retired) — HB repo change; then owner deletes the key in the OpenRouter dashboard. No other process or app on Hetzner uses it.
