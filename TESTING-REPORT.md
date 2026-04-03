# DailyAI Betting — Testing & Quality Report
**Generated: 2026-04-03**

## Project Overview

| Field | Value |
|-------|-------|
| **URL** | https://dailyaibetting.com |
| **Stack** | Next.js 14, Supabase, Stripe, Tailwind, Vercel |
| **Purpose** | AI-powered sports betting consensus platform |
| **Key Features** | Consensus picks, capper leaderboards, pro subscriptions, email capture |
| **Test Framework** | Playwright (ETETEST @ github.com/mslugga35/etetest) |

## Architecture

```
User → Vercel (Next.js SSR/SSG)
         ├── Supabase (DB: picks, subscribers, subscriptions)
         ├── Stripe (checkout, billing portal)
         ├── n8n (welcome email, contact notifications via Gmail)
         └── Google Sheets (subscriber backup log)
```

## What's Tested

### E2E Test Suites (ETETEST)

| Suite | Tests | Status | What It Checks |
|-------|-------|--------|----------------|
| **Checkout API** | 4 | ✅ Pass | Bearer token auth, Stripe URL, invalid token rejection |
| **Subscribe API** | 5 | ✅ Pass | Valid email, invalid email, empty body, duplicates, real email delivery |
| **SEO** | 14 | ✅ Pass | Meta tags, OG tags, h1, canonical, sitemap, robots.txt, broken images, alt text, JSON-LD |
| **Security** | 4 | ✅ Pass | Headers, XSS sanitization, CORS, rate limiting |
| **Uptime** | 7 | ✅ Pass | Homepage loads, 200 status, valid HTML, SSL, health endpoint, sitemap |
| **User Journey** | 5 | ✅ Pass | Homepage, nav, signup form, checkout page, full flow |
| **Links** | 3 | ✅ Pass | External links resolve, no broken links, valid protocols |
| **Accessibility** | 3 | 🔄 Fixing | axe-core WCAG 2.1 AA audit (contrast) |
| **Mobile** | 9 | 🔄 Fixing | Responsive, text readability, touch targets, hamburger menu |
| **Performance** | 6 | ⚠️ Flaky | LCP, CLS, load time (AdSense console noise, cold starts) |
| **Email Delivery** | 3 | ⚠️ Flaky | MailSlurp timing-dependent |
| **Forms** | 3 | ⚠️ Partial | Contact form submission, validation |

### Infrastructure Monitoring

| Monitor | Frequency | Alert Channel |
|---------|-----------|---------------|
| Hetzner health check (jemile) | Every 5 min | Discord + auto-restart |
| Vercel deployment | On push | Vercel dashboard |

## Auth Flow

**Implicit flow** (tokens in localStorage, not cookies):
- Login: magic link → Supabase auth → tokens in localStorage
- API calls: client sends `Authorization: Bearer <token>` header
- Server: `resolveUser()` in `api-helpers.ts` handles both Bearer token and cookie auth

## Payment Flow

```
/pro page → handleCheckout() → POST /api/checkout (Bearer auth)
  → Supabase: check subscription status
  → Stripe: create customer + checkout session
  → Redirect to checkout.stripe.com
  → Success → /pro/success
```

**Stripe config:**
- Price: `price_1TGikVIUSiaDr5yiquxMEOSS` ($20/mo)
- Trial: 7 days
- SDK: v21 with `createFetchHttpClient()` (Vercel compat)

## Subscribe Flow

```
Email input → POST /api/subscribe
  → Rate limit check (5/min/IP)
  → Supabase upsert (email_subscribers)
  → If new: fire Google Sheet webhook + n8n welcome email
  → Response: { success: true }
```

## Contact Flow

```
Contact form → POST /api/contact
  → Rate limit check (10/min/IP)
  → Validate name (2-100), email, message (10-5000)
  → Supabase insert (contact_messages)
  → Fire n8n notification webhook → Gmail to mpm.morales@yahoo.com
```

## n8n Workflows

| Workflow | ID | Webhook Path | Purpose |
|----------|----|-------------|---------|
| DailyAI Welcome Email | EMZmkWPFT1E4t6tl | /webhook/dailyai-welcome-email | Send welcome email to new subscribers |
| DailyAI Contact Form | e1JqjoxvanO2rMP9 | /webhook/dailyai-contact-form | Email contact form submissions |

## Shared Code (api-helpers.ts)

All API routes use `src/lib/api-helpers.ts`:
- `isRateLimited(ip, maxRequests?, windowMs?)` — time-based cleanup every 60s
- `isValidEmail(email)` — regex validation
- `getClientIp(request)` — x-forwarded-for extraction
- `resolveUser(request)` — Bearer token or cookie auth
- `getSupabaseAdmin()` — lazy singleton, typed with `Database` generics

## Known Issues

| Issue | Category | Root Cause | Priority |
|-------|----------|-----------|----------|
| AdSense console errors | Performance | Google's third-party script | Won't fix |
| External link HEAD failures | Links | Bot protection on third-party sites | Won't fix |
| Homepage cold start >5s | Performance | Vercel serverless cold start | Low |
| 6 API routes still have own Supabase client | Code quality | Pre-existing, not broken | Low |

## Environment Variables (Production)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin queries |
| `STRIPE_SECRET_KEY` | Stripe API (live) |
| `STRIPE_PRICE_ID` | Subscription price |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `N8N_WELCOME_EMAIL_WEBHOOK` | Welcome email trigger |
| `N8N_CONTACT_EMAIL_WEBHOOK` | Contact notification trigger |
| `GOOGLE_SHEET_WEBHOOK` | Subscriber backup to Sheets |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL |

## Recent Commits (This Session)

```
7084a66 feat: typed Supabase client, remove all `as any` casts
77310c4 fix: rate limiter timing, subscribe upsert, clean comments
707ac93 fix: input bounds, webhook error logging, contrast + aria improvements
9a2c3fe refactor: extract shared API helpers, fix type safety, remove duplication
21649e7 feat: Stripe checkout fix, n8n welcome email, a11y + SEO improvements
```
