#!/usr/bin/env bash
# Local validation of the DailyAI scheduler (run on Linux / WSL, never on the server):
#   bash ops/hetzner-cron/test/run-tests.sh
# Exercises the REAL dailyai-job.sh against a mock app + Telegram, the timer schedules
# across DST (systemd-analyze), unit-file syntax, and install/uninstall in a scratch root.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$(cd "$HERE/.." && pwd)"
JOBSH="$SRC/dailyai-job.sh"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ok   $*"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL $*"; }
check() { local d="$1"; shift; if "$@"; then ok "$d"; else bad "$d"; fi; }

T="$(mktemp -d /tmp/dailyai-cron-test.XXXXXX)"
PORT=$(( 20000 + RANDOM % 20000 ))
SECRET='harness-cron-secret-7f3a'
TG_TOKEN='123456:harnessTokenNeverReal'
cleanup() { kill "$MOCK" 2>/dev/null; wait "$MOCK" 2>/dev/null; rm -rf -- "${T:?}"; }
trap cleanup EXIT

printf 'CRON_SECRET="%s"\nOTHER=x\n' "$SECRET" > "$T/app.env"
printf 'TELEGRAM_BOT_TOKEN=%s\nTELEGRAM_ALLOWED_USERS=42,43\n' "$TG_TOKEN" > "$T/alert.env"
echo '{}' > "$T/config.json"
: > "$T/req.jsonl"
python3 "$HERE/mock_server.py" "$PORT" "$T/config.json" "$T/req.jsonl" &
MOCK=$!
for _ in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 0.1; done

export DAILYAI_ENV_FILE="$T/app.env" DAILYAI_BASE_URL="http://127.0.0.1:$PORT" \
  DAILYAI_STATE_DIR="$T/state" DAILYAI_LOG_DIR="$T/log" DAILYAI_LOCK_DIR="$T/lock" \
  DAILYAI_PAID_FLAG="$T/paid.enabled" DAILYAI_ALERT_ENV="$T/alert.env" \
  DAILYAI_TELEGRAM_API="http://127.0.0.1:$PORT"

reset() { : > "$T/req.jsonl"; rm -rf -- "${T:?}/state" "${T:?}/log"; rm -f -- "$T/paid.enabled"; echo "${1:-{\}}" > "$T/config.json"; }
count() { python3 -c 'import json,sys; print(sum(1 for l in open(sys.argv[1]) if json.loads(l)["path"]==sys.argv[2]))' "$T/req.jsonl" "$1"; }
alerts() { python3 -c 'import json,sys; print(sum(1 for l in open(sys.argv[1]) if json.loads(l)["path"].endswith("/sendMessage")))' "$T/req.jsonl"; }
run() { bash "$JOBSH" "$@" > "$T/out.txt" 2>&1; echo $?; }
BUDGET_OK='"/api/cron/openrouter-budget": {"status":200,"body":{"success":true,"allowed":true,"pct":12.5,"usedMonthUsd":2.5,"budgetUsd":20}}'

echo "== runner behaviour"
reset '{"/api/cron/grade-picks": {"status":200,"body":{"success":true,"message":"Graded 0 consensus + 3 AI picks"}}}'
check "grade-picks success exits 0"              [ "$(run grade-picks)" = 0 ]
check "exactly one request to the route"          [ "$(count /api/cron/grade-picks)" = 1 ]
check "sends Authorization: Bearer CRON_SECRET"    python3 -c 'import json,sys; r=[json.loads(l) for l in open(sys.argv[1])]; sys.exit(0 if r and r[0]["auth"]=="Bearer "+sys.argv[2] else 1)' "$T/req.jsonl" "$SECRET"
check "OK line logged with response"             grep -q 'OK (HTTP 200' "$T/log/grade-picks.log"
check "secret never written to the log"          bash -c "! grep -rq '$SECRET' '$T/log'"
check "grading is free: no budget check"          [ "$(count /api/cron/openrouter-budget)" = 0 ]

reset '{"/api/cron/grade-picks": {"status":500,"body":{"success":false,"error":"boom"}}}'
check "HTTP 500 exits non-zero"                  [ "$(run grade-picks)" = 1 ]
check "failure alerted to Telegram once"         [ "$(alerts)" = 1 ]
check "alert goes to first allowed chat id"      python3 -c 'import json,sys; r=[json.loads(l) for l in open(sys.argv[1]) if json.loads(l)["path"].endswith("/sendMessage")]; sys.exit(0 if r[0]["form"]["chat_id"]=="42" and "FAILED (HTTP 500" in r[0]["form"]["text"] else 1)' "$T/req.jsonl"
check "failure logged"                           grep -q 'ALERT: FAILED (HTTP 500' "$T/log/grade-picks.log"

