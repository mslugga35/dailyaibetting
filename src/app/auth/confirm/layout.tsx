import type { Metadata } from 'next';

// The URL carries a one-time token: never index it, never send it as a Referer.
export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function ConfirmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
