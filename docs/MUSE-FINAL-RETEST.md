# Muse final regression: DailyAI production, build 413a3b5 (= 2265871 billing release + one Harbor blog post)

Short and focused: only what changed in this release. Read-only: **no payments, no card entry, no subscription changes, no "Run Auto-Grader".** Matt gives you the passwords directly.
Accounts: FREE `+daifree` · PRO `+daipaid` · ADMIN `+daiadmin` (same Gmail as before).

**Step 0:** https://dailyaibetting.com/.well-known/commit-info.json must show `413a3b5…` (or a later commit whose only change since 2265871 is a Harbor blog post; tell us the hash). If it shows anything else, stop and report.

## 1. Checkout entry (signed-in, verified email only)
- [ ] Signed out: /pricing → Founding button. Expected: you're asked to sign in; no Stripe page opens.
- [ ] Signed in as FREE: /pricing → Founding → the Stripe Checkout page opens. Expected: the name at the top reads **"DailyAI Betting"**. (Known and accepted for launch, DAI-20: the browser **tab title** still reads "Matthew Morales"; note it, don't fail it.) $0.00 due today, 7-day trial, then $9.99/month. **Close the tab. Do not enter a card.**
- [ ] Back on the site as FREE, open /pricing again and start Checkout a second time. Expected: a new Checkout page opens normally (the first one stops working). Close it. Each opened Checkout holds one founding seat until that Checkout expires (31 minutes, released by Stripe's expiry event; at most 90 minutes if that event is late). That is expected and releases itself, so open Checkout only the two times listed.
- [ ] Signed in as PRO: /pricing. Expected: you're told you already have Pro / sent to Account to manage it; no second Checkout.

## 2. Account (PRO, look only)
- [ ] /account as PRO. The PRO tester is complimentary Pro (no Stripe subscription). Expected: the page shows a Pro account with no renewal or charge date and **no** Manage Subscription button. The real paid-member portal is Matt's own live test, not yours.

## 3. Pricing page accuracy
- [ ] /pricing still shows the Founding offer at $9.99/month, the regular price, the 7-day trial and the seats-left counter. No "regular price" checkout button was added.

## 4. Regression spot checks (unchanged areas)
- [ ] Sign-in link for FREE works (one email, its own conversation, the sent time shown).
- [ ] /, /results, /stats load; the disclosure box wording is unchanged from your 11-20 run.
- [ ] /props loads.

## Not in scope
- Mobile menu (Matt's real-phone check), live paid-portal test (Matt), grader (Nov 24), legal pages (unpublished until Matt approves), support email (pending DNS).

Report each box PASS / FAIL with URL + screenshot for any FAIL.

## 5. Evidence request: the $24.99 note from your 11-22 run (DAI-21)
Your 11-22 report said $19.99/month in the trial and price-lock text, but one step note said **$24.99/month**. We found no $24.99 anywhere: not in the code, the server, 13 live pages, or Stripe prices. Please send:
- [ ] The exact URL (or the Stripe Checkout step) where you saw $24.99, and a screenshot if you have one.
- [ ] If you can't find it again, say so: we'll close it as a note typo.
- [ ] While on /pricing, /pro and the Checkout page: confirm every regular-price mention reads **$19.99/month**.
