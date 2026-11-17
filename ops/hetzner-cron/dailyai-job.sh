#!/usr/bin/env bash
# DailyAI scheduled job runner (Hetzner). One invocation = one job; systemd timers call it.
#
#   dailyai-job.sh <grade-picks|ai-picks|daily-report|blog-recap> [--force]
#
# Guarantees
#   - auth:      CRON_SECRET is read from the app's .env.local and sent as a Bearer
#                header through a curl config on stdin (never on a command line / in ps).
#   - no overlap: a per-job flock; paid jobs also share one lock so they never run together.
#   - once a day: a paid job that already succeeded for today's ET date is skipped
#                 (unless --force). The app is idempotent per ET day as well.
#   - paid gate:  paid jobs do nothing unless /etc/dailyai-cron/paid-jobs.enabled exists
#                 AND the app confirms OpenRouter headroom (/api/cron/openrouter-budget).
#                 Anything unconfirmable = no paid call (fail closed).
#   - failures:   logged to /var/log/dailyai-cron/<job>.log + the journal, alerted to the
#                 ops Telegram chat, and the unit exits non-zero (systemctl --failed).
set -uo pipefail
umask 077

JOB="${1:-}"
FORCE="${2:-}"
APP_ENV="${DAILYAI_ENV_FILE:-/root/apps/dailyaibetting/.env.local}"
BASE_URL="${DAILYAI_BASE_URL:-http://127.0.0.1:3103}"
STATE_DIR="${DAILYAI_STATE_DIR:-/var/lib/dailyai-cron}"
LOG_DIR="${DAILYAI_LOG_DIR:-/var/log/dailyai-cron}"
LOCK_DIR="${DAILYAI_LOCK_DIR:-/run/lock}"
PAID_FLAG="${DAILYAI_PAID_FLAG:-/etc/dailyai-cron/paid-jobs.enabled}"
ALERT_ENV="${DAILYAI_ALERT_ENV:-/root/.hermes/.env}"
TELEGRAM_API="${DAILYAI_TELEGRAM_API:-https://api.telegram.org}"

case "$JOB" in
  grade-picks)  ROUTE=/api/cron/grade-picks;         PAID=0; TIMEOUT=170 ;;
  ai-picks)     ROUTE=/api/cron/ai-picks;            PAID=1; TIMEOUT=290 ;;
  daily-report) ROUTE=/api/cron/daily-ai-picks;      PAID=1; TIMEOUT=290 ;;
  blog-recap)   ROUTE=/api/cron/generate-blog-recap; PAID=1; TIMEOUT=170 ;;
  *) echo "usage: $0 <grade-picks|ai-picks|daily-report|blog-recap> [--force]" >&2; exit 64 ;;
esac
if [ -n "$FORCE" ] && [ "$FORCE" != "--force" ]; then echo "unknown option: $FORCE" >&2; exit 64; fi
TIMEOUT="${DAILYAI_TIMEOUT:-$TIMEOUT}"

mkdir -p "$STATE_DIR" "$LOG_DIR" "$LOCK_DIR"
LOG="$LOG_DIR/$JOB.log"
TODAY_ET="$(TZ=America/New_York date +%F)"
MONTH_UTC="$(date -u +%Y-%m)"   # OpenRouter's usage_monthly is a UTC month

log() {
  local line
  line="$(date -u +%FT%TZ) [$JOB] $*"
  printf '%s\n' "$line"
  printf '%s\n' "$line" >> "$LOG"
}

# Value of NAME from a dotenv file (last wins), without surrounding quotes or CR.
envval() {
  grep -E "^$1=" "$2" 2>/dev/null | tail -n 1 | cut -d= -f2- \
    | sed -e 's/\r$//' -e "s/^[\"']//" -e "s/[\"']\$//"
}

alert() {
  log "ALERT: $1"
  local token chat
  token="$(envval TELEGRAM_BOT_TOKEN "$ALERT_ENV")"
  chat="$(envval TELEGRAM_ALLOWED_USERS "$ALERT_ENV" | cut -d, -f1)"
  if [[ ! "$token" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]] || [[ ! "$chat" =~ ^-?[0-9]+$ ]]; then
    log "alert channel not configured ($ALERT_ENV): logged only"
    return 0
  fi
  printf 'url = "%s/bot%s/sendMessage"\n' "$TELEGRAM_API" "$token" \
    | curl -sS -o /dev/null --max-time 10 -K - \
        --data-urlencode "chat_id=$chat" \
        --data-urlencode "text=DailyAI cron [$JOB]: $1" \
    || log "alert delivery failed"
}

