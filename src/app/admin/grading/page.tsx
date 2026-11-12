import { notFound } from 'next/navigation';
import { getAdminUser } from '@/lib/auth/admin';
import { GradingClient } from './GradingClient';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/** Server-verified admin gate (S4). Non-admins get a plain 404: the page's existence is not advertised. */
export default async function GradingAdminPage() {
  const admin = await getAdminUser();
  if (!admin) notFound();
  return <GradingClient />;
}
