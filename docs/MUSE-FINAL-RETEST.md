# Muse final retest: DailyAI production, build BUILD_SHA

Short and focused: only what changed in this release. Read-only: **no payments, no card entry, no subscription changes, no "Run Auto-Grader".** Matt gives you the passwords directly.
Accounts: FREE `+daifree` · PRO `+daipaid` · ADMIN `+daiadmin` (same Gmail as before).

**Step 0:** https://dailyaibetting.com/.well-known/commit-info.json must show `BUILD_SHA…`. If not, stop and report.

## 1. Checkout entry (signed-in, verified email only)
- [ ] Signed out: /pricing → Founding button. Expected: you're asked to sign in; no Stripe page opens.
- [ ] Signed in as FREE: /pricing → Founding → the Stripe Checkout page opens. Expected: the name at the top reads **"DailyAI Betting"** (not "Matthew Morales"), $0.00 due today, 7-day trial, then $9.99/month. **Close the tab. Do not enter a card.**
- [ ] Back on the site as FREE, open /pricing again and start Checkout a second time. Expected: a new Checkout page opens normally (the first one stops working). Close it. Each opened Checkout holds one founding seat until that Checkout expires (31 minutes, released by Stripe's expiry event; at most 90 minutes if that event is late). That is expected and releases itself, so open Checkout only the two times listed.
- [ ] Signed in as PRO: /pricing. Expected: you're told you already have Pro / sent to Account to manage it; no second Checkout.

## 2. Account and portal (PRO, look only)
- [ ] /account → Manage Subscription opens the Stripe portal within a few seconds. Expected: plan DailyAI Pro, no plan switching. **Do not cancel or change anything.** Close it.

## 3. Pricing page accuracy
- [ ] /pricing still shows the Founding offer at $9.99/month, the regular price, the 7-day trial and the seats-left counter. No "regular price" checkout button was added.

## 4. Regression spot checks (unchanged areas)
- [ ] Sign-in link for FREE works (one email, its own conversation, the sent time shown).
- [ ] /, /results, /stats load; the disclosure box wording is unchanged from your 11-20 run.
- [ ] /props loads.

## Not in scope
- Mobile menu (Matt's real-phone check), live paid-portal test (Matt), grader (Nov 24), legal pages (unpublished until Matt approves), support email (pending DNS).

Report each box PASS / FAIL with URL + screenshot for any FAIL.
