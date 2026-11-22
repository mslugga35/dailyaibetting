# DailyAI launch master tracker

Single source of truth for launch blockers. Issue IDs come from Muse's 2026-11-20 production review (build 740faa2).
A fix is **VERIFIED** only after it passes twice in production (the second check in a fresh browser context).
Statuses: OPEN · IN PROGRESS · FIXED UNVERIFIED · VERIFIED · BLOCKED (owner/external) · INTENTIONALLY DEFERRED.
Never reopen a VERIFIED issue without new evidence. Evidence lives in `docs/launch-evidence/`; the production checkers are in `qa/launch-verify/`.

**Production build:** 4a33957 (deployed 2026-11-20 17:52Z), previously 41ba76a, 3929e85 and 740faa2.
**Not ready for paying customers** until: Muse confirms the retest checklist (`docs/MUSE-RETEST-2026-11-20b.md`: DAI-04 + DAI-05 PASS 11-20, DAI-07 phone check still open), the legal wording is approved, and the owner decisions below are made.

| ID | Issue | Sev | Status | Fix | Prod check 1 | Prod check 2 | Muse |
|---|---|---|---|---|---|---|---|
| DAI-01 | /props 404 | Med | **VERIFIED** | 50b1ca3 | 3929e85: 200 at 5 widths | 41ba76a: 200 at 5 widths | retest |
| DAI-02 | Grading backlog | High | **FIXED UNVERIFIED** (lookback) · backlog accounted for · further corrections **BLOCKED: OWNER** | writer patch (HB) + 50b1ca3 | writer live, 63 untouched | due ≥ 11-24 | retest |
| DAI-03 | Paid-subscriber billing portal | High | **VERIFIED (Stripe test mode, real browser)** · live paid customer = external | n/a (no defect) | test portal 8/8 | fresh session 8/8 | retest |
| DAI-04 | 540-pick exclusion disclosure | High | **VERIFIED** (536 vs 540 reconciled) | 50b1ca3, 41ba76a, 4a33957 | 4a33957 17/17 | 4a33957 17/17 (fresh) | ✅ retest #2 (5 pages) |
| DAI-05 | Magic-link expiry/reliability | High | **VERIFIED** (reopened 11-20, refixed) | f95ac02, 9201dd4, 4a33957 | 4a33957 E2E real Gmail: all functional checks ✅ | Muse retest #2, real inbox: 7/7 ✅ | ✅ retest #2 |
| DAI-06 | Founding checkout + seats | High | **VERIFIED** | n/a (no defect) | counter = DB, hold released 31 min | counter = DB, 401 signed-out | retest |
| DAI-07 | Mobile + tablet | Med | **VERIFIED (automated)** · human phone look OPEN | 9201dd4, 4a33957 | 4a33957 146/146 | 4a33957 146/146 (fresh) | ⏸️ not verifiable (desktop-only browser) |
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
- **11-20 adversarial review of the live strict-twin code (independent agent, probes on an in-memory fake): NEEDS WORK.** Fixed and redeployed before the first real run:
  - **D1 (critical):** the group's own stored teams and side were never compared with the twin, so a re-oriented game row could grade the wrong side. Now `rowMatchesTwin`, otherwise hold `row_orientation_mismatch`.
  - **D2 (critical if mislinked):** the totals name check used a substring match ("Oklahoma State vs Texas Tech" passed on Oklahoma/Texas). It is now exact per team: one team, or "A @/vs// B", each exactly one of the game's teams.
  - **D3:** own row postponed but an exact twin is final now holds `status_conflict` instead of voiding (≥ floor only).
  - **D5:** an MLB twin must start within 45 min (doubleheader legs are hours apart).
  - **D8:** "final" requires numeric scores and no live status.
  - Tests: `regrade-twin.test.mjs` **22/22**, with new cases for each defect, the floor boundary 11-20/11-21 and the 2 h edges. Mutation-checked: removing D1 or D2 fails its test.
  - Real-data dry run (floor bypassed, read-only): **identical decisions** to the previous version on every existing pending row (6 would grade, 22 hold, 38 no decision).
  - Deployed 11-20 17:3xZ: backup `consensus-store.mjs.bak-20261120b` (sha 8413ea6e), new sha `c195fb10`. Writer online, clean cycle `checked=23 regraded=0 twin=0 held_conflict=0`, pm2 saved.
  - **Not changed (owner decision):**
    - D4: the pre-existing loose `gradingGame()` in `writeCycle` still grades fresh games (last 2 days) with containment matching. That is shared HiddenBag grading behaviour, outside this fix.
    - D6: nickname-only picks ("Celtics") hold rather than grade (safe, but they stay pending).
    - D9: a failed twin query blocks that cycle's own-game regrades until the next cycle.
    - D10: `--backfill` can un-grade twin-graded rows. Don't run backfill without review.