reset '{"/api/cron/grade-picks": {"status":200,"body":{"success":false,"error":"partial"}}}'
check "HTTP 200 with success:false is a failure" [ "$(run grade-picks)" = 1 ]

reset; kill "$MOCK"; wait "$MOCK" 2>/dev/null
check "app down (no response) exits non-zero"    [ "$(run grade-picks)" = 1 ]
check "logged as HTTP 000"                       grep -q 'FAILED (HTTP 000' "$T/log/grade-picks.log"
python3 "$HERE/mock_server.py" "$PORT" "$T/config.json" "$T/req.jsonl" & MOCK=$!
for _ in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 0.1; done

reset '{"/api/cron/grade-picks": {"status":200,"body":{"success":true},"delay":5}}'
DAILYAI_TIMEOUT=2 bash "$JOBSH" grade-picks > /dev/null 2>&1; rc=$?
check "hung app is cut off by the timeout (exit 1)" [ "$rc" = 1 ]

echo "== no overlap"
reset '{"/api/cron/grade-picks": {"status":200,"body":{"success":true},"delay":3}}'
bash "$JOBSH" grade-picks > "$T/first.txt" 2>&1 & FIRST=$!
sleep 1
check "second run while first is active exits 0"  [ "$(run grade-picks)" = 0 ]
check "and says it skipped"                       grep -q 'previous run still active' "$T/out.txt"
check "secret not on any process command line"    bash -c "! ps -eo args | grep -v grep | grep -q '$SECRET'"
wait "$FIRST"
check "only one request reached the app"          [ "$(count /api/cron/grade-picks)" = 1 ]

echo "== paid-job gates"
reset "{$BUDGET_OK, \"/api/cron/ai-picks\": {\"status\":200,\"body\":{\"success\":true,\"message\":\"Generated 9 AI picks\"}}}"
check "paid job without the flag exits 0"         [ "$(run ai-picks)" = 0 ]
check "... and calls nothing at all"              [ "$(wc -l < "$T/req.jsonl")" = 0 ]
check "... and logs why"                          grep -q 'paid jobs disabled' "$T/log/ai-picks.log"

touch "$T/paid.enabled"
check "with flag + budget headroom: runs"         [ "$(run ai-picks)" = 0 ]
check "budget checked before the job"             python3 -c 'import json,sys; p=[json.loads(l)["path"] for l in open(sys.argv[1])]; sys.exit(0 if p==["/api/cron/openrouter-budget","/api/cron/ai-picks"] else 1)' "$T/req.jsonl"
check "success stamped with today's ET date"      [ "$(cat "$T/state/ai-picks.last-success")" = "$(TZ=America/New_York date +%F)" ]
check "second run same ET day is skipped"         [ "$(run ai-picks)" = 0 ]
check "... with no extra request"                 [ "$(count /api/cron/ai-picks)" = 1 ]
check "--force runs it again"                     [ "$(run ai-picks --force)" = 0 ]
check "... one more request"                      [ "$(count /api/cron/ai-picks)" = 2 ]

reset '{"/api/cron/openrouter-budget": {"status":503,"body":{"success":false,"allowed":false,"error":"OPENROUTER_MONTHLY_BUDGET_USD is not configured"}}, "/api/cron/daily-ai-picks": {"status":200,"body":{"success":true}}}'
touch "$T/paid.enabled"
check "budget unconfirmable: exits 1"             [ "$(run daily-report)" = 1 ]
check "... the paid route is never called"        [ "$(count /api/cron/daily-ai-picks)" = 0 ]
check "... and it is alerted"                     [ "$(alerts)" = 1 ]

reset '{"/api/cron/openrouter-budget": {"status":200,"body":{"success":true,"allowed":false,"pct":100.4,"usedMonthUsd":20.08,"budgetUsd":20}}, "/api/cron/daily-ai-picks": {"status":200,"body":{"success":true}}}'
touch "$T/paid.enabled"
check "budget exhausted: exits 1, route not called" bash -c "[ \"\$(bash '$JOBSH' daily-report >/dev/null 2>&1; echo \$?)\" = 1 ] && [ \"\$(grep -c daily-ai-picks '$T/req.jsonl')\" = 0 ]"

