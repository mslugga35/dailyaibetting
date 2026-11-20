# DailyAI launch master tracker

Single source of truth for launch blockers. Issue IDs come from Muse's 2026-11-20 production review (build 740faa2).
A fix is **VERIFIED** only after it passes twice in production (second check in a fresh session/context).
Statuses: OPEN · IN PROGRESS · FIXED UNVERIFIED · VERIFIED · BLOCKED (owner/external) · INTENTIONALLY DEFERRED.
Never reopen a VERIFIED issue without new evidence. Evidence files live in `docs/launch-evidence/`.

Production build at tracker creation: **740faa2** (2026-11-20, Hetzner `/root/apps/dailyaibetting`, pm2 `dailyaibetting`).

| ID | Issue | Severity | Status | Fix commit | Prod check 1 | Prod check 2 |
|---|---|---|---|---|---|---|
| DAI-01 | /props 404 | Medium | OPEN | | | |
| DAI-02 | Pending grading backlog incl. stale historical games | High | IN PROGRESS | | | |
| DAI-03 | Paid-subscriber Stripe billing portal | High | OPEN | | | |
| DAI-04 | Disclosure of 540 excluded conflicting picks | High | OPEN (needs prod verification) | 740faa2 (claimed) | | |
| DAI-05 | Magic-link login expiration/reliability | High | OPEN | | | |
| DAI-06 | Founding checkout + seat reservation lifecycle | High | OPEN | | | |
| DAI-07 | Mobile + tablet verification | Medium | OPEN | | | |
| DAI-08 | Fire-pick count consistency | High | VERIFIED (Muse 11-20), regression only | 740faa2 | Muse 11-20 | |
| DAI-09 | Pro access denied to Admin grading | Medium | VERIFIED (Muse 11-20), regression only | 740faa2 | Muse 11-20 | |
| DAI-10 | Complimentary Pro account handling | Medium | VERIFIED (Muse 11-20), regression only | 8ac6775 | Muse 11-20 | |

Owner-only items (not technical failures): **LEGAL**: Terms/Privacy/Refund stay unpublished until Matt approves the wording. **STRIPE-NAME**: Checkout shows "Matthew Morales" (shared Stripe account); the statement/display name waits on the owner.

---

## DAI-01: /props 404
- **Muse 11-20 finding:** "/props is still a bare 404. https://dailyaibetting.com/props returns "404: This page could not be found." with a "Go back home" button. The 404 page itself shows a breadcrumb "Home > Props", so the route name still appears in navigation context. Player props were advertised as a Pro benefit on Nov 19; today's /pricing Pro card lists 4 items (consensus picks, capper detail, graded results for the latest 50 fire picks, fade-the-public flags) with no player-props line."
- **Earlier:** Nov 19 review (props advertised as Pro benefit). Owner decision 11-19: /props not advertised.
- **Root cause:** _pending investigation_
- **Affected:** | **Fix:** | **Tests:** | **Prod evidence:** | **Roles:**
- **Status:** OPEN