- **Nov 24 verification plan:**
  1. Writer log shows `twin>0` on a cycle after 11-24 00:00 ET.
  2. Read-only: every row graded with `grade_source` ending `_twin` matches ESPN's final for that exact game (team, date, score), cross-checked against the per-pick grades.
  3. No pending row dated ≥ 11-21 whose game has an exact final ESPN twin, unless it is held for a logged reason.
  4. Pending total and fire record move only by those rows. The 31 pre-floor held rows stay untouched.
- **Status:** lookback FIXED UNVERIFIED (until 11-24) · backlog accounted for · further corrections **BLOCKED: OWNER DECISION**.

## DAI-03: Paid-subscriber billing portal
- **Muse 11-20 finding:** "Billing hang is gone — for this account … a complimentary, no-card account, and /account states "there is no billing portal for this account" by design. A paid, card-on-file Pro user's Stripe portal flow has still never been verified."
- **Live portal configuration** (read-only GET, 11-20): livemode, active, default. Update payment method ✅, invoice history ✅, cancel at period end with reasons ✅, plan switching ❌ (keeps the founding price locked), customer update ✅. No DailyAI headline (see STRIPE-NAME).
- **Controlled paying subscriber (Stripe TEST mode):** customer with Visa 4242 on file, active $9.99 founding subscription, paid invoice. The portal opened in a **visible browser with no captcha**: $9.99 per month, Visa •••• 4242 + Add payment method, Update information, invoice history "Nov 20, 2026 $9.99 Paid", Cancel subscription, no plan change, return link → dailyaibetting.com/account. The cancel flow says "it will still be available until the end of your billing period" (reviewed, NOT confirmed).
  - check 1 `DAI-03-portal-testmode/` 8/8 · check 2 (new portal session) `DAI-03-portal-testmode-2/` 8/8.