reset '{"/api/cron/openrouter-budget": {"status":200,"body":{"success":true,"allowed":"yes","pct":1}}, "/api/cron/daily-ai-picks": {"status":200,"body":{"success":true}}}'
touch "$T/paid.enabled"
check "malformed budget answer fails closed"      [ "$(run daily-report)" = 1 ]
check "... route not called"                      [ "$(count /api/cron/daily-ai-picks)" = 0 ]

reset '{"/api/cron/openrouter-budget": {"status":200,"body":{"success":true,"allowed":true,"pct":85,"usedMonthUsd":17,"budgetUsd":20}}, "/api/cron/daily-ai-picks": {"status":200,"body":{"success":true}}, "/api/cron/ai-picks": {"status":200,"body":{"success":true}}}'
touch "$T/paid.enabled"
run daily-report > /dev/null
check "85% spend: one 80% alert"                  [ "$(alerts)" = 1 ]
run ai-picks > /dev/null
check "... not repeated the same month"           [ "$(alerts)" = 1 ]
check "... jobs still run under the cap"          [ "$(count /api/cron/ai-picks)" = 1 ]

reset "{$BUDGET_OK, \"/api/cron/ai-picks\": {\"status\":200,\"body\":{\"success\":true,\"skipped\":true,\"message\":\"Skipped: no expert picks\"}}}"
touch "$T/paid.enabled"
check "skipped run (no paid call) exits 0"        [ "$(run ai-picks)" = 0 ]
check "... is not stamped as today's success"     [ ! -f "$T/state/ai-picks.last-success" ]

reset "{\"/api/cron/generate-blog-recap\": {\"status\":404,\"body\":{\"success\":false,\"error\":\"No consensus picks available yet\"}}}"
check "blog-recap with no picks yet is not an error" [ "$(run blog-recap)" = 0 ]
check "... and not stamped (can run again today)" [ ! -f "$T/state/blog-recap.last-success" ]

echo "== blog-recap is a free job (data template, no model)"
reset '{"/api/cron/generate-blog-recap": {"status":200,"body":{"success":true,"slug":"x"}}}'
check "blog-recap runs without the paid flag"      [ "$(run blog-recap)" = 0 ]
check "... route called once"                      [ "$(count /api/cron/generate-blog-recap)" = 1 ]
check "... no OpenRouter budget check"             [ "$(count /api/cron/openrouter-budget)" = 0 ]

echo "== config errors"
reset '{"/api/cron/grade-picks": {"status":200,"body":{"success":true}}}'
DAILYAI_ENV_FILE="$T/missing.env" bash "$JOBSH" grade-picks > /dev/null 2>&1; rc=$?
check "missing CRON_SECRET: exit 1"              [ "$rc" = 1 ]
check "... and the app is never called"           [ "$(count /api/cron/grade-picks)" = 0 ]
printf 'CRON_SECRET=bad"secret\n' > "$T/bad.env"
DAILYAI_ENV_FILE="$T/bad.env" bash "$JOBSH" grade-picks > /dev/null 2>&1; rc=$?
check "secret with a quote is refused (no curl-config injection)" [ "$rc" = 1 ]
check "unknown job rejected (64)"                 [ "$(run nope)" = 64 ]
check "unknown option rejected (64)"              [ "$(run grade-picks --now)" = 64 ]
DAILYAI_ALERT_ENV="$T/none.env" bash "$JOBSH" grade-picks > /dev/null 2>&1
reset '{"/api/cron/grade-picks": {"status":500,"body":{}}}'
DAILYAI_ALERT_ENV="$T/none.env" bash "$JOBSH" grade-picks > /dev/null 2>&1; rc=$?
check "no alert channel: still fails + logs, no crash" bash -c "[ $rc = 1 ] && grep -q 'alert channel not configured' '$T/log/grade-picks.log'"

echo "== schedules (America/New_York, across DST)"
next_utc() { # $1 OnCalendar, $2 base time (UTC) -> next elapse in UTC
  systemd-analyze calendar --base-time="$2" "$1" 2>/dev/null | sed -n 's/.*(in UTC): //p' | head -1
}
for spec in "grade-picks|03:15:00|08:15|07:15" "ai-picks|10:00:00|15:00|14:00" "daily-report|10:20:00|15:20|14:20" "blog-recap|10:40:00|15:40|14:40"; do
  IFS='|' read -r job t winter summer <<< "$spec"
  oncal="$(sed -n 's/^OnCalendar=//p' "$SRC/dailyai-$job.timer")"
  check "$job timer is '*-*-* $t America/New_York'" [ "$oncal" = "*-*-* $t America/New_York" ]
  w="$(next_utc "$oncal" '2027-01-10 00:00:00 UTC')"
  s="$(next_utc "$oncal" '2027-07-10 00:00:00 UTC')"
  check "$job winter (EST) fires $winter UTC [$w]" bash -c "[[ '$w' == *' $winter:00 UTC' ]]"
  check "$job summer (EDT) fires $summer UTC [$s]" bash -c "[[ '$s' == *' $summer:00 UTC' ]]"
