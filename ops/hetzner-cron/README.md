# DailyAI scheduler (Hetzner, systemd timers)

Replaces the `vercel.json` crons that stopped when the site moved to Hetzner.
Each timer calls one cron route on the app over loopback (`127.0.0.1:3103`) with
`Authorization: Bearer $CRON_SECRET`.

| Timer | When (America/New_York, DST-aware) | Route | Cost |
|---|---|---|---|
| `dailyai-grade-picks` | 03:15 daily | `/api/cron/grade-picks` | free (ESPN scores) |
| `dailyai-ai-picks` | 10:00 daily | `/api/cron/ai-picks` | paid: Claude API Sonnet 4.6 (included Max-plan API credit) |
| `dailyai-daily-report` | 10:20 daily | `/api/cron/daily-ai-picks` | paid: Claude API Sonnet 4.6 (+ posts to Discord if `DISCORD_CONSENSUS_WEBHOOK_URL` is set) |
| `dailyai-blog-recap` | 10:40 daily | `/api/cron/generate-blog-recap` | free (data template, no model; since 2026-11-24) |

03:15 avoids the hour DST skips (spring) or repeats (fall).

## Safety properties
- **No overlap:** per-job `flock`; paid jobs also share one lock. A oneshot unit is never started twice by systemd.
- **Once per ET day (paid):** a paid job that succeeded today is skipped (`/var/lib/dailyai-cron/<job>.last-success`). The app is idempotent per ET day too (AI picks and report check what already exists before any paid call).
- **Paid gate, two keys:** a paid timer does nothing unless
  1. `/etc/dailyai-cron/paid-jobs.enabled` exists, and
  2. the app confirms budget headroom (`/api/cron/openrouter-budget`; the path is historical, it reads the Claude API spend ledger).
- **Budget cap, enforced in the app** (`src/lib/utils/ai-model.ts`): every Claude API call first reserves its worst-case cost in this UTC month's ledger (`AI_SPEND_LEDGER_PATH`) and is refused if that could exceed `AI_MONTHLY_BUDGET_USD`; the real cost from `usage` replaces the reservation afterwards. Second stop: the Console organization has no payment method and no auto-reload, so Anthropic stops serving when the included credit is used up. There is never a fallback to another provider.
  - Unset budget, failed usage check, or unknown model price means **no call**.
  - Calls are serialized in-process. The ledger is written atomically; a corrupt or unreadable ledger refuses the call.
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
1. Add `ANTHROPIC_API_KEY` (dedicated DailyAI key), `AI_MONTHLY_BUDGET_USD=15` and `AI_SPEND_LEDGER_PATH=/var/lib/dailyai/ai-spend.json` to `/root/apps/dailyaibetting/.env.local`. Create the spend ledger once (a missing ledger refuses every paid call):
   `mkdir -p /var/lib/dailyai && printf '{"month":"%s","spentUsd":0,"calls":0}' "$(date -u +%Y-%m)" > /var/lib/dailyai/ai-spend.json && chmod 600 /var/lib/dailyai/ai-spend.json`
   Then run `pm2 restart dailyaibetting`.
2. Check the cap: `bash /usr/local/lib/dailyai-cron/dailyai-job.sh ai-picks`. It must log `paid jobs disabled` (flag not set yet).
3. Backstop (required): the key's Console organization holds only the included monthly API credit: no payment method, auto-reload off.
4. Turn the paid timers on:
   ```bash
   bash install.sh grade-picks ai-picks daily-report blog-recap
   touch /etc/dailyai-cron/paid-jobs.enabled
   ```

## Stop / roll back
- **Paid kill switch (instant):** `rm /etc/dailyai-cron/paid-jobs.enabled`, or remove `AI_MONTHLY_BUDGET_USD` and restart.
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
