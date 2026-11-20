# Muse retest #2: DailyAI production (sign-in fix + layout), build __SHA__

Focused on what failed or changed since your 11-20 run (10:37–11:48 AM ET). Tracker: `docs/DAILYAI-LAUNCH-MASTER-TRACKER.md`.
Read-only: no payments, no subscription changes, no "Run Auto-Grader". Matt gives you the passwords directly.
Accounts: FREE `mpm.morales+daifree@gmail.com` · PRO `mpm.morales+daipaid@gmail.com` · ADMIN `mpm.morales+daiadmin@gmail.com`.
**Step 0:** https://dailyaibetting.com/.well-known/commit-info.json must show `__SHA__…`. If it doesn't, stop and report.

## What we found about your DAI-05 failure (so you can judge the fix)
- Supabase's own logs show your two ADMIN presses at 11:08:03 and 11:08:50 AM ET. Both were refused with "One-time token not found".
- The 10:50 link's token was still valid at that moment: nothing replaced or used it until your 11:09:37 request. The link also doesn't expire early: test links pressed after 20 and 30 minutes worked.
- So the 11:08:50 press submitted an **older** link. All 12 sign-in emails that day (FREE, PRO and ADMIN) were stacked in **one Gmail conversation** with identical subjects and bodies, five of them for ADMIN. That makes it very easy to press the wrong one.
- The design made that easy, so it's a product defect, not a tester error. Fixed:
  - Every email now has its own subject with the send time, for example "Your DailyAI sign-in link (sent 2:41 PM ET)", and a header that stops Gmail stacking them.
  - The sign-in page shows "This link was sent at …".
  - Only one link per address per minute, so a quick second request can't cancel the first.
  - Clearer failure and recovery screens.

## DAI-05: sign-in links (main retest)
Use real emails from the inbox, as before. Wait at least 1 minute between link requests for the same address.
- [ ] **Request at 1-minute spacing.** Request a link for ADMIN, wait about 70 s, then request another.
  - Expected: two **separate** conversations in Gmail (not stacked), and different "(sent H:MM AM/PM ET)" times in the subjects.
- [ ] **Older link.** Open the OLDER email. The page shows "This link was sent at <older time>". Press **Sign in**.
  - Expected: "This sign-in link no longer works", with the same sent time shown.
- [ ] **Newer link, same tab, after a wait.** In the **same tab**, open the NEWER email's link. The page shows the newer time and a Sign in button. Wait at least 15 minutes, then press it.
  - Expected: you are signed in as ADMIN.
  - This step reproduces your failing scenario.
- [ ] **Quick resend.** Sign out. On /login request a link for FREE, press "Use a different email", enter FREE again and send within the minute.
  - Expected: the "Check your inbox" screen both times, but **only one** new email arrives.
- [ ] **Reload.** Open the FREE link, press the browser's **reload** button, then press Sign in.
  - Expected: you are signed in (the page used to say "no longer works" after a reload).
- [ ] **Already used.** Open the same FREE link again.
  - In the same browser: "You're already signed in" with the account email.
  - In a different browser or a private window: "This sign-in link no longer works".
- [ ] **Password sign-in** still works ("Sign in with a password instead").

## DAI-04: record disclosure wording (small change)
- [ ] On /, /results, /stats, /history and /pricing the box now reads: "When fire picks landed on both sides of one game, a pick counts only if it has more cappers than every fire pick on the other side (a tie counts neither)." The numbers should still be 536 graded picks, 269-263-4, and 1,300-1,197-27 including them, unless new games have been graded since.
- [ ] Why 540 vs 536: 540 (Nov 19) counted every removed pick, including 5 that are still ungraded. 536 counts graded picks only, and one more removed pick was graded on Nov 20. Today the all-status count is 541 = 536 graded + 5 pending. No discrepancy.

## DAI-07: mobile menu (small change)
- [ ] At phone width, open the ☰ menu.
  - Expected: the logo row, the "Sports" chips and the Sign in / Go Pro buttons sit inside the drawer with a margin. They used to touch the drawer edge.
  - Automated: `node qa/launch-verify/mobile-prod.cjs <label> __SHA__` (screenshots in `docs/launch-evidence/DAI-07-<label>/`).

## Unchanged from your 11-20 run (no need to repeat)
DAI-01 /props ✅ · DAI-06 founding checkout ✅ · DAI-02 accounting ✅ (the grader's next real check is on/after Nov 24) · DAI-08/09/10 ✅.

## Not in scope
- **DAI-03:** a live paying-member portal check needs a real paid card and stays with Matt. The live portal settings were read directly: no plan switching, cancel at period end, card and invoices on.
- Legal pages and the "Matthew Morales" Stripe name are Matt's decisions.

Report each box as PASS or FAIL. For any FAIL include the URL, a screenshot and the **sent time shown on the page**.
