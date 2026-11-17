// DRAFT - NOT PUBLISHED. Copy to src/app/affiliate-disclosure/page.tsx after owner/counsel review and fill every [[PLACEHOLDER]].
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure | DailyAI Betting',
  alternates: { canonical: 'https://dailyaibetting.com/affiliate-disclosure' },
};

export default function Page() {
  return (
    <div className="container px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Affiliate Disclosure</h1>
      <p className="mb-3 text-muted-foreground">{"Some links on DailyAI Betting, mainly on the Sportsbooks page, are affiliate links. If you click one and sign up or deposit with that sportsbook, we may receive a commission at no extra cost to you."}</p>
      <ul className="list-disc pl-6 space-y-1">
      <li>{"Affiliate relationships do not change which picks appear or how consensus and grades are calculated."}</li>
      <li>{"Sportsbook listings, bonuses and terms are set by the sportsbooks and can change; read their terms. Eligibility, location and age (21+) rules apply."}</li>
      <li>{"Current affiliate programs: [[AFFILIATE_PROGRAMS_LIST]]"}</li>
      <li>{"Affiliate links should carry `rel=\"sponsored\"`. [[DEV: confirm on /sportsbooks before publishing; the code currently renders `affiliateUrl` links]]"}</li>
      <li>{"Bet responsibly. See the Responsible Gambling page or call 1-800-GAMBLER."}</li>
      <li>{"Questions: [[CONTACT_EMAIL]]"}</li>
      </ul>
    </div>
  );
}
