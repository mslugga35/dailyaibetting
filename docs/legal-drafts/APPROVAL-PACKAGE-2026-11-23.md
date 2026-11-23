# DailyAI legal approval package (2026-11-23), NOT published

Nothing is published until you approve. The text below is exactly what the site will render (`src/lib/legal/policies.ts`, unchanged since 6577e1f); `[LEGAL NAME]` and `[STATE]` are filled from your answers. Not reviewed by a lawyer.

## 1. Questions only you can answer
| # | Question | Where it appears |
|---|---|---|
| Q1 | **Legal name** of the operator, exactly as it should appear (e.g. your full legal name) | Terms: "operated by [LEGAL NAME]" and "We… mean [LEGAL NAME]" |
| Q2 | **Operator type:** individual (sole proprietor) as written, or a company/LLC (then give its exact registered name) | Terms: "an individual, under the business name DailyAI Betting" |
| Q3 | **Governing state** for the Terms | Terms: "laws of the State of [STATE]" |
| Q4 | **Approve the text** below as is, or list changes | all three policies |
| Q5 | **Optional addition** (recommended once the DailyAI portal is active, since customers can no longer edit their email there): add to Privacy → "Keeping and deleting your data": *"To change the email address on your account, email support@dailyaibetting.com from that address."* Yes / no | Privacy |

## 2. Facts in the text, checked against production (2026-11-22/23)
- Founding $9.99/mo for the first 100 paying members, then $19.99/mo; earlier members keep their $20 price: matches live Stripe prices (999 / 1999 / 2000) and the 100-seat cap in code.
- 7-day free trial, first-time subscribers only, one trial per card: matches the checkout and webhook code.
- Card statement shows "DAILYAI": product statement descriptor is DAILYAI; the account prefix makes it read **"MATTHEW MO* DAILYAI"** (account-wide, not changed).
- Cancel at period end, card update and invoices in the Stripe portal: matches both the current and the DailyAI-only portal (TEST-mode probe 10/10).
- support@dailyaibetting.com is the contact in all three policies: **it does not receive mail yet** (DAI-18 waits on the Email Routing step). Publish only after DAI-18 is verified, or accept that the address bounces until then.

## 3. How publishing works (after approval; env only, no build)
Server `.env.local`: `POLICY_LEGAL_NAME=<Q1>`, `POLICY_GOVERNING_STATE=<Q3>`, `POLICY_PAGES_PUBLISHED=true` → `pm2 restart dailyaibetting --update-env` → verify /terms, /privacy, /refund-policy return 200 and show the name/state → then the DailyAI portal can be activated with its legal links (`docs/PORTAL-SWITCH-DAILYAI-2026-11-22.md`). Q2 other than "individual" or Q5 = yes needs a small text change in `policies.ts` (review + deploy) first.

## 4. Final text

## Terms of Service
*Last updated: November 19, 2026*

### Who we are
DailyAI Betting (dailyaibetting.com) is operated by [LEGAL NAME], an individual, under the business name DailyAI Betting. "We" and "us" in these terms mean [LEGAL NAME].

### Who can use DailyAI Betting
You must be at least 21 years old to create an account or subscribe, and you are responsible for following the gambling laws where you live. DailyAI Betting does not take bets, hold money for betting, or act as a sportsbook.

### What the service is
DailyAI Betting publishes sports analysis: consensus counts of what independent handicappers picked, and graded results of those consensus picks. It is information, not betting advice. Past results do not predict future results, nothing on the site guarantees a profit, and you can lose money betting. Our own published record shows the consensus picks losing slightly at standard -110 odds.

Picks come from third-party handicappers and public sources. We group them, count how many cappers agree, and grade the consensus picks from final scores. Data can be late, incomplete or wrong; we correct errors when we find them and we do not promise that every pick, line or result is accurate.

Odds and payouts are not shown for most picks because prices differ by sportsbook. Return-on-investment figures on the Stats page are estimates that assume standard -110 odds.

### Your account
Keep your sign-in email and password secure; you are responsible for activity on your account. One person per account. We may suspend accounts used for abuse, scraping, reselling picks or getting around free-trial limits.

### DailyAI Pro subscription
Pro is a monthly subscription billed through Stripe. The first 100 paying members get the Founding Member price of $9.99/mo; after those spots are gone, new members pay $19.99/mo. Members who joined before the founding offer keep the price they signed up at. Charges show on your card statement with DAILYAI in the description.