## DAI-02: Pending grading backlog
- **Muse 11-20 finding:** "Grading backlog: 63 pending (was 228 on Nov 19) — but 26 are stale finished games that will never auto-grade. 26 of the 63 pending picks are Jun–Oct 2026 finished games with no final score shown ("—"): Oct 8 (2 MLB), Sep 19 + Sep 5 (2 NCAAF), Aug 28 + Aug 15 (2 MLB), Jul 22/21/9/5 (9 MLB), Jun 30/28/25/23/14 (11 MLB). The other 37 pending are Nov 2–21, 2026. The grading page notes it re-checks a pending row for 14 days and anything older still pending needs a reviewed correction … Any public claim that "every" fire pick is graded is still false while 63 are pending." ADMIN: "PENDING 63. Total Graded 1,965; Wins 1,031; Losses 934; Win Rate 52.5%."
- **2026-11-20 verified correction (owner-approved scope of 30):** 34 rows checked, **3 graded** (ids 3750, 3926, 4), 31 excluded and kept pending. Audit/backup/rollback: `C:\Users\mpmmo\wt\grading-fix-20261120\` (README there). Pending 66 → 63 at 13:30Z. That explains Muse's 63.
- **Root cause (confirmed):** `hb_games` rows stay `scheduled` with no score (Odds API scores endpoint looks back ~3 days, no ESPN backfill for those ids); the regrade window is 14 days. Plus wrong-game links in pick→game matching.
- **Status:** IN PROGRESS (228/66/63 reconciliation + lookback fix pending)

## DAI-03: Paid-subscriber billing portal
- **Muse 11-20 finding:** "Billing hang is gone — for this account … a complimentary, no-card account, and /account states "there is no billing portal for this account" by design. A paid, card-on-file Pro user's Stripe portal flow has still never been verified."
- **Existing evidence (API level, NOT browser-verified):** Stripe test mode, 740faa2, `local-test/low-mem-founding-e2e.sh` 2026-11-20 08:30 ET: 75 pass / 0 fail / 1 blocked: "portal configuration: plan switching disabled, cancel at period end" PASS, "portal session opens for the founding member" PASS (200), portal UI BLOCKED by Stripe hCaptcha (not bypassed). Portal UI passed on f28c394 (2026-11-19 13:52, "$9.99 per month", Cancel, no change-plan).
- **Status:** OPEN

## DAI-04: 540 excluded-pick disclosure
- **Muse 11-20 finding:** "Record-exclusion disclosure — not re-checked today, carried as open. Nov 19 found the public record excluded 540 conflicting picks with no disclosure anywhere while /results claims "every" fire pick is graded. The record has since moved (1,019-924-23 → 1,031-934-23), but whether the exclusion is now disclosed was not verified in this run."
- **Claimed fix:** 740faa2 `RecordDisclosure` component on home, /results, /stats, /history, /pricing (server-rendered on home, /results, /pricing).
- **Status:** OPEN (prod verification pending)

## DAI-05: Magic-link expiration
- **Muse 11-20 finding:** "Magic sign-in links expire in minutes, not 24 hours. The login page states "The link works once and expires in 24 hours." In practice: the FREE link worked; the first ADMIN link (sent 08:17:38) and the next supplied link both expired before use (redirect to /login?error=link_expired); a third ADMIN link sent 08:35:31 worked only when opened immediately at 08:36–08:37. The PRO link (sent 08:37:17) worked when opened immediately."
- **Findings so far:** Supabase project A `mailer_otp_exp = 86400` (24h). The email links directly to Supabase `/auth/v1/verify` (one-time, consumed by any GET). Each new link request replaces the previous token.
- **Status:** IN PROGRESS

## DAI-06: Founding checkout + seats
- **Muse 11-20 finding:** "$9.99 founding checkout — works up to payment, no payment made. /pro … opened Stripe Checkout in LIVE mode (cs_live_…) … Stopped at payment entry … Side effect: founding spots went from 99 to 98 of 100 left after opening checkout — the session appears to have reserved a spot. The page says a spot reopens if not paid / trial not started." Pricing: "98 of 100 spots left, 2 reserved".
- **Data 2026-11-20 13:44Z:** seat #4 `reserved` 13:17Z, hold_expires 14:48Z (Muse's probe); #3 `trialing` since 2026-11-19 21:42Z; #1, #2 `released` (checkout_expired, ~31 min after reserve).
- **Status:** OPEN

## DAI-07: Mobile/tablet
- **Muse 11-20:** "Not tested … the browser used has no viewport emulation."
- **Status:** OPEN

## DAI-08: Fire-pick count consistency, VERIFIED by Muse 11-20
- "Homepage and /picks agree: 6 total, 3 consensus, 0 fire picks … The homepage record also moved … to 1,988 (1,031-934-23), now matching the grading page's 1,031 wins / 934 losses at 52.5%."

## DAI-09: Pro denied Admin grading, VERIFIED by Muse 11-20
- "It now shows a proper access-denied page: "You don't have access to this page. This area is for site administrators only." (was a bare 404 on Nov 19)."

## DAI-10: Complimentary Pro account, VERIFIED by Muse 11-20
- ""Manage Subscription" routes to /account with no "Opening portal…" hang … /account states "there is no billing portal for this account" by design."
