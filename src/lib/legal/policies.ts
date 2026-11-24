/**
 * Policy page content. Plain language that only restates how the service actually
 * works today (billing rules come from src/lib/pricing/plans.ts and the Stripe setup).
 *
 * Terms, Privacy and Refund pages stay unpublished (404, no footer link) until the
 * owner approves the wording and sets POLICY_PAGES_PUBLISHED=true on the server.
 * The responsible-gambling page only states facts already shown across the site and
 * is always published. Nothing here has been reviewed by a lawyer; it must not say so.
 */
import { PLANS, formatMonthly } from '@/lib/pricing/plans';

export const POLICY_LAST_UPDATED = 'November 24, 2026';
export const SUPPORT_EMAIL = 'support@dailyaibetting.com';
export const HELPLINE = '1-800-GAMBLER';

/** The operator's legal name and governing state: owner-confirmed values, set on the server. */
export function legalOperator(): { name: string; state: string; individual: boolean } | null {
  const name = (process.env.POLICY_LEGAL_NAME || '').trim();
  const state = (process.env.POLICY_GOVERNING_STATE || '').trim();
  // POLICY_OPERATOR_TYPE=individual: a person trading as DailyAI Betting (not a company).
  const individual = (process.env.POLICY_OPERATOR_TYPE || '').trim().toLowerCase() === 'individual';
  return name && state ? { name, state, individual } : null;
}

/**
 * Published only when the owner has approved the wording (POLICY_PAGES_PUBLISHED=true)
 * AND the legal name and governing state are configured, so the pages can never go
 * live with those blanks.
 */
export function policiesPublished(): boolean {
  return (process.env.POLICY_PAGES_PUBLISHED || '').trim().toLowerCase() === 'true' && legalOperator() !== null;
}

export interface PolicySection { heading: string; paragraphs: string[]; links?: { href: string; label: string }[] }
export interface Policy { slug: string; title: string; summary: string; sections: PolicySection[] }

const founding = formatMonthly(PLANS.founding.cents);
const regular = formatMonthly(PLANS.regular.cents);

export const NO_GUARANTEE =
  'Past performance does not guarantee future results. All wagering involves risk, including the possible loss of the entire amount wagered. Historical win rates and estimated returns should not be interpreted as guarantees of profitability. Where applicable, estimated returns use disclosed assumptions and may not reflect actual sportsbook odds.';

/** Service description (owner correction T3). */
export const SERVICE_DESCRIPTION =
  'DailyAI Betting provides sports information, consensus analysis, historical results and other analytical content. We do not accept wagers, hold funds for wagering or operate as a sportsbook. Content is provided for informational and entertainment purposes only and does not constitute financial or professional betting advice.';

export const TERMS: Policy = {
  slug: 'terms',
  title: 'Terms of Service',
  summary: 'The rules for using DailyAI Betting and the DailyAI Pro subscription.',
  sections: [
    { heading: 'Who can use DailyAI Betting', paragraphs: [
      'You must be at least 21 years old to create an account or subscribe, and you are responsible for following the gambling laws where you live.',
    ] },
    { heading: 'What the service is', paragraphs: [
      SERVICE_DESCRIPTION,
      NO_GUARANTEE,
      'Picks come from third-party handicappers and public sources. We group them, count how many cappers agree, and grade the consensus picks from final scores. Data can be late, incomplete or wrong; we correct errors when we find them and we do not promise that every pick, line or result is accurate.',
      'Odds and payouts are not shown for most picks because prices differ by sportsbook. Return-on-investment figures on the Stats page are estimates that assume standard -110 odds.',
    ] },
    { heading: 'Your account', paragraphs: [
      'Keep your sign-in email and password secure; you are responsible for activity on your account. One person per account. We may suspend accounts used for abuse, scraping, reselling picks or getting around free-trial limits.',
    ] },
    { heading: 'DailyAI Pro subscription', paragraphs: [
      `Pro is a monthly subscription billed through Stripe. The first 100 paying members get the Founding Member price of ${founding}; after those spots are gone, new members pay ${regular}. Members who joined before the founding offer keep the price they signed up at. Charges show on your card statement with DAILYAI in the description.`,
      'Eligible first-time subscribers receive a seven-day free trial. Unless cancelled before the trial ends, the subscription automatically converts into a paid monthly subscription at the price disclosed during checkout.',
      'Subscriptions automatically renew each month until cancelled. The applicable price, billing frequency and trial terms are disclosed before purchase.',
      'Free trials are limited to eligible first-time customers. We may deny or cancel duplicate or ineligible trials and take reasonable steps to prevent trial abuse.',
      'The Founding Member price stays the same for as long as your subscription stays active. If the subscription ends (you cancel and the paid period runs out, or a payment cannot be collected after Stripe\'s retries), the founding price ends with it, and rejoining later is at the regular price.',
      'Cancellation and refunds are covered in the Refund and Cancellation Policy.',
    ] },
    { heading: 'Acceptable use', paragraphs: [
      'Do not copy or resell Pro content in bulk, scrape the site, try to get around access controls, or interfere with the service. Personal use and sharing an individual pick with friends is fine.',
    ] },
    { heading: 'Changes and availability', paragraphs: [
      'Features and content may change or become temporarily unavailable due to data-provider outages, technical maintenance or other service limitations. AI-generated reports and picks are available only when the required systems and data are operational. Unavailable or outdated content will not be knowingly represented as current.',
      'If we change the price of a subscription, we will email affected subscribers before the change takes effect, and you can cancel before then. Founding Member pricing is kept for as long as the founding subscription stays active.',
    ] },
    { heading: 'Limits on our responsibility', paragraphs: [
      'The service is provided as is. To the extent the law allows, DailyAI Betting is not responsible for betting losses or for decisions you make based on information on the site.',
    ] },
    { heading: 'Responsible gambling', paragraphs: [
      'DailyAI Betting is intended for adults aged 21 and older. Never wager more than you can afford to lose. Gambling is not a reliable source of income. If gambling becomes a problem, seek assistance through the responsible gambling resources linked on our website.',
    ], links: [{ href: '/responsible-gambling', label: 'Responsible gambling resources' }] },
    { heading: 'Contact', paragraphs: [`Questions about these terms: ${SUPPORT_EMAIL}.`] },
  ],
};