- **App side (test mode, 740faa2):** `/api/billing-portal` returns a billing.stripe.com session for a founding member (low-mem e2e 75/0/1, `local-test/artifacts/founding-e2e.log`).
- **External:** one real member is trialing (seat #3, first charge 11-26) and is not touched, by rule. A live-mode portal check needs a real paid card and stays with the owner.
- **Verification levels (11-20 billing audit):** these are different levels, and only the first two are done.
  1. Stripe-hosted portal UI in test mode: ✅ twice.
  2. Live configuration: ✅ read-only 11-20. The app's `STRIPE_PORTAL_CONFIGURATION_ID` (`bpc_1TIA…`) **is** the live default config: plan switching off, cancel at period end, card and invoices on.
  3. The app→portal chain for a member made through Checkout: test mode only, at 740faa2 (local e2e). The test subscriber in level 1 was created directly, not through the app.
  4. A live paying member's browser journey: **NOT verified, OWNER/EXTERNAL.** The safe route is Matt's own account and card on a fresh alias: start trial → portal → cancel at period end, with no charge during the trial.
- **Status:** VERIFIED (Stripe test mode + live config read-only) · live paid-member journey **BLOCKED: OWNER/EXTERNAL** · billing findings DAI-11..15 OPEN.

## DAI-04: Exclusion disclosure (540 vs 536 reconciled 11-20: different definitions, not a discrepancy)
- **Muse 11-20 finding:** "Record-exclusion disclosure — not re-checked today, carried as open. Nov 19 found the public record excluded 540 conflicting picks with no disclosure anywhere while /results claims "every" fire pick is graded. The record has since moved (1,019-924-23 → 1,031-934-23), but whether the exclusion is now disclosed was not verified in this run."
- **Prod check before any change (740faa2):** home, /results and /pricing had it in server HTML ✅. **/stats and /history only showed it after a client fetch** (missing with JS off) ❌. Numbers: kept 1,031-934-23 + excluded 269-263-4 (536) = 1,300-1,197-27 ✅ (`DAI-04-check1-20261120`).
- **Root cause:** /stats and /history are client components that fetched the disclosure after load; on /stats it also sat inside the `loading` branch.
- **Fix:** server `page.tsx` wrappers fetch `getRecordDisclosure()` and pass `initial` (50b1ca3); the /stats disclosure moved out of the loading branch (41ba76a).
- **Tests:** "DAI-04 …" ×8 (mutation-checked: they fail against the old files).
- **Prod:** check 1 `DAI-04-prod-41ba76a-1` 17/17 · check 2 `DAI-04-prod-41ba76a-2` 17/17. All 5 pages: raw HTML, JS off, JS on, API arithmetic.
- **540 vs 536 (Muse retest 11-20; independent data audit, row-level):**
  - **540** came from the 11-19 22:58Z launch session SQL `count(*) FILTER (WHERE is_fire AND NOT fire2)`. It counted every demoted fire row, graded **and pending**: 535 graded (269-262-4) + 5 pending. The site never displayed 540; the 740faa2 page said "removed 535 graded picks".
  - **536** is graded only (269-263-4) on 11-20. The +1 is the 11-19 Colts spread (4 cappers, beaten by Texans 11), a loss graded 11-20 04:10Z.
  - Today's all-status count is **541** = 536 graded + 5 pending (stale MLB moneylines from 06-14 to 07-21).
  - Row-level: kept + excluded = before exactly. View 4,026 rows = live non-void 4,026. No row is removed by any filter other than the conflict rule. Percentages are rounded correctly (52.5 / 50.6 / 52.1).
- **Wording corrected (f95ac02):** "only the side with more cappers counts" was not exactly true for 19 chain cases (a pick removed by an opposing group that was itself removed). It now reads: "a pick counts only if it has more cappers than every fire pick on the other side (a tie counts neither)", on the disclosure, /pricing and /results.
  - Check 1 on 4a33957: `DAI-04-prod1-4a33957` 17/17.
- **Status:** VERIFIED; numbers reconciled, no discrepancy.

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

### DAI-05 REOPENED 11-20 (Muse retest #1, build 41ba76a): newer link refused
- **Muse's exact finding:** "ADMIN two links: FAIL on the newer link. Older link (email 10:49:53) correctly rejected. Newer link (email 10:50:00) ALSO rejected with "This sign-in link no longer works" when Sign in was pressed at 11:08. Gmail shows no admin sign-in email was sent between 10:50:00 and 11:09:37 … A fresh third ADMIN link (email 11:09:37) worked immediately."
- **Evidence gathered first (no assumptions):**
  - `auth.audit_log_entries`: ADMIN `user_recovery_requested` at 15:49:53.456Z and 15:49:59.878Z, then nothing until 16:09:37Z. There was no login, logout, confirm or password change in between.
  - Supabase gateway + auth logs: exactly two `POST /auth/v1/verify` in the window, at 16:08:03Z and 16:08:50Z, both **403 "One-time token not found"**. The page did call Supabase, so the button press was real. The token submitted was absent from `auth.one_time_tokens`.
  - GoTrue v2.198.0 source review (independent agent): admin `generateLink` replaces only the user's recovery-type token. `/verify` looks the token up in `one_time_tokens` and checks `recovery_sent_at + mailer_otp_exp` (86400 s). A failed verify writes nothing. The only ways an unused newest token disappears within 24 h are a later link request, a successful sign-in, an email confirmation, a password change or reauthentication. **None occurred** (audit log).
  - Expiry ruled out directly: a link spent after **20 min** ✅ (FREE) and after **30 min** ✅ (PRO).
  - Supabase semantics run 1 (`DAI-05-semantics-run1-20261120`, 24 links, audit = minted):
    - Gaps of 0/1/3/7/15/30/60 s, used in both orders: the newest always works and the older one is always 403.
    - 3 simultaneous requests: exactly one link survives, and the last response to arrive held it each time.
    - Same link pressed in two sessions at the same instant: **both** signed in (DAI-17, upstream).
  - Gmail: **all 12 sign-in emails of 11-20 (FREE, PRO, ADMIN) sat in ONE conversation** with identical subjects and bodies, five of them for ADMIN.
- **Root cause:** the 16:08:50 press submitted a **superseded (older) ADMIN link**. The 10:50 token was valid until 16:09:37 and nothing else could have removed it. Our email design made the wrong button easy to press: same subject and same body every time, stacked into one conversation, with no way on the page to tell which email a link came from. Contributing latent defects found during the investigation:
  - A double click or quick resend minted a second link, which cancelled the first while its email was still in flight. Emails could also arrive out of order.
  - Reloading or restoring the confirm page showed a false "no longer works" (the token lived only in React state).
  - A second link opened in the same tab kept the FIRST link's token.
  - A network or 5xx error was reported as "no longer works".
- **Why the earlier VERIFIED runs missed it (test-the-tests review):**
  - `signin-prod.cjs` minted links in-process with the service role and clicked them about 1 s later in a fresh context.
  - It never used the /login form, real email delivery, an inbox holding several emails, a wait longer than 6 min alongside a sibling link, reload, the same tab, or an outage.
  - Check F asserted only HTTP 200, and check A "token removed" was vacuous.
  - The scripts exited 0 on failure and never checked the deployed build.
  - The route tests never ran a successful send (they expected 502 for a real user).
  - The Supabase fake returned the same token on every call. Those runs prove what they tested, but they were not evidence for the user path.
- **Fix (f95ac02, 9201dd4; Security Engineer: APPROVE WITH CHANGES → all applied → APPROVE):**
  - One link per address per minute. It is claimed synchronously, released only by its owner on failure, and gives the same answer either way.
  - Every email gets its own subject "(sent H:MM AM/PM ET)" and a unique `X-Entity-Ref-ID` (no Gmail stacking).
  - The link carries `sent` (display only), and the page shows "This link was sent at …".
  - The confirm page keeps the link in this tab's sessionStorage (2 h TTL, valid tokens only), so it survives reload and tab restore. It re-reads a second link opened in the same tab. It separates "no longer works" (a Supabase 4xx) from "couldn't reach, may still work" (network/5xx/429).
  - "Already signed in" appears only when this browser spent this link (fingerprint) and `getUser()` confirms, and it names the account.
  - The login page shows the request time and the one-per-minute rule.
- **Regression coverage:**
  - `tests/security/link-lifecycle.test.mjs` (9 behaviour tests; the fake now issues a new, superseding token per call). Mutation-checked: removing the cooldown fails 2 tests, removing the header fails 1.
  - New prod verifiers with a deployed-build gate, a clean evidence dir, non-zero exit and an expected check count:
    - `link-semantics-prod.cjs` (Supabase semantics, audit cross-check);
    - `signin-e2e-prod.cjs` (real /login form → real Gmail delivery → real browser: same-tab older→newer, signed-in older link, reload, outage + retry, two tabs, reuse, 20-min delayed press, token-leak network capture, audit cross-check).
  - The old `signin-prod.cjs` is kept for history but superseded.
- **Prod check 1 on 4a33957** (`DAI-05-e2e-run1-request` 9/9 + `DAI-05-e2e-run1-use` 19/20): every functional check passed, including older→newer in the same tab, reload, outage + retry, two tabs, reuse refused, the 20-min delayed press, the audit cross-check and no token leak. The 1 fail was the verifier's own console filter counting the expected 403/404 resource lines; the filter was fixed afterwards (uncommitted at the time, now committed).
- `DAI-05-e2e-run2-request` is **incomplete** (the second ADMIN request timed out in the verifier and FREE hit its hourly email cap). Kept as-is, not counted.
- **Prod check 2 = Muse retest #2 (11-20, 5:09–5:32 PM ET, real inbox, build 4a33957): 7/7 PASS.**
  - Step 1: ADMIN links 5:10 and 5:11 PM, 70 s apart → two separate Gmail conversations, different "(sent …)" subjects.
  - Step 2: older 5:10 link shows its sent time; Sign in → "This sign-in link no longer works".
  - Step 3: newer 5:11 link opened in the same tab at 5:12, Sign in pressed at 5:28 (16 min) → signed in as ADMIN. **This is the case that failed on 41ba76a.**
  - Step 4: FREE quick resend → "Check your inbox" twice, one email only.
  - Step 5: FREE link, reload, Sign in → signed in.
  - Step 6: same browser → "You're already signed in … mpm.morales+daifree@…"; signed out (no session) → "no longer works". A literal private window was not available; the signed-out case is the equivalent.
  - Step 7: password sign-in run as PRO (saved login, Matt's permission) → signed in.
  - Muse's note: the "no longer works" / "already signed in" result appears after pressing Sign in, not on page load. That is by design: the page can't know a token is dead until Supabase is asked, and it must not spend the token on load.

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
- **What the evidence really is (test-the-tests review):**
  - Real Chromium viewports (DPR, touch, mobile UA), with page-level horizontal scroll measured at first paint.
  - It was **not** checking tap targets, gutters or clipping. A visible defect slipped through: the drawer content touched its edge at 360/390/768/1024, and the drawer Close button was 16×16 px.
- **Fix (9201dd4, 4a33957):** the drawer gets 16 px padding, and the Close button is 36×36.
- **Verifier upgraded:** deployed-build gate, clean evidence dir, exit code, expected count 146, `/auth/confirm` added, and new checks for the 8 px drawer gutter and 24 px tap targets (WCAG 2.5.8 AA).
  - **Red baseline on 41ba76a: 138/146**: gutter and tap targets fail at all 4 widths (`DAI-07-baseline-41ba76a`).
  - Check 1 on 4a33957: `DAI-07-prod1-4a33957` **146/146**, screenshot reviewed.
  - Check 2 on 4a33957: `DAI-07-prod2-4a33957` **146/146** (fresh contexts).
  - Muse retest #2: **not verified**. Muse's browser renders desktop width only (1534×847) with no device emulation. Remaining human check: open the ☰ menu on a real phone (Matt, ~30 s).
- **Not covered:** WebKit/Safari specifics (100vh, safe-area), 320 px and landscape, tap targets outside the drawer, data-heavy states (the day had 0 fire picks), and Stripe-hosted checkout on a phone.

## New findings from the 11-20 war-room review (independent agents; all OPEN unless stated)
Found by the billing audit, the security review and the test review. None is a regression from the 11-20 fixes.

| ID | Finding | Sev | Status | Proposed fix | Needs owner? |
|---|---|---|---|---|---|
| DAI-11 | A second live subscription can be created (two open Checkout tabs, or two concurrent first checkouts), and the webhook only logs `MANUAL RECONCILE` and keeps billing it | Med | FIXED LOCAL (branch `fix/billing-dai11-15`), NOT DEPLOYED | Idempotency key on `customers.create`; expire other open sessions on completion; auto-cancel a duplicate *trial* (`invoice_now:false`); a real alert instead of a log line | Yes: auto-cancel touches subscriptions |
| DAI-12 | A redelivered `checkout.session.completed` re-runs the one-trial-per-card check and can cancel an already-approved trial after a card change | Med | FIXED LOCAL (branch `fix/billing-dai11-15`), NOT DEPLOYED | Skip enforcement when `metadata.trial_card_checked === '1'` | No (code fix), but billing path: test-mode e2e first |
| DAI-13 | A payer whose login isn't mapped to their Stripe customer can buy a second subscription | Med | FIXED LOCAL (branch `fix/billing-dai11-15`), NOT DEPLOYED | Block or redirect when any same-email customer has a live DailyAI subscription; reconcile Stripe against the DB before launch | Reconcile: read-only |
| DAI-14 | Founding holds can be squatted cheaply (confirmed-email accounts, no card); 20 holds make checkout "busy" | Med | FIXED LOCAL (branch `fix/billing-dai11-15`), NOT DEPLOYED | Per-IP hold limit and an alert on prolonged "busy"; offer the regular price instead of a dead end | Pricing UX: yes |
| DAI-15 | `GUEST_CHECKOUT_ENABLED=true` in production. Checkout still refuses guests (401), but the webhook's guest path is live for any non-app payment (e.g. a Payment Link), and it emails Supabase's consumable verify link | Low | CODE READY (signed-in + confirmed email enforced; unset flag = off); prod flag still `true`: OWNER | Set it to false, or route guest emails through `/auth/confirm` | Yes: production payment setting |
| DAI-16 | Third-party scripts (HarborSEO, AdSense, GA, webmcp) load on `/auth/confirm` and `/login`; no CSP | Low | OPEN | Don't render them on `/auth/*` and `/login`; add a CSP | No |
| DAI-17 | Supabase allows the **same** sign-in link pressed in two places in the same instant to sign in twice (no row lock in GoTrue `/verify`). Admits only someone who already holds the link | Info | ACCEPTED (upstream) | None in DailyAI; recorded in `DAI-05-semantics-run1-20261120` | No |
| DAI-18 | `support@dailyaibetting.com` cannot receive mail: the domain has **no MX record** (checked 11-22 via 8.8.8.8). Every policy, /pricing, /pro/success and the refund process point to it | High (launch blocker) | OPEN | Cloudflare Email Routing (free): forward support@ to the owner's inbox, then send a test email | Yes: DNS change |

Billing fixes 11-22 (Builder → Breaker + Security Engineer → fix round → re-review): branch `fix/billing-dai11-15` (26dac3f..d0c08a4), harness 514/516 (1 = CRLF-only `portal-button`, 1 = open todo: Stripe email lookup is case-sensitive, caught after the fact by the reconcile script). Nothing cancels unless `DAI_AUTO_CANCEL_DUPLICATE_TRIAL=true` (default off). Not deployed. Re-review of the fix round: Security Engineer APPROVE WITH CHANGES, 7/7 required items met. Follow-ups before or soon after deploy:
  - N1 (Low-Med): a paid duplicate's `invoice.paid` can re-bind the shared founding seat (it fails safe: the seat leaks). Fix: skip when the seat is bound to another subscription, plus the DB migration in the code FOLLOW-UP note.
  - N2 (Low): the legacy `trial_reuse` comment fallback can be triggered by the customer. The only effect is one extra email; honour it only for pre-deploy cancels.
  - N3 (Low): an alert-only live duplicate gets 1 h of 503 retries.
Live read-only reconcile 11-22: Stripe has 4 live DailyAI subscriptions (2 trialing, 2 active), and all 4 match `user_subscriptions`, with confirmed, signed-in accounts. 0 duplicate subscriptions per customer or email, 0 open Checkout Sessions. 3 of the 4 came through the guest path, and the code keeps them renewing with the flag off (tested).

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
