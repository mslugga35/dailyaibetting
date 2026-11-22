#!/usr/bin/env bash
# Read-only production check for the billing hardening deploy. Usage: billing-prod-check.sh <expected-sha-prefix> <label>
# No payments, no sessions created, no subscription changes. Signed-out API calls only.
set -u
SHA="${1:?sha}"; LABEL="${2:?label}"; BASE=https://dailyaibetting.com; pass=0; fail=0
ok(){ echo "PASS $*"; pass=$((pass+1)); }; bad(){ echo "FAIL $*"; fail=$((fail+1)); }
echo "== $LABEL $(date -u +%FT%TZ)"
ci=$(curl -s -m 15 "$BASE/.well-known/commit-info.json?nc=$RANDOM")
echo "$ci" | grep -q "\"$SHA" && ok "commit-info shows $SHA" || bad "commit-info: $(echo "$ci" | head -c 120)"
for p in / /pricing /results /stats /history /props /login; do
  c=$(curl -s -o /dev/null -m 20 -w '%{http_code}' "$BASE$p?nc=$RANDOM"); [ "$c" = 200 ] && ok "GET $p 200" || bad "GET $p $c"
done
c=$(curl -s -o /tmp/co.json -m 20 -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' "$BASE/api/checkout")
c2=$(curl -s -o /dev/null -m 20 -w '%{http_code} %{redirect_url}' "$BASE/account?nc=$RANDOM"); echo "$c2" | grep -q "^307 .*/login?redirect=/account" && ok "GET /account signed-out -> login" || bad "GET /account $c2"
[ "$c" = 401 ] && grep -q '"signIn":true' /tmp/co.json && ok "signed-out checkout refused 401 signIn" || bad "signed-out checkout $c $(head -c 120 /tmp/co.json)"
c=$(curl -s -o /dev/null -m 20 -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{"plan":"regular"}' "$BASE/api/checkout")
[ "$c" = 401 ] && ok "signed-out regular-plan checkout refused 401" || bad "signed-out regular checkout $c"
c=$(curl -s -o /dev/null -m 20 -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' "$BASE/api/webhooks/stripe")
[ "$c" = 400 ] && ok "unsigned webhook rejected 400" || bad "unsigned webhook $c"
ssh -o ConnectTimeout=10 root@87.99.132.176 'cd /root/apps/dailyaibetting
  git rev-parse --short=7 HEAD
  pm2 jlist | python3 -c "import sys,json;p=[x for x in json.load(sys.stdin) if x[\"name\"]==\"dailyaibetting\"][0];e=p[\"pm2_env\"];print(\"PM2\",e[\"status\"],\"restarts\",e[\"restart_time\"],\"uptime_s\",int((__import__(\"time\").time()*1000-e[\"pm_uptime\"])/1000))"
  grep -E "^(GUEST_CHECKOUT_ENABLED|DAI_TRIAL_REUSE_COMMENT_CUTOFF|DAI_AUTO_CANCEL_DUPLICATE_TRIAL)=" .env.local
  echo "BRANDING_IN_BUILD $(grep -rl --include=*.js "branding_settings" .next/server 2>/dev/null | wc -l)"
  echo "CUTOFF_WARN $(pm2 logs dailyaibetting --lines 300 --nostream 2>&1 | grep -c DAI_TRIAL_REUSE_COMMENT_CUTOFF)"
  up=$(pm2 jlist | python3 -c "import sys,json;print([x for x in json.load(sys.stdin) if x[\"name\"]==\"dailyaibetting\"][0][\"pm2_env\"][\"pm_uptime\"]//1000)"); m=$(stat -c %Y ~/.pm2/logs/dailyaibetting-error.log); echo "ERRLOG_SINCE_START $([ $m -gt $up ] && echo written || echo none)"' > /tmp/srv.txt 2>&1
cat /tmp/srv.txt
grep -q "^${SHA:0:7}" /tmp/srv.txt && ok "server HEAD $SHA" || bad "server HEAD"
grep -q "^PM2 online" /tmp/srv.txt && ok "pm2 online" || bad "pm2 not online"
grep -q "^GUEST_CHECKOUT_ENABLED=false" /tmp/srv.txt && ok "guest flag false" || bad "guest flag"
grep -q "^DAI_TRIAL_REUSE_COMMENT_CUTOFF=2026-11-22T22:45:00Z" /tmp/srv.txt && ok "cutoff set" || bad "cutoff"
grep -q "^DAI_AUTO_CANCEL_DUPLICATE_TRIAL=" /tmp/srv.txt && bad "auto-cancel flag present" || ok "auto-cancel unset (off)"
grep -q "^BRANDING_IN_BUILD [1-9]" /tmp/srv.txt && ok "branding in built checkout route" || bad "branding not found in build"
grep -q "^ERRLOG_SINCE_START none" /tmp/srv.txt && ok "no error-log writes since process start" || bad "error log written since start (inspect)"
echo "== $LABEL: $pass pass / $fail fail"
