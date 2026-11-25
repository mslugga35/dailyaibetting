# DAI-18: support@ and advertise@dailyaibetting.com → owner Gmail (2026-11-24: DNS done, routing rules NOT active)

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

## Status 2026-11-24 (verified, not assumed)
| Check | Result |
|---|---|
| Apex MX = route1/2/3.mx.cloudflare.net | PASS |
| Apex SPF `v=spf1 include:_spf.mx.cloudflare.net ~all` | PASS |
| Cloudflare DKIM `cf2024-1._domainkey` | PASS |
| Resend intact: `resend._domainkey`, `send.` MX + SPF; send-only key (read calls return `restricted_api_key`) | PASS |
| DMARC `_dmarc.dailyaibetting.com` | **MISSING** |
| Inbound: SMTP RCPT to route1.mx.cloudflare.net for support@ and advertise@ | **FAIL: `550 5.1.1 Address does not exist`** (same answer as a made-up address = no active rule) |
| Inbound: test emails sent 15:43Z via Resend to support@ and advertise@ | **not delivered** (no Gmail match, spam/trash included) |
| No Cloudflare verification email in Gmail in the last 7 days | destination may never have been added/verified |
| Replies as support@ | **owner setup** (Gmail "Send mail as" via Resend SMTP, below) |

### Owner steps (about 5 minutes)
1. dash.cloudflare.com → dailyaibetting.com → **Email → Email Routing → Destination addresses**: mpm.morales@gmail.com must say **Verified**. If not: Add / Resend verification → open the Cloudflare email in Gmail → **Verify email address**.
2. **Routing rules → Custom addresses → Create address**: `support` → *Send to an email* → mpm.morales@gmail.com → Save. Repeat for `advertise`. Both rules must show **Active**. Catch-all stays disabled.
3. **DNS → Records → Add record**: Type `TXT`, Name `_dmarc`, Content `v=DMARC1; p=none; rua=mailto:support@dailyaibetting.com` → Save. (`p=none` only monitors; nothing is rejected.)
4. Replies as support@ (optional for launch, recommended): resend.com → API Keys → Create → permission *Sending access*, domain *dailyaibetting.com*. Gmail → Settings → Accounts and Import → **Send mail as → Add another email address**: name `DailyAI Betting Support`, email `support@dailyaibetting.com`, untick *Treat as an alias* → SMTP server `smtp.resend.com`, port `465`, username `resend`, password = that key, SSL → Gmail sends a confirmation code to support@ (arrives in Gmail once step 2 works) → enter it. Reply from support@ by choosing it in the From field.
5. Tell Claude "email done": Claude re-runs the RCPT probe, sends a test to each address and confirms arrival + headers in Gmail, then marks DAI-18 verified.

## Status 2026-11-24 evening: VERIFIED (DAI-18 closed)
- Destination mpm.morales@gmail.com verified. Rules `support@` and `advertise@` → that destination, both **Active**.
- DMARC TXT `_dmarc` = `v=DMARC1; p=none;` (TTL Auto) added; public DNS returns it. Resend DKIM (`resend._domainkey`), `send.` SPF/MX, website records: unchanged.
- RCPT probe (route2.mx.cloudflare.net): support@ 250, advertise@ 250, unknown address 550.
- Real external delivery (Cloudflare activity log, Result **Forwarded**): Yahoo → support@ (also confirmed in the Gmail inbox, 21:45 ET); Gmail → advertise@.
- Unauthenticated test mail from a host without SPF/DKIM is rejected (550 5.7.26): expected, not a defect.
- **Outstanding (deferred post-launch): Gmail "Send mail as" support@.** Needs a domain-restricted Resend sending key from the Resend account that owns dailyaibetting.com. That account was not located: the Google and GitHub logins hold only larshomes.net, debtfreelifestylehub@ holds none. Every Resend email goes to the no-dot spelling `mpmmorales@gmail.com`, so try an email (not Google) login with that address. Until then, replies sent from Gmail show the personal address; reply from Gmail only with that understood.
