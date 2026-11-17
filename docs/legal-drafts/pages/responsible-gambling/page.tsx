// DRAFT - NOT PUBLISHED. Copy to src/app/responsible-gambling/page.tsx after owner/counsel review and fill every [[PLACEHOLDER]].
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Responsible Gambling | DailyAI Betting',
  alternates: { canonical: 'https://dailyaibetting.com/responsible-gambling' },
};

export default function Page() {
  return (
    <div className="container px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Responsible Gambling</h1>
      <p className="mb-3 text-muted-foreground">{"DailyAI Betting is for entertainment and information only. We are not a sportsbook, we do not take bets, and nothing here is a guarantee of profit. Most people who bet lose money over time."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"If you choose to bet"}</h2>
      <ul className="list-disc pl-6 space-y-1">
      <li>{"You must be 21 or older (or the legal age where you live, if higher). Betting is not legal in every state or country; know your local law."}</li>
      <li>{"Only bet money you can afford to lose. Set deposit and loss limits before you start and stick to them."}</li>
      <li>{"Never chase losses. A pick being popular (\"consensus\") does not make it likely to win."}</li>
      <li>{"Treat picks, grades and AI articles as one input, not advice."}</li>
      <li>{"Take breaks. Do not bet when stressed, angry, impaired, or to solve money problems."}</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"Warning signs"}</h2>
      <p className="mb-3 text-muted-foreground">{"Betting more than planned, hiding it, borrowing to bet, feeling anxious or irritable when not betting, or neglecting work and relationships."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"Get help (US)"}</h2>
      <ul className="list-disc pl-6 space-y-1">
      <li>{"National Problem Gambling Helpline: "}<strong>{"1-800-GAMBLER"}</strong>{" (1-800-426-2537), 24/7, free and confidential. Text and chat options at ncpgambling.org."}</li>
      <li>{"Most licensed sportsbooks offer deposit limits, cool-off periods and self-exclusion in account settings; use them."}</li>
      <li>{"Gamblers Anonymous: gamblersanonymous.org"}</li>
      <li>{"[[OWNER: add state-specific helplines for target states, and non-US resources if the audience requires]]"}</li>
      </ul>
      <p className="mb-3 text-muted-foreground">{"If you are in crisis or thinking of harming yourself, call or text 988 (US)."}</p>
    </div>
  );
}
