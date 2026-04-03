import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | DailyAI Betting',
  description: 'Sign in to your DailyAI Betting account. Access your Pro subscription and premium picks.',
  openGraph: {
    title: 'Sign In | DailyAI Betting',
    description: 'Sign in to access premium betting picks and your subscription.',
    url: 'https://dailyaibetting.com/login',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/login',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
