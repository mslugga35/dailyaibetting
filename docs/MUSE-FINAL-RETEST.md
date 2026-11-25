# Muse final regression: DailyAI production (launch build, 2026-11-24)

Run this ONCE, after Matt says the legal pages are published (that deploy is the launch build).
Read-only: **no payments, no card entry, no subscription changes, no "Run Auto-Grader".** Matt gives you the passwords directly.
Accounts: FREE `+daifree` · PRO `+daipaid` · ADMIN `+daiadmin` (same Gmail as before).

**Step 0:** https://dailyaibetting.com/.well-known/commit-info.json shows **5c4f0ef** (launch build, deployed 2026-11-24 ~21:55 ET). If it shows anything else, stop and report.

## 1. Legal pages (new in this build)
- [ ] /terms, /privacy, /refund-policy, /responsible-gambling all load (200) and show "Last updated November 24, 2026" (or the date Matt gives).
- [ ] /terms "Who we are": operated by **Matthew Morales, an individual doing business as DailyAI Betting**; "Governing law": **State of Florida**.
- [ ] /terms has a **Responsible gambling** section with a working link to /responsible-gambling.
- [ ] /privacy starts with "Who we are" and the support address; it mentions Google Ad Settings and has an "Account changes" section.
- [ ] Footer on any page links all four policies.
- [ ] /refund-policy "Failed payments": Pro access is restored once the outstanding payment is successfully collected.
- [ ] Nowhere does the text say a second trial is "cancelled right away without a charge", or that the record "loses slightly at -110".

## 2. Pricing and checkout entry (signed-in, verified email only)
- [ ] /pricing: Founding **$9.99/month** for the first 100 paying members, regular **$19.99/month**, 7-day trial for first-time customers, seats-left counter. No $20 or $24.99 anywhere.
- [ ] Signed out: /pricing → Founding button → asked to sign in; no Stripe page opens.
- [ ] Signed in as FREE: Founding → Stripe Checkout opens; the name at the top reads **"DailyAI Betting"** (the tab title still reads "Matthew Morales": known, accepted DAI-20, note it, don't fail it). $0.00 due today, 7-day trial, then $9.99/month. **Close the tab. Do not enter a card.** Open Checkout only once.
- [ ] Signed in as PRO: /pricing tells you that you already have Pro / sends you to Account; no second Checkout.

## 3. Account (PRO, look only)
- [ ] /account as PRO: complimentary Pro (no Stripe subscription), no renewal date and **no** Manage Subscription button. The paid-member portal is Matt's own live test.

## 4. Feature accuracy (AI generation is paused at launch)
- [ ] /daily-ai-picks says the daily AI report is **temporarily paused** (with the last published date). It must not show an old report as today's and must not promise a time it will appear.
- [ ] The home page badge reads "Expert Consensus Picks" (not "AI-Powered Picks"); /daily-bets header reads "Daily Consensus Analysis".
- [ ] /blog: today's recap "Consensus Picks Today (Nov 24, 2026)…" loads; its note at the bottom says it is generated automatically from tracked picks (no "written with AI").
- [ ] /advertise: no newsletter sponsorship offered.

## 5. Regression spot checks (unchanged areas)
- [ ] Sign-in link for FREE works (one email, its own conversation, the sent time shown).
- [ ] /, /results, /stats load; the disclosure box wording is unchanged from your 11-20 run; /props loads.
- [ ] Footer "Contact" / support address reads support@dailyaibetting.com.

## Not in scope
Mobile menu (Matt's real-phone check), live paid-portal test (Matt), grader (verified 11-24), welcome-email delivery (deferred), support inbox delivery (verified 11-24), non-personalized ads/consent defaults (not visible on the page), Gmail "Send mail as" (deferred).

Report each box PASS / FAIL with URL + screenshot for any FAIL.

## 6. Evidence request: the $24.99 note from your 11-22 run (DAI-21)
We found no $24.99 anywhere (code, server, 13 live pages, Stripe prices). Send the exact URL/step and a screenshot if you have one, or say you can't find it again (we'll close it as a note typo).
