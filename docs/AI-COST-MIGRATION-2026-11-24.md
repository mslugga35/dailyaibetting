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