/** Operator statement (owner Q1/Q2: an individual doing business as DailyAI Betting). */
export function operatorSentence(op: { name: string; individual: boolean }): string {
  return op.individual
    ? `DailyAI Betting (dailyaibetting.com) is operated by ${op.name}, an individual doing business as DailyAI Betting. References to "we," "us," and "our" mean ${op.name} operating as DailyAI Betting.`
    : `DailyAI Betting (dailyaibetting.com) is operated by ${op.name}. References to "we," "us," and "our" mean ${op.name}.`;
}

/** Terms with the operator and governing-law sections filled from the confirmed values. */
export function termsPolicy(): Policy {
  const op = legalOperator();
  if (!op) return TERMS;
  return {
    ...TERMS,
    sections: [
      { heading: 'Who we are', paragraphs: [operatorSentence(op)] },
      ...TERMS.sections.slice(0, -1),
      { heading: 'Governing law', paragraphs: [`These terms are governed by the laws of the State of ${op.state}, except where applicable law provides consumer rights that cannot be waived.`] },
      TERMS.sections[TERMS.sections.length - 1],
    ],
  };
}

export const REFUNDS: Policy = {
  slug: 'refund-policy',
  title: 'Refund and Cancellation Policy',
  summary: 'How to cancel DailyAI Pro, what happens when you do, and how refund requests work.',
  sections: [
    { heading: 'Free trial', paragraphs: [
      'Cancel before the trial ends to avoid the first subscription charge. Your account and billing portal provide applicable subscription and billing information.',
    ] },
    { heading: 'How to cancel', paragraphs: [
      `You may cancel online through Account → Manage Subscription or request assistance by emailing ${SUPPORT_EMAIL}. Manage Subscription opens the Stripe billing portal, where you can also update your card and see your invoices.`,
      'Cancellation prevents future subscription renewals once processed. Previously incurred charges are not automatically reversed.',
    ] },
    { heading: 'What cancelling does', paragraphs: [
      'For paid subscriptions, access continues through the applicable paid billing period. For trial subscriptions, access continues until the trial ends unless the subscription is terminated earlier under the applicable trial terms. Afterwards your account moves to the free plan. Your account and email stay active unless you ask us to delete them.',
      'If you are a Founding Member, letting the subscription end also ends the Founding Member price; rejoining later is at the regular price.',
    ] },
    { heading: 'Refunds', paragraphs: [
      `Subscription charges are generally not automatically refunded for partially used billing periods. If you believe a charge was incorrect, unauthorized or resulted from a service issue, contact ${SUPPORT_EMAIL}.`,
      'Refund requests are reviewed individually. Nothing in this policy limits refund or other consumer rights provided by applicable law.',
    ] },
    { heading: 'Failed payments', paragraphs: [
      'If a renewal payment fails, Pro is paused while Stripe retries the card. Updating your card in the billing portal restores access. If the payment cannot be collected after the retries, the subscription ends.',
    ] },
  ],
};

