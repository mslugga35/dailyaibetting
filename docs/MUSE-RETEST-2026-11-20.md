# Muse retest: DailyAI production, build 41ba76a

Only the previously failing workflows. Tracker: `docs/DAILYAI-LAUNCH-MASTER-TRACKER.md` (issue IDs below).
Read-only: no payments, no subscription changes, no "Run Auto-Grader". Matt gives you the passwords directly.
Accounts: FREE `mpm.morales+daifree@gmail.com` · PRO `mpm.morales+daipaid@gmail.com` · ADMIN `mpm.morales+daiadmin@gmail.com`.
Check the build first: https://dailyaibetting.com/.well-known/commit-info.json should show `41ba76a…`.

## DAI-05: sign-in links (the main fix)
- [ ] /login: the text now says "stays valid for 24 hours. Only the newest link works".
- [ ] Request ONE link for FREE. The email button goes to `dailyaibetting.com/auth/confirm` (not supabase.co). Opening it shows a **Sign in** button. Wait at least 10 minutes, then press it: you're signed in.
- [ ] Press the same email link again: it says "This sign-in link no longer works" with a "Get a new link" button (not a silent redirect).
- [ ] Request two links for ADMIN in a row. Use the **older** one: you get the clear "no longer works" page. Then use the newer one: it works.
- [ ] Password sign-in still works ("Sign in with a password instead").

## DAI-04: record disclosure
- [ ] A "How this record is counted" box appears next to the record on **/**, **/results**, **/stats**, **/history** and **/pricing**. It says the removed picks went 269-263-4 and that the record with them included would be 1,300-1,197-27.
- [ ] Optional: with JavaScript disabled, the box is still there on all five pages.
- [ ] /pricing FAQ "How is the track record calculated?" no longer says "Every fire pick is graded".

## DAI-01: /props
- [ ] https://dailyaibetting.com/props shows "Player props are not part of DailyAI Betting" with links to consensus picks and pricing (no bare 404). Nothing on /pricing promises props.

## DAI-03: billing portal (paying subscriber)
- [ ] Verified in **Stripe test mode** with a card-on-file subscriber. Screenshot: `docs/launch-evidence/DAI-03-portal-testmode/1-portal-overview.png` ($9.99/month, Visa 4242, Add payment method, invoice history Paid, Cancel subscription, no plan change).
- [ ] With Matt only: a live paying-member portal check needs a real paid account. Don't use the live trial member's account.

## DAI-06: founding checkout
- [ ] Signed out: "Start free trial" asks you to sign in.
- [ ] Signed in as FREE: checkout opens at $9.99 founding. **Stop before entering a card.** The /pricing seat line counts your hold as "reserved", and it reopens about 31 minutes after you leave.

## DAI-07: mobile (if your tool can set a viewport now)
- [ ] At 360/390 px: home, /pricing, /consensus, /account have no sideways scrolling, and the ☰ menu opens. (Automated run passed 128/128 at 360/390/768/1024/1440: `docs/launch-evidence/DAI-07-prod2-41ba76a/`.)

## DAI-02: grading backlog (accounting check, no action)
- [ ] /admin/grading as ADMIN: pending is about 63–65. The Jun–Oct rows are expected to remain until Matt decides on manual corrections; each was checked and held for a documented reason (`C:\Users\mpmmo\wt\grading-fix-20261120\README.md`).

## Regression only (passed 11-20, don't re-audit): DAI-08 fire counts, DAI-09 Pro denied admin, DAI-10 complimentary Pro.

## Not in scope
Terms/Privacy/Refund stay unpublished until Matt approves them. The "Matthew Morales" name in Stripe is a pending owner decision.

Report each box as PASS / FAIL with URL + screenshot for any FAIL, quoting the issue ID.
