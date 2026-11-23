# DAI-18: support@dailyaibetting.com (prepared 2026-11-22; destination APPROVED 2026-11-23; NOT applied yet)

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
- TXT DKIM `cf2024-1._domainkey.dailyaibetting.com` (Cloudflare signs what it forwards).
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

## Status 2026-11-23
- Destination approved by owner: Matt's personal Gmail (address in the owner's message, not repeated here).
- DNS re-read 2026-11-23: unchanged (only MX is `send.` for Resend; no apex MX/SPF/DMARC).
- Every Cloudflare token Claude is allowed to use returns `Authentication error` (10000) on `zones/{zone}/email/routing` and `/rules`. Probing the other tokens on the PC for extra rights was refused by the permission system, and no Cloudflare dashboard session is reachable from PC1 (the connected browser is not on this PC, by title-marker probe). So the owner does steps 1–4 below (about 3 minutes); Claude does 5–8.

## Runbook
1. **(Owner, dashboard)** dash.cloudflare.com → dailyaibetting.com → **Email → Email Routing → Get started / Enable**. Cloudflare lists the records it will add (3 MX, 1 SPF TXT, 1 DKIM TXT, all on the apex). Check none touch `send.` or `resend._domainkey`, then **Add records and enable**.
2. **(Owner)** **Destination addresses → Add** the approved Gmail address. Cloudflare emails it a verification link: open that email (subject like "[Cloudflare] Verify email address") and press **Verify email address**. It must show *Verified*.
3. **(Owner)** **Routing rules → Create address**: custom address `support`, action *Send to an email*, destination the verified Gmail → Save. Leave catch-all **disabled**.
4. **(Owner)** Tell Claude "routing on".
5. **(Claude) DNS check:** zone MX now 3 Cloudflare hosts on the apex + unchanged `send.` MX; `resend._domainkey` unchanged; public `dig MX dailyaibetting.com @1.1.1.1` and `@8.8.8.8` agree.
6. **(Claude) Inbound:** `node qa/launch-verify/support-mail-test.mjs send` (sender is a MailSlurp inbox, not Gmail) → find the token in Gmail (read-only search) → record arrival time and the `ARC/Authentication-Results` pass lines (no message content).
7. **(Claude) Resend unaffected:** a sign-in email from the site still arrives (Muse or Matt's next sign-in), and Resend dashboard shows delivered.
8. **(Replies)** Reply to the test from Gmail, then `node qa/launch-verify/support-mail-test.mjs wait <inboxId>`. It prints the From/Reply-To the customer would see.

## Does replying expose the Gmail address?
**Yes, by default.** Email Routing only forwards inbound mail. A reply written in Gmail is sent from the Gmail address, so the customer sees it. To reply as support@ instead (owner, Gmail settings, one time):
- Gmail → Settings → **Accounts and Import → Send mail as → Add another email address**: name "DailyAI Betting Support", address `support@dailyaibetting.com`, untick "Treat as an alias".
- SMTP server `smtp.resend.com`, port `465` (SSL), username `resend`, password = a **new Resend API key with "Sending access" only, limited to dailyaibetting.com** (create it in Resend → API Keys; do not reuse the server key). Gmail sends a confirmation code to support@, which Email Routing forwards back to the same Gmail: enter it.
- Settings → Accounts → "When replying to a message: **Reply from the same address the message was sent to**".
- Then repeat step 8: the reply must show `From: support@dailyaibetting.com` and no Gmail address (the tool prints EXPOSED or OK).
The site's own sender is already on `dailyaibetting.com` in Resend, so this needs no DNS change.