export const PRIVACY: Policy = {
  slug: 'privacy',
  title: 'Privacy Policy',
  summary: 'What information DailyAI Betting collects, why, and who processes it.',
  sections: [
    { heading: 'What we collect', paragraphs: [
      'Account: your email address, and a password if you set one (stored only as a secure hash by our authentication provider). Sign-in links and session cookies keep you signed in.',
      'Subscription: your plan and subscription status. Payment card details are processed by Stripe and do not pass through our application servers. We may retain payment identifiers and card fingerprints supplied by our payment processor to administer subscriptions and prevent duplicate trials and fraud.',
      'Email list and contact form: the email address (and message) you submit.',
      'Usage: standard server logs (IP address, pages requested, time) and analytics about how the site is used.',
    ] },
    { heading: 'How we use it', paragraphs: [
      'To run your account and subscription, send sign-in links and service emails, prevent fraud and trial abuse, answer your messages, and understand which parts of the site are used. If you joined the email list, to send picks and updates.',
    ] },
    { heading: 'Services that process data for us', paragraphs: [
      'Supabase (accounts and database), Stripe (payments), Resend (email delivery), Cloudflare (network and security), our hosting provider (servers), Google Analytics (site analytics), Google AdSense (advertising), and HarborSEO (a script that manages site content and search optimization).',
      'We use analytics and advertising services that may collect information through cookies and similar technologies. These services may use browsing information to measure website usage, deliver advertising and personalize advertisements, subject to applicable law and available privacy choices. You may manage applicable advertising preferences through Google Ad Settings (adssettings.google.com) and your browser\'s cookie settings.',
      'Some links to sportsbooks are affiliate links: if you sign up through one we may earn a commission. The sportsbook may set its own cookies when you click.',
      'We do not sell account email addresses or payment information for money. Advertising and analytics activities may constitute sharing or targeted advertising under applicable privacy laws. Where required by law, users may exercise applicable access, correction, deletion and opt-out rights by contacting us.',
    ] },
    { heading: 'Cookies', paragraphs: [
      'We use cookies to keep you signed in and to remember basic preferences. Google Analytics and Google AdSense set their own cookies. You can block or delete cookies in your browser; signing in requires them.',
    ] },
    { heading: 'Account changes', paragraphs: [
      `To request a change to your account email address, contact ${SUPPORT_EMAIL}. We may require verification of your identity and account ownership before making the change.`,
    ] },
    { heading: 'Keeping and deleting your data', paragraphs: [
      'We retain personal information only as reasonably necessary to provide our services, administer subscriptions, prevent fraud, resolve disputes and comply with legal obligations.',
      `Users may request deletion of their accounts and associated personal information at ${SUPPORT_EMAIL}, subject to applicable legal retention requirements. We keep billing records that we are required to keep for tax and accounting, and Stripe keeps its own payment records.`,
    ] },
    { heading: 'Email communications', paragraphs: [
      'Marketing emails include an unsubscribe mechanism. Essential account, security and billing communications may still be sent when necessary to administer your account.',
    ] },
    { heading: 'Age', paragraphs: ['DailyAI Betting is for adults 21 and over. We do not knowingly collect information from anyone under 21.'] },
    { heading: 'Contact', paragraphs: [`Privacy questions or requests: ${SUPPORT_EMAIL}.`] },
  ],
};

/** Privacy policy with the operator stated (owner Q1/Q2). */
export function privacyPolicy(): Policy {
  const op = legalOperator();
  if (!op) return PRIVACY;
  return { ...PRIVACY, sections: [{ heading: 'Who we are', paragraphs: [`${operatorSentence(op)} Contact: ${SUPPORT_EMAIL}.`] }, ...PRIVACY.sections] };
}

export const RESPONSIBLE: Policy = {
  slug: 'responsible-gambling',
  title: 'Responsible Gambling',
  summary: 'DailyAI Betting is for adults 21+. Bet only what you can afford to lose.',
  sections: [
    { heading: 'Our picks are analysis, not guarantees', paragraphs: [NO_GUARANTEE] },
    { heading: '21+ only', paragraphs: [
      'You must be 21 or older to use DailyAI Betting, and sports betting is legal only in some places. Check the law where you live before you bet.',
    ] },
    { heading: 'Keep it fun', paragraphs: [
      'Set a budget before you bet and stick to it. Never chase losses, never bet money you need for bills, and take breaks. A consensus pick with many cappers behind it can still lose.',
    ] },
    { heading: 'Get help', paragraphs: [
      `If gambling is causing problems for you or someone you know, call or text ${HELPLINE} (1-800-426-2537) for free, confidential help, 24/7. More resources: National Council on Problem Gambling, ncpgambling.org.`,
      `To close your DailyAI account or stop all emails, write to ${SUPPORT_EMAIL}.`,
    ] },
  ],
};

export const ALL_POLICIES = [TERMS, PRIVACY, REFUNDS, RESPONSIBLE];
