# Production environment checklist (DailyAI launch)

Set in the production host (Vercel project env, Production scope). Server-only = never prefix with `NEXT_PUBLIC_`.
Values are never stored in git. Tick each box after verifying in the dashboard, not from memory.

## Must be set before launch

| Variable | Scope | Value / rule | How to verify |
|---|---|---|---|
| `ADMIN_EMAILS` | server | Comma-separated admin emails (case-insensitive). | Sign in as admin → `/admin/grading` loads; any other account → 404. |
| `ADMIN_USER_IDS` | server | Comma-separated Supabase `auth.users.id` UUIDs of the same admins. **Required**: empty = nobody is admin. | Supabase → Authentication → Users → copy the user's UID. |
| `STRIPE_SECRET_KEY` | server | **Live** secret key (`sk_live_…`) of the DailyAI Stripe account. Prefer a restricted key: Checkout Sessions write, Customers write, Subscriptions read/write, Billing Portal write, Prices read. | Stripe → Developers → API keys. |
| `STRIPE_WEBHOOK_SECRET` | server | Signing secret (`whsec_…`) of the **live** endpoint `https://dailyaibetting.com/api/webhooks/stripe`. | Stripe → Webhooks → endpoint → Reveal signing secret. |
| `STRIPE_PRICE_ID` | server | Live recurring price for Pro. Must be **$20.00 USD / month** to match `PRO_PRICE_DISPLAY`. | Stripe → Products → Pro → price ID; confirm amount + interval. |
| `STRIPE_ALLOWED_PRICE_IDS` | server | Comma-separated **older** DailyAI price IDs that existing subscribers are still on (may be empty). Webhooks for any price not in `STRIPE_PRICE_ID` + this list are ignored, and checkout's trial / already-subscribed checks only count these prices. **Whenever the price changes, add the old ID here first** (otherwise old subscribers lose Pro on their next webhook and could get a second trial). | Stripe → Subscriptions → filter active → list distinct price IDs. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | DailyAI Supabase URL (shared project A). | Unchanged from today. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon key. | Unchanged. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Service-role key. | Unchanged; never `NEXT_PUBLIC_`. |
| `CRON_SECRET` | server | Long random string; same value in Vercel crons **and** the Hetzner `grade-and-persist` `.env.local`. Blank = every cron route returns 500 (fail closed). | `GET /api/cron/grade-picks` without the header → 401. |
| `NEXT_PUBLIC_SITE_URL` | public | `https://dailyaibetting.com` (checkout success/cancel + server fetches). | |
| `NEXT_PUBLIC_BASE_URL` | public | `https://dailyaibetting.com` (blog recap, notifications). | |

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
| `GUEST_CHECKOUT_ENABLED` / `NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED` | off | Set both to `true` only together. |
| `RESEND_API_KEY`, `EMAIL_FROM` | — | Transactional email. |
| `OPENROUTER_API_KEY` | — | AI picks / report generation. |
| `NEXT_PUBLIC_GA_ID` | — | Analytics. |
| `AI_PICKS_DISCORD_WEBHOOK`, `DISCORD_CONSENSUS_WEBHOOK_URL`, `N8N_*_WEBHOOK`, `GOOGLE_SHEET_WEBHOOK`, `BLOG_API_KEY` | — | Integrations; unchanged by this release. |
| `LOG_LEVEL` | info | |