# One run of a job at a time: a slow run is never overlapped by the next timer or a manual run.
exec 9>"$LOCK_DIR/dailyai-cron-$JOB.lock"
if ! flock -n 9; then log "previous run still active: skipped"; exit 0; fi

if [ "$PAID" = 1 ]; then
  if [ ! -f "$PAID_FLAG" ]; then
    log "paid jobs disabled ($PAID_FLAG absent): skipped, no call made"
    exit 0
  fi
  if [ "$FORCE" != "--force" ] && [ "$(cat "$STATE_DIR/$JOB.last-success" 2>/dev/null)" = "$TODAY_ET" ]; then
    log "already succeeded for $TODAY_ET: skipped"
    exit 0
  fi
  exec 8>"$LOCK_DIR/dailyai-cron-paid.lock"
  if ! flock -w 900 8; then alert "paid-job lock busy for 15 min: not run"; exit 1; fi
fi

SECRET="$(envval CRON_SECRET "$APP_ENV")"
if [ -z "$SECRET" ]; then alert "CRON_SECRET missing from $APP_ENV: not run"; exit 1; fi
if [[ ! "$SECRET" =~ ^[A-Za-z0-9._~+/=-]+$ ]]; then alert "CRON_SECRET has unexpected characters: not run"; exit 1; fi

TMP="$(mktemp)"
trap 'rm -f -- "$TMP"' EXIT

# GET $1 with the cron bearer, timeout $2 s. Body -> $TMP, status -> $CODE (000 = no response).
call() {
  : > "$TMP"
  CODE="$(printf 'header = "Authorization: Bearer %s"\n' "$SECRET" \
    | curl -sS -K - -o "$TMP" -w '%{http_code}' --max-time "$2" "$BASE_URL$1" 2>>"$LOG")"
  [ -n "$CODE" ] || CODE=000
}

# jget KEY: top-level field of the JSON body in $TMP ("true"/"false" for booleans, "?" if absent/unparseable)
jget() {
  python3 -c 'import json,sys
try:
  v=json.load(open(sys.argv[1])).get(sys.argv[2], "?")
except Exception:
  v="?"
print(("true" if v else "false") if isinstance(v,bool) else v)' "$TMP" "$1"
}

if [ "$PAID" = 1 ]; then
  call /api/cron/openrouter-budget 30
  ALLOWED="$(jget allowed)"
  PCT="$(jget pct)"
  USED="$(jget usedMonthUsd)"
  BUDGET="$(jget budgetUsd)"
  if [ "$CODE" != 200 ] || [ "$ALLOWED" != true ]; then
    alert "budget check refused (HTTP $CODE, ${PCT}% of \$${BUDGET} used): paid job NOT run. $(jget error | head -c 200)"
    exit 1
  fi
  for t in 80 50; do
    if python3 -c 'import sys; sys.exit(0 if float(sys.argv[1]) >= float(sys.argv[2]) else 1)' "$PCT" "$t" 2>/dev/null; then
      if [ ! -f "$STATE_DIR/budget-alert-$MONTH_UTC-$t" ]; then
        touch "$STATE_DIR/budget-alert-$MONTH_UTC-$t"
        alert "OpenRouter spend is ${PCT}% of the \$${BUDGET} monthly cap (\$${USED} used, UTC month $MONTH_UTC)"
      fi
      break
    fi
  done
fi

START="$(date +%s)"
call "$ROUTE" "$TIMEOUT"
DUR=$(( $(date +%s) - START ))
BODY="$(head -c 600 "$TMP" | tr '\r\n' '  ' | sed -E 's/Bearer [^ "]+/Bearer [REDACTED]/g')"
SUCCESS="$(jget success)"

if [ "$CODE" = 200 ] && [ "$SUCCESS" = true ]; then
  log "OK (HTTP 200, ${DUR}s): $BODY"
  # A skipped run (e.g. no expert picks yet) made no paid call: leave the day open for a manual retry.
  if [ "$PAID" = 1 ] && [ "$(jget skipped)" != true ]; then printf '%s\n' "$TODAY_ET" > "$STATE_DIR/$JOB.last-success"; fi
  exit 0
fi
if [ "$JOB" = blog-recap ] && [ "$CODE" = 404 ]; then
  log "no consensus picks yet: nothing to write (HTTP 404, ${DUR}s)"
  exit 0
fi
alert "FAILED (HTTP $CODE, ${DUR}s): $(printf '%s' "$BODY" | head -c 300)"
exit 1
