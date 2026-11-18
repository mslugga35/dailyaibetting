import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/subscription';
import { getAdminUser } from '@/lib/auth/admin';
import { GradingClient } from './GradingClient';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/**
 * Server-verified admin gate (S4). Signed-out visitors go to login (and come back here);
 * signed-in non-admins get a 404, so the page's existence is not advertised to them.
 */
export default async function GradingAdminPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect('/login?redirect=/admin/grading');
  const admin = await getAdminUser();
  if (!admin) notFound();
  return <GradingClient />;
}
