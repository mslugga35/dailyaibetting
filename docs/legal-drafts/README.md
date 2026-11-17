# Legal / trust page drafts (NOT PUBLISHED)

Status: DRAFT for owner and counsel review. Nothing here is routed, linked, or deployed.

- `terms.md`, `privacy.md`, `responsible-gambling.md`, `about.md`, `affiliate-disclosure.md`: Markdown text tailored to what the code does today.
- `pages/`: Next.js route components kept OUTSIDE `src/app` so they are not built. `pages/FOOTER-LINKS.md` shows the footer change (not applied).
- To publish after review: copy each `pages/<name>/page.tsx` to `src/app/<name>/page.tsx`, fill every `[[PLACEHOLDER]]`, apply the footer links, add the routes to `src/app/sitemap.ts`, run the harness and build.

## Owner fill-ins (all pages)
`[[LEGAL_ENTITY_NAME]]`, `[[ENTITY_TYPE_AND_STATE]]`, `[[MAILING_ADDRESS]]`, `[[CONTACT_EMAIL]]`, `[[GOVERNING_LAW_STATE]]`, `[[VENUE_COUNTY_STATE]]`, `[[EFFECTIVE_DATE]]`, `[[REFUND_POLICY]]`, `[[EMAIL_PROVIDER_FOR_NEWSLETTER]]`, `[[AFFILIATE_PROGRAMS_LIST]]`, `[[ANALYTICS_CONSENT_APPROACH]]`, `[[FOUNDING_MEMBER_TERMS]]`.

## Facts the drafts rely on (verify before publishing)
- Subscriptions are billed through Stripe; cancel and payment-method changes happen in the Stripe customer portal (`/api/billing-portal`). Price and trial terms are described generically ("the price shown at checkout"); a Founding Member rate may apply and is locked while continuously subscribed (pricing workstream owns the exact terms).
- Sign-in is by email magic link (Supabase auth); access emails are sent via Resend.
- Analytics: Google Analytics (gtag) loads only in production when `NEXT_PUBLIC_GA_ID` is set (`src/components/analytics/GoogleAnalytics.tsx`).
- Browser storage: localStorage key `dailyai-pro-popup-shown` (popup timing) plus Supabase auth session storage.
- Newsletter capture (`/api/subscribe`) writes to the `email_subscribers` table and forwards to a sheet webhook and an automation (n8n) welcome email.
- `/sportsbooks` contains affiliate links (`affiliateUrl`).
- Not legal advice. Have counsel review, especially state-by-state gambling content rules, CCPA/CPRA, and subscription auto-renewal laws.
