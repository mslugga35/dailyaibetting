# DailyAI launch master tracker

Single source of truth for launch blockers. Issue IDs come from Muse's 2026-11-20 production review (build 740faa2).
A fix is **VERIFIED** only after it passes twice in production (the second check in a fresh browser context).
Statuses: OPEN · IN PROGRESS · FIXED UNVERIFIED · VERIFIED · BLOCKED (owner/external) · INTENTIONALLY DEFERRED.
Never reopen a VERIFIED issue without new evidence. Evidence lives in `docs/launch-evidence/`; the production checkers are in `qa/launch-verify/`.

**Production build:** 41ba76a (deployed 2026-11-20 ~14:51Z), previously 3929e85 and 740faa2.
**Not ready for paying customers** until: Muse confirms the retest checklist (`docs/MUSE-RETEST-2026-11-20.md`), the legal wording is approved, and the owner decisions below are made.

| ID | Issue | Sev | Status | Fix | Prod check 1 | Prod check 2 | Muse |
|---|---|---|---|---|---|---|---|
| DAI-01 | /props 404 | Med | **VERIFIED** | 50b1ca3 | 3929e85: 200 at 5 widths | 41ba76a: 200 at 5 widths | retest |
| DAI-02 | Grading backlog | High | **FIXED UNVERIFIED** (lookback) · backlog accounted for · further corrections **BLOCKED: OWNER** | writer patch (HB) + 50b1ca3 | writer live, 63 untouched | due ≥ 11-24 | retest |
| DAI-03 | Paid-subscriber billing portal | High | **VERIFIED (Stripe test mode, real browser)** · live paid customer = external | n/a (no defect) | test portal 8/8 | fresh session 8/8 | retest |
| DAI-04 | 540-pick exclusion disclosure | High | **VERIFIED** | 50b1ca3, 41ba76a | 41ba76a 17/17 | 41ba76a 17/17 (fresh) | retest |
| DAI-05 | Magic-link expiry/reliability | High | **VERIFIED** | 50b1ca3, 3929e85 | 3929e85 9/9 | 41ba76a 9/9 (fresh, 2-min delay) | retest |
| DAI-06 | Founding checkout + seats | High | **VERIFIED** | n/a (no defect) | counter = DB, hold released 31 min | counter = DB, 401 signed-out | retest |
| DAI-07 | Mobile + tablet | Med | **VERIFIED** | n/a (no layout defect) | 3929e85 128/128 | 41ba76a 128/128 + signed-in 390 | spot-check |
| DAI-08 | Fire-pick counts | High | VERIFIED (Muse 11-20), regression ✅ | 740faa2 | Muse | roles 41ba76a ✅ | n/a |
| DAI-09 | Pro denied admin grading | Med | VERIFIED (Muse 11-20), regression ✅ | 740faa2 | Muse | roles 41ba76a ✅ | n/a |
| DAI-10 | Complimentary Pro handling | Med | VERIFIED (Muse 11-20), regression ✅ | 8ac6775 | Muse | roles 41ba76a ✅ | n/a |

**Owner decisions (not technical failures):**
- **LEGAL:** Terms/Privacy/Refund stay unpublished until Matt approves the wording.
- **STRIPE-NAME:** Checkout and the portal show "Matthew Morales" (shared Stripe account), and the live default portal has no DailyAI headline. Options from 11-19: a `DAILYAI` statement descriptor on DailyAI subscriptions plus a separate DailyAI portal configuration.
- **BACKLOG:** whether to correct any of the 63 pending rows beyond the 3 verified on 11-20 (the 31 excluded rows each need a manual decision).

---

