# Production environment checklist (DailyAI launch)

Set in the production host: Hetzner `/root/apps/dailyaibetting/.env.local`, read by pm2 `dailyaibetting` (`pm2 restart dailyaibetting --update-env`, then `pm2 save`). No Vercel project exists. Server-only = never prefix with `NEXT_PUBLIC_`.
Values are never stored in git. Tick each box after verifying in the dashboard, not from memory.

## Must be set before launch

| Variable | Scope | Value / rule | How to verify |
|---|---|---|---|
| `ADMIN_EMAILS` | server | Comma-separated admin emails (case-insensitive). | Sign in as admin → `/admin/grading` loads; any other account → 404. |
| `ADMIN_USER_IDS` | server | Comma-separated Supabase `auth.users.id` UUIDs of the same admins. **Required**: empty = nobody is admin. | Supabase → Authentication → Users → copy the user's UID. |
| `STRIPE_SECRET_KEY` | server | **Live** secret key (`sk_live_…`) of the DailyAI Stripe account. Prefer a restricted key: Checkout Sessions write, Customers write, Subscriptions read/write, Billing Portal write, Prices read. | Stripe → Developers → API keys. |
| `STRIPE_WEBHOOK_SECRET` | server | Signing secret (`whsec_…`) of the **live** endpoint `https://dailyaibetting.com/api/webhooks/stripe`. | Stripe → Webhooks → endpoint → Reveal signing secret. |
| `STRIPE_PRICE_ID` | server | Live recurring prices: Founding **$9.99/mo** (first 100 paying members), regular **$19.99/mo**; earlier $20 members are grandfathered (keep the $20 price id in `STRIPE_ALLOWED_PRICE_IDS`). 7-day trial for eligible first-time customers. | Stripe → Products → Pro → price ID; confirm amount + interval. |
| `STRIPE_ALLOWED_PRICE_IDS` | server | Comma-separated **older** DailyAI price IDs that existing subscribers are still on (may be empty). Webhooks for any price not in `STRIPE_PRICE_ID` + this list are ignored, and checkout's trial / already-subscribed checks only count these prices. **Whenever the price changes, add the old ID here first** (otherwise old subscribers lose Pro on their next webhook and could get a second trial). | Stripe → Subscriptions → filter active → list distinct price IDs. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | DailyAI Supabase URL (shared project A). | Unchanged from today. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon key. | Unchanged. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Service-role key. | Unchanged; never `NEXT_PUBLIC_`. |
| `CRON_SECRET` | server | Long random string; same value in the Hetzner scheduler (`/usr/local/lib/dailyai-cron`) **and** the `grade-and-persist` `.env.local`. Blank = every cron route returns 500 (fail closed). | `GET /api/cron/grade-picks` without the header → 401. |
| `NEXT_PUBLIC_SITE_URL` | public | Optional. `https://dailyaibetting.com` (checkout success/cancel + billing-portal return links); unset falls back to the same value. | |
| `NEXT_PUBLIC_BASE_URL` | public | **Leave UNSET in production.** When unset, server-side self-fetches go over loopback to `http://127.0.0.1:$PORT` (PM2 sets `PORT=3103`). Setting it sends every page render out through Cloudflare and back (slow, rate-limit coupling), and as a `NEXT_PUBLIC_` value it is baked in at build time. | `grep NEXT_PUBLIC_BASE_URL .env.local` → nothing. |

## Remove / retire

| Variable | Action |
|---|---|
| `NEXT_PUBLIC_ADMIN_PASSWORD` | **Delete** from every environment (it shipped in the browser bundle). Rotate anywhere the same password was reused. |

## Supabase Auth settings (dashboard, project A)

- [ ] **Confirm email = ON** (admin check requires `email_confirmed_at`).
- [ ] Site URL `https://dailyaibetting.com`; redirect allow-list contains `https://dailyaibetting.com/auth/callback`.

## Stripe dashboard (live)

- [ ] Webhook endpoint events (the handler acts on exactly these; payment failure arrives as `customer.subscription.updated` → `past_due`): `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- [ ] Customer portal enabled (cancel + update payment method).
- [ ] Only ONE live endpoint points at `/api/webhooks/stripe`.

## Optional

| Variable | Default | Note |
|---|---|---|
| `GUEST_CHECKOUT_ENABLED` / `NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED` | off | Production: **false** (11-22). Set both to `true` only together. |
| `DAI_AUTO_CANCEL_DUPLICATE_TRIAL` | off | Production: unset (off). The Terms do not promise automatic cancellation. |
| `POLICY_PAGES_PUBLISHED`, `POLICY_LEGAL_NAME`, `POLICY_GOVERNING_STATE`, `POLICY_OPERATOR_TYPE` | unset | Set at legal publication: `true`, `Matthew Morales`, `Florida`, `individual`. |
| `RESEND_API_KEY`, `EMAIL_FROM` | — | **Required** since DAI-26 (sign-in, receipts, welcome email). Key is send-only. DNS: DMARC still missing. |
| `ANTHROPIC_API_KEY` | — | **UNSET in production (2026-11-24): AI report/picks paused, activation deferred post-launch.** AI picks / report generation (replaces OpenRouter). Dedicated DailyAI key from a Console org funded only by the Max plan's included API credit: no payment method, auto-reload off. Unset = no paid calls. |
| `AI_MONTHLY_BUDGET_USD` | — (unset = no paid calls) | App-side cap, 0 < cap <= 100. Plan: 15. |
| `AI_SPEND_LEDGER_PATH` | — (unset = no paid calls) | e.g. `/var/lib/dailyai/ai-spend.json`, outside the app dir, writable by the pm2 user (root), single app instance. Create once: `{"month":"YYYY-MM","spentUsd":0,"calls":0}`. A missing file refuses paid calls. |
| `OPENROUTER_API_KEY`, `OPENROUTER_MONTHLY_BUDGET_USD` | — | Retired 2026-11-24: no code reads them. Safe to remove from `.env.local` now (owner deletes the key in the OpenRouter dashboard). |
| `NEXT_PUBLIC_GA_ID` | — | Analytics. |
| `AI_PICKS_DISCORD_WEBHOOK`, `DISCORD_CONSENSUS_WEBHOOK_URL`, `N8N_*_WEBHOOK`, `GOOGLE_SHEET_WEBHOOK`, `BLOG_API_KEY` | — | n8n/Sheet webhooks are no longer called (DAI-26); the n8n blog workflow was removed; the blog recap is a $0 data template. |
| `LOG_LEVEL` | info | |
