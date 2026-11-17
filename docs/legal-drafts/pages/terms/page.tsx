// DRAFT - NOT PUBLISHED. Copy to src/app/terms/page.tsx after owner/counsel review and fill every [[PLACEHOLDER]].
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | DailyAI Betting',
  alternates: { canonical: 'https://dailyaibetting.com/terms' },
};

export default function Page() {
  return (
    <div className="container px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <p className="mb-3 text-muted-foreground">{"Effective date: [[EFFECTIVE_DATE]]"}</p>
      <p className="mb-3 text-muted-foreground">{"Operator: [[LEGAL_ENTITY_NAME]], [[ENTITY_TYPE_AND_STATE]], [[MAILING_ADDRESS]]. Contact: [[CONTACT_EMAIL]]"}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"1. What DailyAI Betting is"}</h2>
      <p className="mb-3 text-muted-foreground">{"DailyAI Betting (\"the Site\") aggregates picks from sports handicappers (\"cappers\"), shows where multiple cappers agree (\"consensus\"), and publishes graded results and AI-assisted articles. The Site is an information and entertainment service. It is not a sportsbook, does not accept or place bets, and is not a gambling operator."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"2. No advice, no guarantees"}</h2>
      <p className="mb-3 text-muted-foreground">{"Picks, consensus counts, tiers (for example MEGA or NUCLEAR), grades, win rates, ROI figures, AI reports and blog articles are informational only. They are not betting, financial, tax or legal advice. Consensus means several cappers chose the same pick; it does not predict an outcome. Past results do not guarantee future results. You can lose money. Nothing on the Site promises profit."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"3. Eligibility and legality"}</h2>
      <p className="mb-3 text-muted-foreground">{"You must be at least 21 years old (or the legal gambling age where you are, if higher) to use the Site. You are solely responsible for knowing and obeying the laws where you live. Sports betting is not legal everywhere. If gambling is a problem for you, see the Responsible Gambling page; in the US call 1-800-GAMBLER."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"4. Accounts"}</h2>
      <p className="mb-3 text-muted-foreground">{"You sign in with an email magic link. Keep access to your email secure; you are responsible for activity on your account. We may suspend accounts that abuse the Site (scraping, resale, credential sharing, circumventing paywalls or rate limits)."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"5. DailyAI Pro subscriptions"}</h2>
      <ul className="list-disc pl-6 space-y-1">
      <li>{"Pro is a recurring subscription billed through Stripe at the price shown at checkout. [[FOUNDING_MEMBER_TERMS: rate, member cap, and that the rate is locked while the subscription stays continuously active, if the owner adopts this]]"}</li>
      <li>{"New members may receive a free trial (currently 7 days, first-time subscribers only). When the trial ends the subscription converts to a paid plan unless cancelled before the trial ends."}</li>
      <li>{"Subscriptions renew automatically each billing period until cancelled."}</li>
      <li>{"Cancel or update your card any time in the Stripe customer portal (Account page, \"Manage Subscription\"). Cancellation takes effect at the end of the paid period; you keep Pro until then."}</li>
      <li>{"Refunds: [[REFUND_POLICY]]."}</li>
      <li>{"We may change prices or features with notice shown before your next renewal. Features described on the Site reflect what Pro includes today and may change."}</li>
      <li>{"If a payment fails, Pro access may be suspended until payment is fixed."}</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"6. Content and intellectual property"}</h2>
      <p className="mb-3 text-muted-foreground">{"The Site, its layout, consensus data and articles are owned by [[LEGAL_ENTITY_NAME]] or its licensors. Picks originate with third-party cappers and are shown for informational purposes. You may view the Site for personal use; you may not copy, scrape, redistribute or resell it without written permission."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"7. Third-party links and affiliate relationships"}</h2>
      <p className="mb-3 text-muted-foreground">{"The Site links to third-party sportsbooks and sites. Some links are affiliate links and we may be paid if you sign up (see Affiliate Disclosure). We do not control and are not responsible for third-party services or their terms."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"8. AI-assisted content"}</h2>
      <p className="mb-3 text-muted-foreground">{"Some content is generated or assisted by AI and may contain errors or outdated information. Verify anything important before relying on it."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"9. Availability"}</h2>
      <p className="mb-3 text-muted-foreground">{"The Site is provided \"as is\" and \"as available\". Data is collected from external sources and may be delayed, incomplete or wrong; scheduled reports may not publish on a given day."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"10. Disclaimers and limits of liability"}</h2>
      <p className="mb-3 text-muted-foreground">{"To the fullest extent permitted by law, we disclaim all warranties, and [[LEGAL_ENTITY_NAME]] is not liable for betting losses or indirect, incidental or consequential damages. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim. [[COUNSEL: confirm enforceability by state]]"}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"11. Governing law and disputes"}</h2>
      <p className="mb-3 text-muted-foreground">{"These Terms are governed by the laws of [[GOVERNING_LAW_STATE]]. Disputes will be brought in the courts located in [[VENUE_COUNTY_STATE]] [[OR: arbitration clause, if counsel recommends]]."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"12. Changes and contact"}</h2>
      <p className="mb-3 text-muted-foreground">{"We may update these Terms; the effective date above will change. Questions: [[CONTACT_EMAIL]]."}</p>
    </div>
  );
}