## DAI-01: /props 404
- **Muse 11-20 finding:** "/props is still a bare 404. https://dailyaibetting.com/props returns "404: This page could not be found." with a "Go back home" button. The 404 page itself shows a breadcrumb "Home > Props", so the route name still appears in navigation context. Player props were advertised as a Pro benefit on Nov 19; today's /pricing Pro card lists 4 items (consensus picks, capper detail, graded results for the latest 50 fire picks, fade-the-public flags) with no player-props line."
- **Reproduced (740faa2):** /props 404 at 360/390/768/1024/1440 (`DAI-07-baseline-740faa2/result.json`).
- **Root cause:** /props was never built. Nothing links to it: src/, public/, sitemap, metadata and nav were all searched. The "Home > Props" breadcrumb comes from the global path-based breadcrumb. One blog post still claimed "our DAILYAIPICKS layout separates … player prop parlays", which is a product promise. The other "player props" mentions are general betting education.
- **Fix (50b1ca3):** `src/app/props/page.tsx`, a branded noindex page ("Player props are not part of DailyAI Betting", links to /consensus and /pricing). The claim was removed from `public/blog/how-to-use-ai-betting-picks-…html` and `src/lib/harbor-posts.json`.
- **Test:** `tests/content/launch-tracker.test.mjs` › "DAI-01 …".
- **Prod:** check 1 `DAI-07-prod1-3929e85` · check 2 `DAI-07-prod2-41ba76a`: /props 200, no horizontal scroll at any width. Roles: signed out.

## DAI-02: Pending grading backlog
- **Muse 11-20 finding:** "Grading backlog: 63 pending (was 228 on Nov 19) — but 26 are stale finished games that will never auto-grade. 26 of the 63 pending picks are Jun–Oct 2026 finished games with no final score shown ("—") … The other 37 pending are Nov 2–21, 2026 … Any public claim that "every" fire pick is graded is still false while 63 are pending." ADMIN: "PENDING 63. Total Graded 1,965; Wins 1,031; Losses 934; Win Rate 52.5%."
- **Reconciliation** (hb_consensus_live, `first_seen`/`graded_at`):

  | UTC | Pending | Change |
  |---|---|---|
  | 11-19 14:00 | ≈214 (Muse saw 228 earlier) | before twin grading; the gap is groups the writer has since deleted/regrouped |
  | 11-19 16–18:00 | −153 | previous session's twin-grading deploy (`final_score_twin`) |
  | 11-20 01:00 | 97 | Muse's evening run (42 not started or live) |
  | 11-20 ~12:30 | 66 | overnight live grading |
  | 11-20 13:30 | **63** | 3 verified manual grades |
  | 11-20 15:00 | 64 | +1 Nov 21 game not yet played (admin page) |
