# DailyAI legal approval package — FINAL (2026-11-24), NOT published

The text in section 4 is generated from the code that will render the pages (`src/lib/legal/policies.ts`, commit 9a01a8e,
rendered by `qa/launch-verify/render-policies-md.mjs`), with your confirmed values: Q1 **Matthew Morales**, Q2 **individual doing
business as DailyAI Betting**, Q3 **Florida**, Q5 **yes** (email changes through support). No business address is stated.
Not reviewed by a lawyer.

## 1. What changed from the 2026-11-23 package (your corrections, applied as written)
- Terms: Who we are (T1), Governing law (T2), Service description (T3), Performance disclosure (T4, the fixed "-110 record" sentence removed; the Stats page keeps its own figures), Free trial + automatic renewal (T6), Feature availability (T7), new Responsible gambling section with a link to /responsible-gambling (T8). Pricing text unchanged (T5).
- Privacy: operator + contact (P1), payment information (P2), advertising and analytics (P3), personal information (P4), account changes (P5), data retention (P6), email communications (P7).
- Refunds: free trial (R1), cancellation (R2), access after cancellation (R3), refunds (R4). Failed payments unchanged.
- Effective date: November 24, 2026 (change it if publication slips past today).

## 2. Statements checked against the implementation
| Statement | Implementation | Result |
|---|---|---|
| Card details processed by Stripe, not our servers; card fingerprints + payment identifiers retained | Stripe Checkout; webhook stores the Stripe customer id and claims the card fingerprint (`dailyai_claim_trial_fingerprint`) | matches |
| "We may deny or cancel duplicate or ineligible trials" | duplicate-trial auto-cancel is OFF in production (`DAI_AUTO_CANCEL_DUPLICATE_TRIAL` unset); alerts + fingerprint checks exist | matches; the old promise "cancelled right away without a charge" is removed |
| Cancel via Account → Manage Subscription; access to end of paid period / trial end | Stripe portal cancels at period end (no proration); trial cancel keeps access to trial end | matches |
| $9.99 founding (first 100), $19.99 regular, grandfathered $20 | live Stripe prices 999 / 1999 / 2000, 100-seat cap in code | matches |
| Analytics + advertising with cookies; Google Ad Settings | Google Analytics + Google AdSense scripts in the site layout | matches |
| Marketing emails have an unsubscribe | welcome email has one-click + page unsubscribe; no daily newsletter is active | matches |

## 3. Genuine factual conflicts needing your decision
1. **No on-site privacy/consent control exists.** The site runs Google AdSense (which can personalize ads) and Google Analytics, but there is no cookie banner or "Do Not Sell or Share" control. The text therefore points only to Google Ad Settings, browser cookie settings, and email requests to support. Decision: **accept this for launch** (post-launch item: add a consent tool), or switch AdSense to non-personalized ads before launch.
2. **support@dailyaibetting.com does not receive mail yet** (checked 2026-11-24: Cloudflare answers "550 Address does not exist" for support@ and advertise@). You asked not to publish until support delivery is verified, so publication waits for the Email Routing rules.

## 4. How publishing works (after your approval)
1. Deploy commit 9a01a8e (it also updates the always-public Responsible Gambling page text, so it ships only at publication).
2. Server `.env.local`: `POLICY_LEGAL_NAME=Matthew Morales`, `POLICY_GOVERNING_STATE=Florida`, `POLICY_OPERATOR_TYPE=individual`, `POLICY_PAGES_PUBLISHED=true` → `pm2 restart dailyaibetting --update-env`.
3. Verify /terms, /privacy, /refund-policy return 200 with the operator text, and the footer shows all four links.
4. Activate the DailyAI-only billing portal configuration (prepared: `docs/PORTAL-SWITCH-DAILYAI-2026-11-22.md`).

## 5. Final text (exactly as the site will render it)

## Terms of Service
*Last updated: November 24, 2026* · URL: https://dailyaibetting.com/terms

### Who we are
DailyAI Betting (dailyaibetting.com) is operated by Matthew Morales, an individual doing business as DailyAI Betting. References to "we," "us," and "our" mean Matthew Morales operating as DailyAI Betting.

### Who can use DailyAI Betting
You must be at least 21 years old to create an account or subscribe, and you are responsible for following the gambling laws where you live.

