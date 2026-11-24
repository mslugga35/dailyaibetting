# DailyAI scheduler (Hetzner, systemd timers)

Replaces the `vercel.json` crons that stopped when the site moved to Hetzner.
Each timer calls one cron route on the app over loopback (`127.0.0.1:3103`) with
`Authorization: Bearer $CRON_SECRET`.

| Timer | When (America/New_York, DST-aware) | Route | Cost |
|---|---|---|---|
| `dailyai-grade-picks` | 03:15 daily | `/api/cron/grade-picks` | free (ESPN scores) |
| `dailyai-ai-picks` | 10:00 daily | `/api/cron/ai-picks` | paid: OpenRouter Sonnet 4.6 |
| `dailyai-daily-report` | 10:20 daily | `/api/cron/daily-ai-picks` | paid: OpenRouter Sonnet 4.6 (+ posts to Discord if `DISCORD_CONSENSUS_WEBHOOK_URL` is set) |
| `dailyai-blog-recap` | 10:40 daily | `/api/cron/generate-blog-recap` | free (data template, no model; since 2026-11-24) |

03:15 avoids the hour DST skips (spring) or repeats (fall).

## Safety properties
- **No overlap:** per-job `flock`; paid jobs also share one lock. A oneshot unit is never started twice by systemd.
- **Once per ET day (paid):** a paid job that succeeded today is skipped (`/var/lib/dailyai-cron/<job>.last-success`). The app is idempotent per ET day too (AI picks and report check what already exists before any paid call).
- **Paid gate, two keys:** a paid timer does nothing unless
  1. `/etc/dailyai-cron/paid-jobs.enabled` exists, and
  2. the app confirms OpenRouter headroom (`/api/cron/openrouter-budget`).
- **Budget cap, enforced in the app** (`src/lib/utils/openrouter.ts`): every OpenRouter call first reads this key's `usage_monthly` (UTC month) and refuses the call if spend plus this call's worst-case cost would exceed `OPENROUTER_MONTHLY_BUDGET_USD`.
  - Unset budget, failed usage check, or unknown model price means **no call**.
  - Calls are serialized in-process. Spend OpenRouter has not counted yet is added on top.
  - The manual `scripts/run-ai-picks.mjs` has the same check.
- **Alerts:** failures, budget refusals, and 50% / 80% spend (once per month each) go to the ops Telegram chat (`/root/.hermes/.env`, same as `hetzner-ops-watchdog`).
- **Logs:** `/var/log/dailyai-cron/<job>.log` (weekly rotation, 8 kept) plus the journal (`journalctl -u 'dailyai-cron@*'`).
- **Secrets:** CRON_SECRET and the Telegram token pass through curl configs on stdin, never on a command line. Response bodies are logged with any `Bearer …` redacted.

## Install (from the deployed checkout)
```bash
cd /root/apps/dailyaibetting/ops/hetzner-cron
bash install.sh grade-picks                       # stage 1: free grading only
bash /usr/local/lib/dailyai-cron/dailyai-job.sh grade-picks   # run once now, check the log
```

### Enable paid jobs (only after the spend is approved)
1. Add `OPENROUTER_MONTHLY_BUDGET_USD=20` to `/root/apps/dailyaibetting/.env.local`, then run `pm2 restart dailyaibetting`.
2. Check the cap: `bash /usr/local/lib/dailyai-cron/dailyai-job.sh ai-picks`. It must log `paid jobs disabled` (flag not set yet).
3. Optional backstop: set a credit limit on the OpenRouter key in the OpenRouter dashboard. A **dedicated DailyAI key** keeps `usage_monthly` DailyAI-only. A shared key also counts other apps' spend, which is stricter but never looser.
4. Turn the paid timers on:
   ```bash
   bash install.sh grade-picks ai-picks daily-report blog-recap
   touch /etc/dailyai-cron/paid-jobs.enabled
   ```

## Stop / roll back
- **Paid kill switch (instant):** `rm /etc/dailyai-cron/paid-jobs.enabled`, or remove `OPENROUTER_MONTHLY_BUDGET_USD` and restart.
- **One timer:** `systemctl disable --now dailyai-<job>.timer`
- **Everything:** `bash ops/hetzner-cron/uninstall.sh` removes the timers, units, runner and flag. It keeps logs and state; add `--purge` to delete those too. Nothing else is touched.

## Check
```bash
systemctl list-timers 'dailyai-*'
systemctl --failed | grep dailyai
tail -n 20 /var/log/dailyai-cron/*.log
```

## Local validation (Linux/WSL, never on the server)
`bash ops/hetzner-cron/test/run-tests.sh`

This runs the real runner against a mock app and Telegram, checks the DST schedules with `systemd-analyze calendar`, verifies the unit files, and runs install/uninstall in a scratch root.
