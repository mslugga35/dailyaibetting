# DailyAI + HiddenBag — Status & Next (handoff)
_Last updated: 2026-06-01. Sites still being built / not fully active._

## ✅ Where we left off (LIVE)

### DailyAI (Hetzner, GH Actions auto-deploy on push to master)
- **Guest checkout LIVE** — pay-first, one-tap wallets (Apple/Google Pay/Link), no signup; webhook creates the account + emails a magic link → `/auth/callback`.
- **Premium unlock fixed** — server pages now forward the auth cookie to `/api/consensus` (members were wrongly seeing the free tier). Upsell CTAs hide for members.
- **Track record** — `consensus_results` table + `save_daily_consensus` RPC + views. PM2 cron `dailyai-track-record` (daily 15:00 UTC) snapshots today's fire picks + grades yesterday vs ESPN. `/results` wired; homepage win-rate bar self-activates once graded data exists (~1 day after launch). Docs: `docs/CONSENSUS-TRACK-RECORD.md`.
- **SEO** — already comprehensive; added sportsbooks/login metadata.

### HiddenBag (Vercel auto-deploy on push to master)
- **Guest checkout + passwordless LIVE** — pay-first (Stripe collects email) → webhook creates account → magic link → `/auth/guest` (client hash handler). Passwordless login added (password kept as fallback). Magic-link sign-in tested + confirmed working.
- **Track record LIVE NOW** — derived from already-graded `hb_picks` via `hb_consensus_track`/`hb_consensus_stats`/`hb_consensus_by_sport` views (no cron). **55.4% on 1,968 graded fire-pick consensus plays.** Homepage win-rate bar + public `/results` page both live + populated. Docs: in this file + migration.
- **SEO** — JSON-LD (Organization/ProfilePage/Breadcrumb), OG/Twitter cards, dynamic OG image, canonicals.
- **Guardrails** — top CLAUDE.md "NEVER" rules enforced as global hookify hooks.

## ⏳ Pending YOUR action (the only unexercised paths)
1. **Real Stripe card checkout** on each site (incognito → pricing/pro → pay). Everything up to payment is tested; the live card → webhook chain is the last unverified step. DailyAI's chain proven via a real trial; HiddenBag's provision/email/sign-in proven directly.
2. **Stripe Dashboard (both):** enable Apple Pay / Google Pay / Link under Payment Methods; confirm webhook deliveries are green.
3. **DailyAI win-rate bar** populates after the first cron grade cycle (~next day). HiddenBag's is already populated.

## 🔧 Improvements (grounded in this session)
- **DailyAI:** persist pick-level grades like HiddenBag → instant track record + capper leaderboard parity (HiddenBag's view approach is cleaner than the cron).
- **DailyAI:** stale-PENDING cleanup — `CANCELLED` consensus_results PENDING > 3 days (picks that dropped below 3 cappers never get graded).
- **Both:** Resend bounce/complaint webhook → alert on magic-link delivery failures (don't let a paying buyer silently fail to get access).
- **Both:** link the homepage win-rate bar → `/results` (discoverability of the trust page).

## 💡 New ideas (revenue / growth)
1. **Sportsbook affiliate revenue** (DailyAI has sportsbook links; audit estimated ~$1-3k/mo untapped) — add affiliate links + click tracking. Real money, low effort.
2. **Free daily "fire picks" email digest** — email infra now works; capture emails → daily digest → upsell to Pro. Drives engagement + conversion + retention.
3. **Annual plan** (e.g. save 20%) — better LTV than monthly-only; one-line Stripe price addition.
4. **Abandoned-checkout email** — Stripe started but not completed → reminder (10-15% recovery).
5. **Shareable win-rate card** — social-proof image (next/og) for Twitter/Discord: "DailyAI fire picks: 55% win rate". Free marketing.
6. **Referral program** — refer a friend → both get a free week.
7. **Pick-of-the-day free teaser** → signup magnet.

## Key gotchas (don't relearn the hard way)
- DailyAI deploys via **GH Actions** on push — do NOT manually `npm run build` on Hetzner (races the Actions build → `.next/lock` failure). HiddenBag = Vercel auto-deploy.
- Both sites **share one Supabase project** (`aeeykasmymitzbuhdlfe`). New public pages must be added to `src/middleware.ts` PUBLIC_PATHS (HiddenBag) or they redirect to login.
- HiddenBag's cron-style scripts: `scripts/` may be gitignored — check before assuming a script deploys via git.
- Never fabricate win-rate numbers (betting product). All track-record data is derived from real graded results.