- **The approved 30-pick reconciliation (11-20):** 34 rows checked (9 MLB + 25 rows across 21 games). **3 graded** (3750 loss, 3926 loss, 4 win); 31 excluded and still pending for: wrong-game links (e.g. picks for BYU/Oklahoma/Kansas on Charleston/Oklahoma St/Kansas St rows), capper per-pick grades contradicting ESPN, duplicate hb_games rows, neutral site, inconsistent lines (3581, independent reviewer). Guards (`result='pending'` + content_hash) mean no row is graded twice. Backup, audit, rollback and README: `C:\Users\mpmmo\wt\grading-fix-20261120\`. Stats: fire record 1030-933-23 → 1031-934-23.
- **Root cause of accumulation (confirmed in data and code):** each consensus row points at the Odds-API `hb_games` row, which never gets a score, while the ESPN twin row of the same game is final. `writeCycle` grades from twins, but only in the live window. `regradePending` (older dates, 14 days) looked up the group's own game id only.
- **Fix (shared HiddenBag writer, Hetzner `/root/hiddenbag-v2/scripts`, hand-deployed 2026-11-20 14:05Z):** `regradePending` grades from a twin only when all of these hold: exact team names (St = State), same orientation, exactly one candidate within 6h, start within 2h, FINAL score; every counted capper pick names this game, every stored per-pick grade agrees, and every pick's own line gives the same result. Floor `REGRADE_TWIN_FLOOR = 2026-11-21`, so the existing backlog is never auto-graded. Backups `*.bak-20261120`; source and tests in `C:\Users\mpmmo\wt\hb-writer-fix-20261120\`.
- **Tests:** `regrade-twin.test.mjs` 15/15 (also run on the server), fails against the old store. Real-data simulation with the floor bypassed: grades 6 (all match the ESPN finals), holds 22 suspect rows (every wrong-game row from the audit).
- **Prod check 1:** writer online after restart; `regrade older pending: checked=23 regraded=0 twin=0 held_conflict=0`; pending unchanged. **Check 2 due ≥ 2026-11-24** (the first date rows ≥ 11-21 reach the regrade window): expect `twin>0` and no pending rows from ≥ 11-21 with a final ESPN twin.
- **Copy (50b1ca3):** the pricing FAQ no longer says "Every fire pick is graded". It now says "… once its final score is in … still waiting on a verified final score stay pending and are not counted". Verified live on 41ba76a.
- **Status:** lookback FIXED UNVERIFIED (until 11-24) · backlog accounted for · further corrections **BLOCKED: OWNER DECISION**.

## DAI-03: Paid-subscriber billing portal
- **Muse 11-20 finding:** "Billing hang is gone — for this account … a complimentary, no-card account, and /account states "there is no billing portal for this account" by design. A paid, card-on-file Pro user's Stripe portal flow has still never been verified."
- **Live portal configuration** (read-only GET, 11-20): livemode, active, default. Update payment method ✅, invoice history ✅, cancel at period end with reasons ✅, plan switching ❌ (keeps the founding price locked), customer update ✅. No DailyAI headline (see STRIPE-NAME).
- **Controlled paying subscriber (Stripe TEST mode):** customer with Visa 4242 on file, active $9.99 founding subscription, paid invoice. The portal opened in a **visible browser with no captcha**: $9.99 per month, Visa •••• 4242 + Add payment method, Update information, invoice history "Nov 20, 2026 $9.99 Paid", Cancel subscription, no plan change, return link → dailyaibetting.com/account. The cancel flow says "it will still be available until the end of your billing period" (reviewed, NOT confirmed).
  - check 1 `DAI-03-portal-testmode/` 8/8 · check 2 (new portal session) `DAI-03-portal-testmode-2/` 8/8.
- **App side (test mode, 740faa2):** `/api/billing-portal` returns a billing.stripe.com session for a founding member (low-mem e2e 75/0/1, `local-test/artifacts/founding-e2e.log`).
- **External:** one real member is trialing (seat #3, first charge 11-26) and is not touched, by rule. A live-mode portal check needs a real paid card and stays with the owner.
- **Status:** VERIFIED in Stripe test mode with a real browser.

## DAI-04: Exclusion disclosure (540 → now 536 excluded picks)
- **Muse 11-20 finding:** "Record-exclusion disclosure — not re-checked today, carried as open. Nov 19 found the public record excluded 540 conflicting picks with no disclosure anywhere while /results claims "every" fire pick is graded. The record has since moved (1,019-924-23 → 1,031-934-23), but whether the exclusion is now disclosed was not verified in this run."
- **Prod check before any change (740faa2):** home, /results and /pricing had it in server HTML ✅. **/stats and /history only showed it after a client fetch** (missing with JS off) ❌. Numbers: kept 1,031-934-23 + excluded 269-263-4 (536) = 1,300-1,197-27 ✅ (`DAI-04-check1-20261120`).
- **Root cause:** /stats and /history are client components that fetched the disclosure after load; on /stats it also sat inside the `loading` branch.
- **Fix:** server `page.tsx` wrappers fetch `getRecordDisclosure()` and pass `initial` (50b1ca3); the /stats disclosure moved out of the loading branch (41ba76a).
- **Tests:** "DAI-04 …" ×8 (mutation-checked: they fail against the old files).
- **Prod:** check 1 `DAI-04-prod-41ba76a-1` 17/17 · check 2 `DAI-04-prod-41ba76a-2` 17/17. All 5 pages: raw HTML, JS off, JS on, API arithmetic.

## DAI-05: Magic-link expiry/reliability
- **Muse 11-20 finding:** "Magic sign-in links expire in minutes, not 24 hours. The login page states "The link works once and expires in 24 hours." In practice: the FREE link worked; the first ADMIN link (sent 08:17:38) and the next supplied link both expired before use (redirect to /login?error=link_expired); a third ADMIN link sent 08:35:31 worked only when opened immediately at 08:36–08:37. The PRO link (sent 08:37:17) worked when opened immediately."
- **Root cause (from `auth.audit_log_entries` + the inbox):** ADMIN links were requested at 08:17:37, 08:34:06 and 08:35:31 ET. Each request replaces the previous token, so links 1 and 2 were **superseded**, not expired. There was no login before 08:36:34, so nothing consumed them early. `mailer_otp_exp = 86400` (24h). Defects: the copy never said that only the newest link works, and the error said "expired". Latent risk: the email linked to Supabase's GET-consumed verify URL, which mail scanners could burn.
- **Fix:** 50b1ca3 + 3929e85 (Security Engineer review: safe; M1/L2 applied):
  - The email links to `/auth/confirm#token_hash=…`. It's a URL fragment, so it's never sent to servers, analytics or the Referer.
  - The token is spent only when the person presses the button (`verifyOtp`).
  - A clear "already used / newer link sent / older than 24 hours" page.
  - Copy everywhere: "stays valid for 24 hours. Only the newest link works".
  - No auth weakening: same one-time token, verified by Supabase.
