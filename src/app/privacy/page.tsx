import { notFound } from 'next/navigation';
import { PolicyPage } from '@/components/legal/PolicyPage';
import { PRIVACY, policiesPublished } from '@/lib/legal/policies';

export const dynamic = 'force-dynamic';
export const metadata = { title: `${PRIVACY.title}`, description: PRIVACY.summary };

/** Unpublished (404) until the owner approves the wording: POLICY_PAGES_PUBLISHED=true. */
export default function Page() {
  if (!policiesPublished()) notFound();
  return <PolicyPage policy={PRIVACY} />;
}
