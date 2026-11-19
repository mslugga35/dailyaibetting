import Link from 'next/link';
import type { Policy } from '@/lib/legal/policies';
import { POLICY_LAST_UPDATED } from '@/lib/legal/policies';
import { EmailSafeText } from '@/components/ui/email-safe-text';

/** Renders one policy (server component). */
export function PolicyPage({ policy }: { policy: Policy }) {
  return (
    <main className="container px-4 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{policy.title}</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated {POLICY_LAST_UPDATED}</p>
      <div className="space-y-8">
        {policy.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-semibold mb-3">{s.heading}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {s.paragraphs.map((p, i) => <p key={i}><EmailSafeText text={p} /></p>)}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-12 text-sm">
        <Link href="/" className="text-primary hover:underline">Back to DailyAI Betting</Link>
      </p>
    </main>
  );
}