done
d1="$(next_utc '*-*-* 03:15:00 America/New_York' '2027-03-14 05:00:00 UTC')"
check "grading still runs on spring-forward day 2027-03-14 [$d1]" bash -c "[[ '$d1' == 'Sun 2027-03-14 07:15:00 UTC' ]]"
d2="$(next_utc '*-*-* 03:15:00 America/New_York' '2027-11-07 04:00:00 UTC')"
check "grading runs once on fall-back day 2027-11-07 [$d2]" bash -c "[[ '$d2' == 'Sun 2027-11-07 08:15:00 UTC' ]]"

echo "== unit files (systemd-analyze verify)"
mkdir -p "$T/units"
sed "s#/usr/local/lib/dailyai-cron/dailyai-job.sh#$JOBSH#" "$SRC/dailyai-cron@.service" > "$T/units/dailyai-cron@.service"; chmod 644 "$T/units/dailyai-cron@.service"
for f in "$SRC"/dailyai-*.timer; do install -m 644 "$f" "$T/units/"; done
out="$(cd "$T/units" && SYSTEMD_UNIT_PATH="$T/units:" systemd-analyze verify --man=no ./*.timer 'dailyai-cron@grade-picks.service' 2>&1)"
check "systemd-analyze verify: no errors [${out:-clean}]" [ -z "$out" ]

echo "== install / uninstall (scratch root, fake systemctl)"
R="$T/root"; mkdir -p "$R"
printf '#!/bin/sh\necho "$*" >> %s\n' "$T/systemctl.log" > "$T/systemctl"; chmod +x "$T/systemctl"
DAILYAI_ROOT="$R" SYSTEMCTL="$T/systemctl" bash "$SRC/install.sh" grade-picks > /dev/null
check "runner installed 0755"                     [ "$(stat -c %a "$R/usr/local/lib/dailyai-cron/dailyai-job.sh")" = 755 ]
check "service + 4 timers installed"              [ "$(ls "$R/etc/systemd/system" | wc -l)" = 5 ]
check "only grade-picks enabled"                  bash -c "[ \"\$(grep -c 'enable --now' '$T/systemctl.log')\" = 1 ] && grep -q 'enable --now dailyai-grade-picks.timer' '$T/systemctl.log'"
check "paid flag NOT created by install"          [ ! -e "$R/etc/dailyai-cron/paid-jobs.enabled" ]
check "install rejects an unknown job"            bash -c "! DAILYAI_ROOT='$R' SYSTEMCTL='$T/systemctl' bash '$SRC/install.sh' grade-picks bogus >/dev/null 2>&1"
mkdir -p "$R/var/log/dailyai-cron" && echo keep > "$R/var/log/dailyai-cron/grade-picks.log"
touch "$R/etc/dailyai-cron/paid-jobs.enabled"
: > "$T/systemctl.log"
DAILYAI_ROOT="$R" SYSTEMCTL="$T/systemctl" bash "$SRC/uninstall.sh" > /dev/null
check "uninstall disables all 4 timers"           [ "$(grep -c 'disable --now dailyai-' "$T/systemctl.log")" = 4 ]
check "uninstall removes units + runner + flag"   bash -c "[ -z \"\$(ls -A '$R/etc/systemd/system')\" ] && [ ! -e '$R/usr/local/lib/dailyai-cron' ] && [ ! -e '$R/etc/dailyai-cron' ]"
check "uninstall keeps logs by default"           [ -f "$R/var/log/dailyai-cron/grade-picks.log" ]
DAILYAI_ROOT="$R" SYSTEMCTL="$T/systemctl" bash "$SRC/uninstall.sh" --purge > /dev/null
check "--purge removes logs"                      [ ! -e "$R/var/log/dailyai-cron" ]
check "uninstall is re-runnable (idempotent)"     bash -c "DAILYAI_ROOT='$R' SYSTEMCTL='$T/systemctl' bash '$SRC/uninstall.sh' >/dev/null"

echo
echo "scheduler validation: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
