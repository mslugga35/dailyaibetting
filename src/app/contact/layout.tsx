import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | DailyAI Betting',
  description: 'Get in touch with DailyAI Betting. We\'d love to hear from you about feedback, partnerships, or support.',
  openGraph: {
    title: 'Contact Us | DailyAI Betting',
    description: 'Get in touch with DailyAI Betting. We\'d love to hear from you.',
    url: 'https://dailyaibetting.com/contact',
    type: 'website',
  },
  alternates: {
    canonical: 'https://dailyaibetting.com/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
