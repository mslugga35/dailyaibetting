#!/usr/bin/env bash
# Remove the DailyAI scheduler completely (rollback). Stops and disables every timer,
# removes the units, the runner and the paid flag. Logs (/var/log/dailyai-cron) and
# run state (/var/lib/dailyai-cron) are KEPT for the record unless --purge is given.
# Touches nothing else: the app, PM2, .env.local and other timers are untouched.
set -euo pipefail
ROOT="${DAILYAI_ROOT:-}"
SYSTEMCTL="${SYSTEMCTL:-systemctl}"
JOBS=(grade-picks ai-picks daily-report blog-recap)
PURGE="${1:-}"
if [ -n "$PURGE" ] && [ "$PURGE" != "--purge" ]; then echo "usage: $0 [--purge]" >&2; exit 64; fi

for j in "${JOBS[@]}"; do
  "$SYSTEMCTL" disable --now "dailyai-$j.timer" 2>/dev/null || true
  "$SYSTEMCTL" stop "dailyai-cron@$j.service" 2>/dev/null || true
done

rm -f -- "$ROOT/etc/systemd/system/dailyai-cron@.service"
for j in "${JOBS[@]}"; do rm -f -- "$ROOT/etc/systemd/system/dailyai-$j.timer"; done
rm -f -- "$ROOT/usr/local/lib/dailyai-cron/dailyai-job.sh" "$ROOT/usr/local/lib/dailyai-cron/README.md"
rmdir -- "$ROOT/usr/local/lib/dailyai-cron" 2>/dev/null || true
rm -f -- "$ROOT/etc/logrotate.d/dailyai-cron" "$ROOT/etc/dailyai-cron/paid-jobs.enabled"
rmdir -- "$ROOT/etc/dailyai-cron" 2>/dev/null || true

if [ "$PURGE" = "--purge" ]; then
  for d in "$ROOT/var/log/dailyai-cron" "$ROOT/var/lib/dailyai-cron"; do
    find "$d" -maxdepth 1 -type f -delete 2>/dev/null || true
    rmdir -- "$d" 2>/dev/null || true
  done
fi

"$SYSTEMCTL" daemon-reload
"$SYSTEMCTL" reset-failed 'dailyai-*' 2>/dev/null || true
echo "DailyAI scheduler removed."
