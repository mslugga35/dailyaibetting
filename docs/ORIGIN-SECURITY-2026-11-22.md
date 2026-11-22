# DAI-19: direct-origin access past Cloudflare (investigated 2026-11-22, read-only, NOT applied)

Severity: Low-Medium hardening item. Not shown to be exploitable.

## Findings
| # | Claim | Status | Evidence |
|---|---|---|---|
| 1 | Origin 87.99.132.176:443 serves dailyaibetting.com directly from the internet | VERIFIED | `curl --resolve dailyaibetting.com:443:87.99.132.176` from PC1: 200, `Via: 1.1 Caddy`, no CF headers, valid Let's Encrypt cert |
| 2 | Client IP can be spoofed via direct access | **NO** (source + code, not live-tested) | Caddy 2.11.2 `addForwardedHeaders`: an untrusted peer gets `X-Forwarded-For` **overwritten** with its real IP (no `trusted_proxies` set). `getClientIp` trusts `cf-connecting-ip` only if that peer is a Cloudflare range. So per-IP limits (founding holds, rate limits) use the real IP |
| 3 | What direct clients skip | VERIFIED (by design) | CF WAF/custom rules, Bot Fight, CF DDoS absorption, caching. Zone rule settings not readable with current token: UNVERIFIED |
| 4 | Hetzner Cloud firewall | UNVERIFIED | Not visible from the host; owner checks Hetzner Console → Firewalls for server mpmmo-prod (124897338) |
| 5 | IPv6 origin path | UNVERIFIED | Server has 2a01:4ff:f0:7006::1, ufw allows 443 v6, no AAAA record published |
| 6 | Other ports | ufw allows only 22/80/443/3001; app ports (3103 etc.) dropped | ufw + ss |

## Shared 80/443 inventory (Caddy)
| Domain | Port | Cloudflare proxied | Impact of a box-wide CF-only firewall |
|---|---|---|---|
| dailyaibetting.com | 3103 | Yes | fine |
| rvdumpstations.cc | 3102 | Yes | fine |
| pickleballcourts.cc | 3104 | Yes | fine |
| peptide-facts.com | 3109 | **No (DNS-only to origin)** | **goes down** |
| realjemileweeks.com | 3001 | Not pointing at origin | Caddy block unused |

Box-wide ufw / Hetzner restriction is therefore **not** safe.

## Recommended fix (DailyAI only): Caddy per-site Cloudflare check
Needs owner approval (shared Caddyfile).
1. `cp -a /etc/caddy/Caddyfile /etc/caddy/Caddyfile.pre-cf-$(date +%F)`
2. `/etc/caddy/cf-ranges.caddy`:
   ```
   (cf_only) {
   	@notcf not remote_ip 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22 2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32 2405:8100::/32 2a06:98c0::/29 2c0f:f248::/32
   	abort @notcf
   }
   ```
   Re-check the v6 list against cloudflare.com/ips-v6 before applying.
3. Caddyfile: `import /etc/caddy/cf-ranges.caddy` at top; inside only the dailyaibetting block add `import cf_only` before `reverse_proxy localhost:3103`. Do **not** set `trusted_proxies`.
4. `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`, then `systemctl reload caddy` (graceful; keeps old config on failure).
5. Verify: site 200 with `Server: cloudflare`; direct `--resolve` request is aborted; peptide-facts, pickleballcourts, rvdumpstations still 200; no caddy errors in journal. ACME HTTP-01 already arrives via CF IPs and Caddy's challenge handler runs before routes, so renewals are unaffected.
6. Monthly: refresh ranges file → validate → reload only if changed.
7. **Rollback (~10 s):** `cp -a /etc/caddy/Caddyfile.pre-cf-<date> /etc/caddy/Caddyfile && caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && systemctl reload caddy`.

Later options: Authenticated Origin Pulls with a per-zone cert (needs CF token rights), or a Cloudflare Tunnel for this host.
