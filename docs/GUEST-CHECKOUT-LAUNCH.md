# Guest Checkout — Launch Checklist (DailyAI + HiddenBag)

Frictionless "pay first, account created after, magic-link to access" flow.
Code is built and merged behind a **feature flag** (`GUEST_CHECKOUT_ENABLED`). It does
NOT change anything in production until the flag is turned on AND the email domain is verified.

Status as of 2026-05-29: **code built (DailyAI), gated OFF. Public launch blocked on email domain.**

---

## 🚦 BLOCKER — must be done before turning the flag on (real customers)

Magic-link emails must reach arbitrary buyers. Today neither site can do that:

| Domain | DNS host | What to do |
|--------|----------|------------|
| dailyaibetting.com | **Cloudflare** (`burt/itzel.ns.cloudflare.com`) — NOTE: a different CF account than the `CF_API_TOKEN` in `~/.openclaw/.env` | Add Resend's DKIM/SPF/DMARC records in the correct Cloudflare account |
| thehiddenbag.com | **Namecheap** (`dns1/dns2.registrar-servers.com`) | Add Resend's DKIM/SPF/DMARC records in Namecheap (or move DNS to Cloudflare) |

### Steps
1. **Resend → API Keys:** the key currently in `.env.local` is **send-only** (`restricted_api_key`) and CANNOT create/verify domains. Create a **full-access** key (or just do domain setup in the dashboard).
2. **Resend → Domains → Add Domain** for `dailyaibetting.com` (and `thehiddenbag.com`). Resend shows the exact DNS records (MX/TXT for DKIM, SPF, optional DMARC).
3. **Add those DNS records** at the host above. Wait for Resend to show "Verified".
4. **Set `EMAIL_FROM`** to a real address on the verified domain, e.g. `picks@dailyaibetting.com` (NOT the current `onboarding@resend.dev` sandbox — that only delivers to your own Resend account email).
5. **Update envs** (`.env.local` + Vercel/Hetzner): real `EMAIL_FROM`, full Resend key if rotated.
6. **Send 5 test emails** to a real external inbox; confirm not in spam (DKIM/SPF pass).

> Until step 4 is done, magic links only deliver to YOUR OWN inbox (sandbox). That's enough for
> end-to-end TESTING, but NOT for paying customers.

---

## ✅ Turn it on (after domain verified)
- Set BOTH flags in env (DailyAI: Hetzner; HiddenBag: Vercel):
  - `GUEST_CHECKOUT_ENABLED=true` — server-side gate (checkout route + webhook)
  - `NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED=true` — client-side gate (shows the email field on /pro)
- Redeploy.
- Do one real $0/test-price guest checkout end-to-end; confirm: payment → webhook → account created → access granted → magic-link email received → click → signed in.

## Stripe dashboard (separate, also needed to get paid — see prior notes)
- Enable Apple Pay / Google Pay / Link under Settings → Payment methods.
- Confirm the webhook endpoint shows green deliveries.

---

## What the code does (already built)
- `GET/POST /api/checkout` accepts `guestEmail` when no auth session (flag-gated). Dedupes the
  Stripe customer by email. Creates the subscription Checkout session with `customer_email`.
- `POST /api/webhooks/stripe` → on `checkout.session.completed` with no `user_id`: find-or-create
  the Supabase auth user by email, grant the subscription, then mint a Supabase magic link and
  send it via Resend.
- `/pro` shows a guest email field + "Start Free — pay now, no signup" when flag on & logged out.
- After guest checkout, user lands on a "Check your email" screen.

## HiddenBag deltas (when ported)
- Same server logic. HiddenBag is email+password today → add magic-link login (keep password as
  fallback so existing users aren't locked out). HiddenBag has NO Resend key yet — add the same
  full-access key to its env.

## Open product decisions (defaults chosen, change if desired)
- Guest accounts = full subscribers immediately (payment = verification). No "soft pause".
- 1 active subscription per email; magic link TTL = Supabase default (~1h), resend allowed.
