# DAI-18: support@dailyaibetting.com (prepared 2026-11-22, NOT applied)

## Current DNS (Cloudflare zone, read 2026-11-22, unchanged)
| Type | Name | Value | Used by |
|---|---|---|---|
| A (proxied) | dailyaibetting.com, www | 87.99.132.176 | site |
| MX | send.dailyaibetting.com | feedback-smtp.us-east-1.amazonses.com | Resend bounces (subdomain) |
| TXT | send.dailyaibetting.com | v=spf1 include:amazonses.com ~all | Resend SPF (subdomain) |
| TXT | resend._domainkey | DKIM key | Resend DKIM |
| TXT | dailyaibetting.com | google-site-verification=… | Search Console |

No MX and no SPF on the apex, so mail to support@ bounces today. No DMARC record.

## What Email Routing adds (apex only)
- MX `route1/2/3.mx.cloudflare.net` on `dailyaibetting.com`.
- TXT `v=spf1 include:_spf.mx.cloudflare.net ~all` on `dailyaibetting.com`.
- A rule: `support@dailyaibetting.com` → the destination inbox (destination must click Cloudflare's verification email once).

No conflict: Resend lives on `send.` and its DKIM selector, which are left as they are. Sign-in and receipt emails keep working.

## Blockers
1. **Owner:** confirm the destination inbox.
2. **Token:** `CF_DNS_TOKEN` / `CF_API_TOKEN` return "Authentication error" on the Email Routing API. Either the owner enables routing in the dashboard (Email → Email Routing → Get started, add the rule), or creates a token with *Zone: Email Routing Rules Edit*, *Zone: DNS Edit* and *Account: Email Routing Addresses Edit* for this zone only.

## Verification after setup
1. `dig MX dailyaibetting.com @1.1.1.1` shows the three Cloudflare MX hosts; `send.` MX unchanged.
2. Send a test from a different address to support@ → arrives in the destination inbox (record time + headers, no content).
3. A sign-in email still arrives from the site (Resend unaffected).
4. **Replies:** Email Routing is inbound only. Replying from Gmail shows the Gmail address unless Gmail "Send mail as" is set for support@ using Resend SMTP (`smtp.resend.com:465`, user `resend`, password = a Resend API key restricted to sending). Test: reply to the test message, check the received From is support@ and it passes DKIM.