### What the service is
DailyAI Betting provides sports information, consensus analysis, historical results and other analytical content. We do not accept wagers, hold funds for wagering or operate as a sportsbook. Content is provided for informational and entertainment purposes only and does not constitute financial or professional betting advice.

Past performance does not guarantee future results. All wagering involves risk, including the possible loss of the entire amount wagered. Historical win rates and estimated returns should not be interpreted as guarantees of profitability. Where applicable, estimated returns use disclosed assumptions and may not reflect actual sportsbook odds.

Picks come from third-party handicappers and public sources. We group them, count how many cappers agree, and grade the consensus picks from final scores. Data can be late, incomplete or wrong; we correct errors when we find them and we do not promise that every pick, line or result is accurate.

Odds and payouts are not shown for most picks because prices differ by sportsbook. Return-on-investment figures on the Stats page are estimates that assume standard -110 odds.

### Your account
Keep your sign-in email and password secure; you are responsible for activity on your account. One person per account. We may suspend accounts used for abuse, scraping, reselling picks or getting around free-trial limits.

### DailyAI Pro subscription
Pro is a monthly subscription billed through Stripe. The first 100 paying members get the Founding Member price of $9.99/mo; after those spots are gone, new members pay $19.99/mo. Members who joined before the founding offer keep the price they signed up at. Charges show on your card statement with DAILYAI in the description.

Eligible first-time subscribers receive a seven-day free trial. Unless cancelled before the trial ends, the subscription automatically converts into a paid monthly subscription at the price disclosed during checkout.

Subscriptions automatically renew each month until cancelled. The applicable price, billing frequency and trial terms are disclosed before purchase.

Free trials are limited to eligible first-time customers. We may deny or cancel duplicate or ineligible trials and take reasonable steps to prevent trial abuse.

