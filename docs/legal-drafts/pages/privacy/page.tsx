// DRAFT - NOT PUBLISHED. Copy to src/app/privacy/page.tsx after owner/counsel review and fill every [[PLACEHOLDER]].
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | DailyAI Betting',
  alternates: { canonical: 'https://dailyaibetting.com/privacy' },
};

export default function Page() {
  return (
    <div className="container px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-3 text-muted-foreground">{"Effective date: [[EFFECTIVE_DATE]]"}</p>
      <p className="mb-3 text-muted-foreground">{"Controller: [[LEGAL_ENTITY_NAME]], [[MAILING_ADDRESS]]. Contact: [[CONTACT_EMAIL]]"}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"What we collect"}</h2>
      <p className="mb-2">{"Email address | Sign-in by magic link; newsletter signup; checkout | Authenticate you, deliver access emails, send the newsletter you asked for | Supabase (auth, database), Resend (transactional email), [[EMAIL_PROVIDER_FOR_NEWSLETTER]] / automation webhook"}</p>
      <p className="mb-2">{"Subscription and billing status, Stripe customer and subscription IDs | When you subscribe | Grant and manage Pro access | Stripe"}</p>
      <p className="mb-2">{"Payment card details | At checkout | Processed directly by Stripe. We do not receive or store full card numbers. | Stripe"}</p>
      <p className="mb-2">{"Usage data (pages viewed, device and browser information, approximate location from IP) | When you browse, if analytics is enabled in production | Understand and improve the Site | Google Analytics"}</p>
      <p className="mb-2">{"Server logs and security data (IP address, request metadata) | Always | Security, abuse prevention, rate limiting | Hosting provider"}</p>
      <p className="mb-2">{"Messages you send via the contact form | When you submit it | Reply to you | [[CONTACT_FORM_DESTINATION]]"}</p>
      <p className="mb-3 text-muted-foreground">{"We do not sell personal information. We do not collect betting history or sportsbook account details."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"Cookies and local storage"}</h2>
      <ul className="list-disc pl-6 space-y-1">
      <li>{"Authentication/session storage set by Supabase to keep you signed in (essential)."}</li>
      <li>{"Google Analytics cookies (production only, when configured) to measure traffic. [[ANALYTICS_CONSENT_APPROACH: banner or opt-out, per counsel and audience states/countries]]"}</li>
      <li>{"A localStorage entry that limits how often the upgrade popup appears (`dailyai-pro-popup-shown`)."}</li>
      <li>{"Stripe may set cookies on its hosted checkout and portal pages under its own policy."}</li>
      </ul>
      <p className="mb-3 text-muted-foreground">{"You can block cookies in your browser; sign-in and checkout may stop working."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"How we share data"}</h2>
      <p className="mb-3 text-muted-foreground">{"Only with the processors above, to comply with law, or in a business transfer. Affiliate sportsbooks receive data only if you click through and sign up with them, under their own policies."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"Retention"}</h2>
      <p className="mb-3 text-muted-foreground">{"Account and billing records are kept while your account is active and as needed for accounting and legal purposes. Newsletter data is kept until you unsubscribe. [[RETENTION_PERIODS]]"}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"Your choices and rights"}</h2>
      <p className="mb-3 text-muted-foreground">{"You can unsubscribe from marketing email at any time, cancel your subscription in the Stripe portal, and ask us to access, correct or delete your data at [[CONTACT_EMAIL]]. [[CCPA/CPRA and other state-law rights language per counsel]]"}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"Children"}</h2>
      <p className="mb-3 text-muted-foreground">{"The Site is for adults 21 and over. We do not knowingly collect data from anyone under 21; contact us if you believe we have."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"Security"}</h2>
      <p className="mb-3 text-muted-foreground">{"We use reputable processors and standard safeguards. No system is perfectly secure."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"Changes"}</h2>
      <p className="mb-3 text-muted-foreground">{"We will update the effective date when this policy changes."}</p>
    </div>
  );
}
