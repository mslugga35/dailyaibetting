// DRAFT - NOT PUBLISHED. Copy to src/app/about/page.tsx after owner/counsel review and fill every [[PLACEHOLDER]].
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | DailyAI Betting',
  alternates: { canonical: 'https://dailyaibetting.com/about' },
};

export default function Page() {
  return (
    <div className="container px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">About</h1>
      <p className="mb-3 text-muted-foreground">{"DailyAI Betting shows where sports cappers agree. We collect picks from Discord-posted capper picks and public sites, normalize team names and bet types, group identical bets, and count how many cappers chose the same side (\"consensus\"). We then grade picks after games finish and publish the record."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"What we do"}</h2>
      <ul className="list-disc pl-6 space-y-1">
      <li>{"Consensus picks by sport, with capper counts and tiers."}</li>
      <li>{"Capper pages and a public leaderboard built from graded picks."}</li>
      <li>{"A graded consensus record on the Results page. [[OWNER: describe grading method, units/ROI assumptions (estimated at -110), minimum sample and known gaps once the grading workstream finalizes]]"}</li>
      <li>{"A daily AI-written report (scheduled for about 10:30 AM ET; it may not publish every day) and AI-assisted blog articles."}</li>
      <li>{"DailyAI Pro: all consensus picks, capper pick detail and the full pick history."}</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"What we are not"}</h2>
      <p className="mb-3 text-muted-foreground">{"We are not a sportsbook and we do not guarantee outcomes. Consensus does not mean a pick will win. See Responsible Gambling."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"Who runs it"}</h2>
      <p className="mb-3 text-muted-foreground">{"[[LEGAL_ENTITY_NAME]] ([[ENTITY_TYPE_AND_STATE]]). [[OWNER: short operator bio and why the site exists; real names only if you choose to publish them]]"}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"How AI is used"}</h2>
      <p className="mb-3 text-muted-foreground">{"AI helps write reports and articles from consensus data. It can be wrong. We label AI-assisted content and do not present AI output as a guaranteed prediction."}</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">{"Contact"}</h2>
      <p className="mb-3 text-muted-foreground">{"[[CONTACT_EMAIL]] or the Contact page."}</p>
    </div>
  );
}
