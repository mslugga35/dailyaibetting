import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/subscription';
import { getAdminUser } from '@/lib/auth/admin';
import { GradingClient } from './GradingClient';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/**
 * Server-verified admin gate (S4). Signed-out visitors go to login (and come back here).
 * Signed-in non-admins get a plain "no access" page (Muse 2026-11-19: a bare 404 read as a
 * broken site); the admin tool itself is never rendered or sent to them, and every admin API
 * keeps its own server-side check.
 */
export default async function GradingAdminPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect('/login?redirect=/admin/grading');
  const admin = await getAdminUser();
  if (!admin) {
    return (
      <main className="container mx-auto max-w-lg px-4 py-20 text-center" data-testid="admin-no-access">
        <h1 className="mb-2 text-2xl font-bold">You don&apos;t have access to this page</h1>
        <p className="mb-6 text-muted-foreground">This area is for site administrators only.</p>
        <Link href="/" className="underline">Back to today&apos;s picks</Link>
      </main>
    );
  }
  return <GradingClient />;
}