The Founding Member price stays the same for as long as your subscription stays active. If the subscription ends (you cancel and the paid period runs out, or a payment cannot be collected after Stripe's retries), the founding price ends with it, and rejoining later is at the regular price.

Cancellation and refunds are covered in the Refund and Cancellation Policy.

### Acceptable use
Do not copy or resell Pro content in bulk, scrape the site, try to get around access controls, or interfere with the service. Personal use and sharing an individual pick with friends is fine.

### Changes and availability
Features and content may change or become temporarily unavailable due to data-provider outages, technical maintenance or other service limitations. AI-generated reports and picks are available only when the required systems and data are operational. Unavailable or outdated content will not be knowingly represented as current.

If we change the price of a subscription, we will email affected subscribers before the change takes effect, and you can cancel before then. Founding Member pricing is kept for as long as the founding subscription stays active.

### Limits on our responsibility
The service is provided as is. To the extent the law allows, DailyAI Betting is not responsible for betting losses or for decisions you make based on information on the site.

### Responsible gambling
DailyAI Betting is intended for adults aged 21 and older. Never wager more than you can afford to lose. Gambling is not a reliable source of income. If gambling becomes a problem, seek assistance through the responsible gambling resources linked on our website.

[Responsible gambling resources](https://dailyaibetting.com/responsible-gambling)

### Governing law
These terms are governed by the laws of the State of Florida, except where applicable law provides consumer rights that cannot be waived.

### Contact
Questions about these terms: support@dailyaibetting.com.

## Privacy Policy
*Last updated: November 24, 2026* · URL: https://dailyaibetting.com/privacy

### Who we are
DailyAI Betting (dailyaibetting.com) is operated by Matthew Morales, an individual doing business as DailyAI Betting. References to "we," "us," and "our" mean Matthew Morales operating as DailyAI Betting. Contact: support@dailyaibetting.com.

### What we collect
Account: your email address, and a password if you set one (stored only as a secure hash by our authentication provider). Sign-in links and session cookies keep you signed in.

Subscription: your plan and subscription status. Payment card details are processed by Stripe and do not pass through our application servers. We may retain payment identifiers and card fingerprints supplied by our payment processor to administer subscriptions and prevent duplicate trials and fraud.

Email list and contact form: the email address (and message) you submit.

Usage: standard server logs (IP address, pages requested, time) and analytics about how the site is used.

### How we use it
To run your account and subscription, send sign-in links and service emails, prevent fraud and trial abuse, answer your messages, and understand which parts of the site are used. If you joined the email list, to send picks and updates.

### Services that process data for us
Supabase (accounts and database), Stripe (payments), Resend (email delivery), Cloudflare (network and security), our hosting provider (servers), Google Analytics (site analytics), Google AdSense (advertising), and HarborSEO (a script that manages site content and search optimization).

We use analytics and advertising services that may collect information through cookies and similar technologies. These services may use browsing information to measure website usage, deliver advertising and personalize advertisements, subject to applicable law and available privacy choices. You may manage applicable advertising preferences through Google Ad Settings (adssettings.google.com) and your browser's cookie settings.

Some links to sportsbooks are affiliate links: if you sign up through one we may earn a commission. The sportsbook may set its own cookies when you click.

We do not sell account email addresses or payment information for money. Advertising and analytics activities may constitute sharing or targeted advertising under applicable privacy laws. Where required by law, users may exercise applicable access, correction, deletion and opt-out rights by contacting us.

### Cookies
We use cookies to keep you signed in and to remember basic preferences. Google Analytics and Google AdSense set their own cookies. You can block or delete cookies in your browser; signing in requires them.

### Account changes
To request a change to your account email address, contact support@dailyaibetting.com. We may require verification of your identity and account ownership before making the change.

### Keeping and deleting your data
We retain personal information only as reasonably necessary to provide our services, administer subscriptions, prevent fraud, resolve disputes and comply with legal obligations.

Users may request deletion of their accounts and associated personal information at support@dailyaibetting.com, subject to applicable legal retention requirements. We keep billing records that we are required to keep for tax and accounting, and Stripe keeps its own payment records.

### Email communications
Marketing emails include an unsubscribe mechanism. Essential account, security and billing communications may still be sent when necessary to administer your account.

### Age
DailyAI Betting is for adults 21 and over. We do not knowingly collect information from anyone under 21.

### Contact
Privacy questions or requests: support@dailyaibetting.com.

## Refund and Cancellation Policy
*Last updated: November 24, 2026* · URL: https://dailyaibetting.com/refund-policy

### Free trial
Cancel before the trial ends to avoid the first subscription charge. Your account and billing portal provide applicable subscription and billing information.

### How to cancel
You may cancel online through Account → Manage Subscription or request assistance by emailing support@dailyaibetting.com. Manage Subscription opens the Stripe billing portal, where you can also update your card and see your invoices.

Cancellation prevents future subscription renewals once processed. Previously incurred charges are not automatically reversed.

### What cancelling does
For paid subscriptions, access continues through the applicable paid billing period. For trial subscriptions, access continues until the trial ends unless the subscription is terminated earlier under the applicable trial terms. Afterwards your account moves to the free plan. Your account and email stay active unless you ask us to delete them.

If you are a Founding Member, letting the subscription end also ends the Founding Member price; rejoining later is at the regular price.

### Refunds
Subscription charges are generally not automatically refunded for partially used billing periods. If you believe a charge was incorrect, unauthorized or resulted from a service issue, contact support@dailyaibetting.com.

Refund requests are reviewed individually. Nothing in this policy limits refund or other consumer rights provided by applicable law.

### Failed payments
If a renewal payment fails, Pro is paused while Stripe retries the card. Updating your card in the billing portal restores access. If the payment cannot be collected after the retries, the subscription ends.

## Responsible Gambling
*Last updated: November 24, 2026* · URL: https://dailyaibetting.com/responsible-gambling

### Our picks are analysis, not guarantees
Past performance does not guarantee future results. All wagering involves risk, including the possible loss of the entire amount wagered. Historical win rates and estimated returns should not be interpreted as guarantees of profitability. Where applicable, estimated returns use disclosed assumptions and may not reflect actual sportsbook odds.

### 21+ only
You must be 21 or older to use DailyAI Betting, and sports betting is legal only in some places. Check the law where you live before you bet.

### Keep it fun
Set a budget before you bet and stick to it. Never chase losses, never bet money you need for bills, and take breaks. A consensus pick with many cappers behind it can still lose.

### Get help
If gambling is causing problems for you or someone you know, call or text 1-800-GAMBLER (1-800-426-2537) for free, confidential help, 24/7. More resources: National Council on Problem Gambling, ncpgambling.org.

To close your DailyAI account or stop all emails, write to support@dailyaibetting.com.

