import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pick History - Browse Past Consensus Results | DailyAI Betting',
  description: 'Browse our complete archive of consensus picks and results. Filter by sport, date, and outcome. See our historical track record.',
  keywords: [
    'sports betting history',
    'past picks',
    'betting results archive',
    'consensus pick history',
    'historical betting performance',
    'pick tracker',
  ],
  openGraph: {
    title: 'Pick History - DailyAI Betting',
    description: 'Browse our complete archive of consensus picks and results.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/history',
  },
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
