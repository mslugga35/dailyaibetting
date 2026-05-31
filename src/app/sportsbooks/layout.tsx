import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Best Sportsbooks — Compare Odds, Bonuses & Lines",
  description:
    "Compare the top sportsbooks — DraftKings, FanDuel, BetMGM, Caesars and more. Find the best odds, sign-up bonuses, and lines for your bets.",
  alternates: { canonical: "https://dailyaibetting.com/sportsbooks" },
  openGraph: {
    title: "Best Sportsbooks — Compare Odds & Bonuses | DailyAI Betting",
    description: "Compare top sportsbooks and find the best odds and bonuses.",
    url: "https://dailyaibetting.com/sportsbooks",
  },
};

export default function SportsbooksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
