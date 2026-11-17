#!/usr/bin/env bash
# Install the DailyAI scheduler and enable ONLY the timers named on the command line.
#
#   ./install.sh                         install files, enable nothing
#   ./install.sh grade-picks             + enable the free grading timer
#   ./install.sh ai-picks daily-report blog-recap
#                                        + enable paid timers (they still do nothing until
#                                          /etc/dailyai-cron/paid-jobs.enabled exists and
#                                          OPENROUTER_MONTHLY_BUDGET_USD is set: see README)
#
# Never creates the paid flag. Re-running is safe (files are replaced, timers re-enabled).
# DAILYAI_ROOT / SYSTEMCTL exist only so the local validation can run it in a scratch root.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="${DAILYAI_ROOT:-}"
SYSTEMCTL="${SYSTEMCTL:-systemctl}"
JOBS=(grade-picks ai-picks daily-report blog-recap)

for j in "$@"; do
  case " ${JOBS[*]} " in *" $j "*) ;; *) echo "unknown job: $j (expected: ${JOBS[*]})" >&2; exit 64 ;; esac
done

install -d -m 755 "$ROOT/usr/local/lib/dailyai-cron" "$ROOT/etc/systemd/system" "$ROOT/etc/logrotate.d"
install -d -m 700 "$ROOT/etc/dailyai-cron"
install -m 755 "$HERE/dailyai-job.sh" "$ROOT/usr/local/lib/dailyai-cron/dailyai-job.sh"
install -m 644 "$HERE/README.md" "$ROOT/usr/local/lib/dailyai-cron/README.md"
install -m 644 "$HERE/dailyai-cron@.service" "$ROOT/etc/systemd/system/dailyai-cron@.service"
for j in "${JOBS[@]}"; do
  install -m 644 "$HERE/dailyai-$j.timer" "$ROOT/etc/systemd/system/dailyai-$j.timer"
done
install -m 644 "$HERE/dailyai-cron.logrotate" "$ROOT/etc/logrotate.d/dailyai-cron"

"$SYSTEMCTL" daemon-reload
for j in "$@"; do
  "$SYSTEMCTL" enable --now "dailyai-$j.timer"
done
"$SYSTEMCTL" list-timers 'dailyai-*' --all --no-pager || true