- **Tests:** email-link.test.mjs (confirm URL, never the Supabase verify URL, type allowlist, token format, no open redirect) + "DAI-05 …" ×2.
- **Prod check 1 (3929e85) `DAI-05-prod1-3929e85` 9/9:**
  - A: scanner-style open, then a later click signs in; token scrubbed.
  - B: reuse shows a clear failure.
  - C: an older link after a newer one fails; the newest works.
  - D: the link still works after 6 minutes.
  - E: password sign-in (PRO).
  - F: the real email arrived 14:50Z with `https://dailyaibetting.com/auth/confirm#token_hash=…` and the new copy (checked in the inbox).
- **Prod check 2 (41ba76a) `DAI-05-prod2-41ba76a` 9/9** (fresh contexts; delayed use after 2 min).

## DAI-06: Founding checkout + seat lifecycle
- **Muse 11-20 finding:** "$9.99 founding checkout — works up to payment, no payment made … opened Stripe Checkout in LIVE mode (cs_live_…) … Side effect: founding spots went from 99 to 98 of 100 left after opening checkout — the session appears to have reserved a spot. The page says a spot reopens if not paid / trial not started."
- **Finding: working as designed.** A checkout reserves a seat for 31 min (+60 min grace); abandoned holds are released by the `checkout.session.expired` webhook. The page discloses held seats.
- **Check 1 (14:42Z):** Muse's hold #4 reserved 13:17Z → released 13:48Z (`checkout_expired`). Earlier holds #1 and #2 were released the same way. Counter "99 of 100 … 1 reserved" = DB (1 trialing). Signed-out `POST /api/checkout` → 401 `{"error":"Sign in to start your free trial.","signIn":true}`.
- **Check 2 (15:0xZ, 41ba76a):** counter "98 of 100 … 2 reserved" = DB (1 live checkout hold by a visitor + 1 trial, 0 stale holds); signed-out checkout → 401.
- **Verified email:** Supabase `mailer_autoconfirm=false` (no session before confirming) + the server check on `email_confirmed_at` + tests/billing/checkout.test.mjs.
- **Trial → paid → cancel → refund/dispute:** Stripe test-mode e2e on 740faa2, 75/0/1.
- **Note:** seat #3 is a **real member's trial** (first charge 11-26).

## DAI-07: Mobile + tablet
- **Muse 11-20:** "Not tested … the browser used has no viewport emulation."
- **Harness:** `qa/launch-verify/mobile-prod.cjs`:
  - Playwright viewports: 360 (Pixel UA, DPR 3), 390 (iPhone UA), 768 (iPad), 1024, 1440.
  - 12 pages.
  - Horizontal scroll measured at first paint.
  - The menu toggle and sheet are tested below 1280px.
