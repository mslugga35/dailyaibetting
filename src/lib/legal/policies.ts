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

export const POLICY_LAST_UPDATED = 'November 19, 2026';
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

export interface PolicySection { heading: string; paragraphs: string[] }
export interface Policy { slug: string; title: string; summary: string; sections: PolicySection[] }

const founding = formatMonthly(PLANS.founding.cents);
const regular = formatMonthly(PLANS.regular.cents);

export const NO_GUARANTEE =
  'DailyAI Betting publishes sports analysis: consensus counts of what independent handicappers picked, and graded results of those consensus picks. It is information, not betting advice. Past results do not predict future results, nothing on the site guarantees a profit, and you can lose money betting. Our own published record shows the consensus picks losing slightly at standard -110 odds.';

export const TERMS: Policy = {
  slug: 'terms',
  title: 'Terms of Service',
  summary: 'The rules for using DailyAI Betting and the DailyAI Pro subscription.',
  sections: [
    { heading: 'Who can use DailyAI Betting', paragraphs: [
      'You must be at least 21 years old to create an account or subscribe, and you are responsible for following the gambling laws where you live. DailyAI Betting does not take bets, hold money for betting, or act as a sportsbook.',
    ] },
    { heading: 'What the service is', paragraphs: [
      NO_GUARANTEE,
      'Picks come from third-party handicappers and public sources. We group them, count how many cappers agree, and grade the consensus picks from final scores. Data can be late, incomplete or wrong; we correct errors when we find them and we do not promise that every pick, line or result is accurate.',
      'Odds and payouts are not shown for most picks because prices differ by sportsbook. Return-on-investment figures on the Stats page are estimates that assume standard -110 odds.',
    ] },
    { heading: 'Your account', paragraphs: [
      'Keep your sign-in email and password secure; you are responsible for activity on your account. One person per account. We may suspend accounts used for abuse, scraping, reselling picks or getting around free-trial limits.',
    ] },
    { heading: 'DailyAI Pro subscription', paragraphs: [
      `Pro is a monthly subscription billed through Stripe. The first 100 paying members get the Founding Member price of ${founding}; after those spots are gone, new members pay ${regular}. Members who joined before the founding offer keep the price they signed up at. Charges appear on your card statement as DAILYAI.`,
      'First-time members get a 7-day free trial. Your card is charged at the end of the trial unless you cancel before then, and every month after that until you cancel. One free trial per customer: a payment card that was already used for a DailyAI free trial cannot start another, and that second trial is cancelled right away without a charge.',
      'The Founding Member price stays the same for as long as your subscription stays active. If the subscription ends (you cancel and the paid period runs out, or a payment cannot be collected after Stripe\'s retries), the founding price ends with it, and rejoining later is at the regular price.',
      'Cancellation and refunds are covered in the Refund and Cancellation Policy.',
    ] },
    { heading: 'Acceptable use', paragraphs: [
      'Do not copy or resell Pro content in bulk, scrape the site, try to get around access controls, or interfere with the service. Personal use and sharing an individual pick with friends is fine.',
    ] },
    { heading: 'Changes and availability', paragraphs: [
      'Features can change. Some features depend on outside services and may be unavailable at times (for example, the AI daily report is not published when its data or model provider is unavailable).',
      'If we change the price of a subscription, we will email affected subscribers before the change takes effect, and you can cancel before then. Founding Member pricing is kept for as long as the founding subscription stays active.',
    ] },
    { heading: 'Limits on our responsibility', paragraphs: [
      'The service is provided as is. To the extent the law allows, DailyAI Betting is not responsible for betting losses or for decisions you make based on information on the site.',
    ] },
    { heading: 'Contact', paragraphs: [`Questions about these terms: ${SUPPORT_EMAIL}.`] },
  ],
};

/** Terms with the operator and governing-law sections filled from the confirmed values. */
export function termsPolicy(): Policy {
  const op = legalOperator();
  if (!op) return TERMS;
  return {
    ...TERMS,
    sections: [
      { heading: 'Who we are', paragraphs: [op.individual
        ? `DailyAI Betting (dailyaibetting.com) is operated by ${op.name}, an individual, under the business name DailyAI Betting. "We" and "us" in these terms mean ${op.name}.`
        : `DailyAI Betting (dailyaibetting.com) is operated by ${op.name}. "We" and "us" in these terms mean ${op.name}.`] },
      ...TERMS.sections.slice(0, -1),
      { heading: 'Governing law', paragraphs: [`These terms are governed by the laws of the State of ${op.state}, except where the law where you live gives you rights that cannot be waived.`] },
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
      'If you cancel before your 7-day free trial ends, you are not charged. Your account page shows the date of the first charge.',
    ] },
    { heading: 'How to cancel', paragraphs: [
      'Go to Account, then Manage Subscription. That opens the Stripe billing portal, where you can cancel, update your card and see your invoices. You can also email us and we will cancel for you.',
    ] },
    { heading: 'What cancelling does', paragraphs: [
      'Cancelling stops all future charges. You keep Pro until the end of the period you already paid for, then your account moves to the free plan. Your account and email stay active unless you ask us to delete them.',
      'If you are a Founding Member, letting the subscription end also ends the Founding Member price; rejoining later is at the regular price.',
    ] },
    { heading: 'Refunds', paragraphs: [
      `Charges are not refunded automatically for a partly used month. If you were charged by mistake, forgot to cancel a trial, or had a problem with the service, email ${SUPPORT_EMAIL} with the email on your account and we will review your request.`,
      'Nothing in this policy limits any refund rights you have under applicable law.',
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
      'Subscription: your plan, subscription status and Stripe customer ID. Card details are entered on Stripe\'s checkout page and never reach our servers. To enforce one free trial per customer we keep a one-way fingerprint of the payment card that Stripe provides, not the card number.',
      'Email list and contact form: the email address (and message) you submit.',
      'Usage: standard server logs (IP address, pages requested, time) and analytics about how the site is used.',
    ] },
    { heading: 'How we use it', paragraphs: [
      'To run your account and subscription, send sign-in links and service emails, prevent fraud and trial abuse, answer your messages, and understand which parts of the site are used. If you joined the email list, to send picks and updates; every email has an unsubscribe link.',
    ] },
    { heading: 'Services that process data for us', paragraphs: [
      'Supabase (accounts and database), Stripe (payments), Resend (email delivery), Cloudflare (network and security), our hosting provider (servers), Google Analytics (site analytics), and Google AdSense (advertising). Google may use cookies to measure and personalize ads; you can manage ad personalization in your Google account settings.',
      'Some links to sportsbooks are affiliate links: if you sign up through one we may earn a commission. The sportsbook may set its own cookies when you click.',
      'We do not sell your personal information.',
    ] },
    { heading: 'Cookies', paragraphs: [
      'We use cookies to keep you signed in and to remember basic preferences. Google Analytics and Google AdSense set their own cookies. You can block or delete cookies in your browser; signing in requires them.',
    ] },
    { heading: 'Keeping and deleting your data', paragraphs: [
      `You can ask us to delete your account at ${SUPPORT_EMAIL}. We keep billing records that we are required to keep for tax and accounting, and Stripe keeps its own payment records.`,
    ] },
    { heading: 'Age', paragraphs: ['DailyAI Betting is for adults 21 and over. We do not knowingly collect information from anyone under 21.'] },
    { heading: 'Contact', paragraphs: [`Privacy questions or requests: ${SUPPORT_EMAIL}.`] },
  ],
};

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