First-time members get a 7-day free trial. Your card is charged at the end of the trial unless you cancel before then, and every month after that until you cancel. One free trial per customer: a payment card that was already used for a DailyAI free trial cannot start another, and that second trial is cancelled right away without a charge.

The Founding Member price stays the same for as long as your subscription stays active. If the subscription ends (you cancel and the paid period runs out, or a payment cannot be collected after Stripe's retries), the founding price ends with it, and rejoining later is at the regular price.

Cancellation and refunds are covered in the Refund and Cancellation Policy.

### Acceptable use
Do not copy or resell Pro content in bulk, scrape the site, try to get around access controls, or interfere with the service. Personal use and sharing an individual pick with friends is fine.

### Changes and availability
Features can change. Some features depend on outside services and may be unavailable at times (for example, the AI daily report is not published when its data or model provider is unavailable).

If we change the price of a subscription, we will email affected subscribers before the change takes effect, and you can cancel before then. Founding Member pricing is kept for as long as the founding subscription stays active.

### Limits on our responsibility
The service is provided as is. To the extent the law allows, DailyAI Betting is not responsible for betting losses or for decisions you make based on information on the site.

### Governing law
These terms are governed by the laws of the State of [STATE], except where the law where you live gives you rights that cannot be waived.

### Contact
Questions about these terms: support@dailyaibetting.com.

## Privacy Policy
*Last updated: November 19, 2026*

### What we collect
Account: your email address, and a password if you set one (stored only as a secure hash by our authentication provider). Sign-in links and session cookies keep you signed in.

Subscription: your plan, subscription status and Stripe customer ID. Card details are entered on Stripe's checkout page and never reach our servers. To enforce one free trial per customer we keep a one-way fingerprint of the payment card that Stripe provides, not the card number.

Email list and contact form: the email address (and message) you submit.

Usage: standard server logs (IP address, pages requested, time) and analytics about how the site is used.

### How we use it
To run your account and subscription, send sign-in links and service emails, prevent fraud and trial abuse, answer your messages, and understand which parts of the site are used. If you joined the email list, to send picks and updates; every email has an unsubscribe link.

### Services that process data for us
Supabase (accounts and database), Stripe (payments), Resend (email delivery), Cloudflare (network and security), our hosting provider (servers), Google Analytics (site analytics), Google AdSense (advertising), and HarborSEO (a script that manages site content and search optimization). Google may use cookies to measure and personalize ads; you can manage ad personalization in your Google account settings.

Some links to sportsbooks are affiliate links: if you sign up through one we may earn a commission. The sportsbook may set its own cookies when you click.

We do not sell your personal information.

### Cookies
We use cookies to keep you signed in and to remember basic preferences. Google Analytics and Google AdSense set their own cookies. You can block or delete cookies in your browser; signing in requires them.

### Keeping and deleting your data
You can ask us to delete your account at support@dailyaibetting.com. We keep billing records that we are required to keep for tax and accounting, and Stripe keeps its own payment records.

### Age
DailyAI Betting is for adults 21 and over. We do not knowingly collect information from anyone under 21.

### Contact
Privacy questions or requests: support@dailyaibetting.com.

## Refund and Cancellation Policy
*Last updated: November 19, 2026*

### Free trial
If you cancel before your 7-day free trial ends, you are not charged. Your account page shows the date of the first charge.

### How to cancel
Go to Account, then Manage Subscription. That opens the Stripe billing portal, where you can cancel, update your card and see your invoices. You can also email us and we will cancel for you.

### What cancelling does
Cancelling stops all future charges. You keep Pro until the end of the period you already paid for, then your account moves to the free plan. Your account and email stay active unless you ask us to delete them.

If you are a Founding Member, letting the subscription end also ends the Founding Member price; rejoining later is at the regular price.

### Refunds
Charges are not refunded automatically for a partly used month. If you were charged by mistake, forgot to cancel a trial, or had a problem with the service, email support@dailyaibetting.com with the email on your account and we will review your request.

Nothing in this policy limits any refund rights you have under applicable law.

### Failed payments
If a renewal payment fails, Pro is paused while Stripe retries the card. Updating your card in the billing portal restores access. If the payment cannot be collected after the retries, the subscription ends.