- **Prod:** baseline 740faa2: no horizontal scroll anywhere. Check 1 3929e85 128/128 · check 2 41ba76a 128/128 · signed-in /account at 390: no overflow (`ROLES-prod-41ba76a-1`).
- **Not covered:** Stripe-hosted checkout on a phone (Stripe's own page).

## New findings from the 11-20 war-room review (independent agents; all OPEN unless stated)
Found by the billing audit, the security review and the test review. None is a regression from the 11-20 fixes.

| ID | Finding | Sev | Status | Proposed fix | Needs owner? |
|---|---|---|---|---|---|
| DAI-11 | A second live subscription can be created (two open Checkout tabs, or two concurrent first checkouts), and the webhook only logs `MANUAL RECONCILE` and keeps billing it | Med | OPEN | Idempotency key on `customers.create`; expire other open sessions on completion; auto-cancel a duplicate *trial* (`invoice_now:false`); a real alert instead of a log line | Yes: auto-cancel touches subscriptions |
| DAI-12 | A redelivered `checkout.session.completed` re-runs the one-trial-per-card check and can cancel an already-approved trial after a card change | Med | OPEN | Skip enforcement when `metadata.trial_card_checked === '1'` | No (code fix), but billing path: test-mode e2e first |
| DAI-13 | A payer whose login isn't mapped to their Stripe customer can buy a second subscription | Med | OPEN | Block or redirect when any same-email customer has a live DailyAI subscription; reconcile Stripe against the DB before launch | Reconcile: read-only |
| DAI-14 | Founding holds can be squatted cheaply (confirmed-email accounts, no card); 20 holds make checkout "busy" | Med | OPEN | Per-IP hold limit and an alert on prolonged "busy"; offer the regular price instead of a dead end | Pricing UX: yes |
| DAI-15 | `GUEST_CHECKOUT_ENABLED=true` in production. Checkout still refuses guests (401), but the webhook's guest path is live for any non-app payment (e.g. a Payment Link), and it emails Supabase's consumable verify link | Low | OPEN | Set it to false, or route guest emails through `/auth/confirm` | Yes: production payment setting |
| DAI-16 | Third-party scripts (HarborSEO, AdSense, GA, webmcp) load on `/auth/confirm` and `/login`; no CSP | Low | OPEN | Don't render them on `/auth/*` and `/login`; add a CSP | No |
| DAI-17 | Supabase allows the **same** sign-in link pressed in two places in the same instant to sign in twice (no row lock in GoTrue `/verify`). Admits only someone who already holds the link | Info | ACCEPTED (upstream) | None in DailyAI; recorded in `DAI-05-semantics-run1-20261120` | No |

Billing read-only checks done 11-20 (Phase 5):
- `user_subscriptions` RLS is on. Writes are service-role only (`auth.role()='service_role'`), and members can only read their own row ✅.
- pm2 `dailyaibetting` runs in fork mode as one process, so the per-process limits hold ✅.
- The app's `STRIPE_PORTAL_CONFIGURATION_ID` (`bpc_1TIA…`) **is** the live default configuration, read-only: livemode, active, plan switching off, cancel at period end, payment method and invoices on, customer may update name/email/address/phone; no headline and no terms/privacy URLs (LEGAL / STRIPE-NAME).
- `PRICING_MODE=founding`, live key ✅.

## DAI-08 / DAI-09 / DAI-10: VERIFIED by Muse 11-20, regression only
- DAI-08: "Homepage and /picks agree: 6 total, 3 consensus, 0 fire picks … now matching the grading page's 1,031 wins / 934 losses at 52.5%." Regression 41ba76a: home = /picks fire count ✅.
- DAI-09: "a proper access-denied page: "You don't have access to this page. This area is for site administrators only."" Regression: PRO and FREE /admin denied ✅; ADMIN /admin/grading loads (view only) ✅.
- DAI-10: ""Manage Subscription" routes to /account with no "Opening portal…" hang". Regression: PRO /account shows "Complimentary Pro access", no hang ✅.
- Evidence `docs/launch-evidence/ROLES-prod-41ba76a-1/` (admin-grading.jpg).
