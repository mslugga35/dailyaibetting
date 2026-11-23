import type { Metadata } from 'next';
import { verifyUnsubscribe } from '@/lib/email/unsubscribe-token';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Unsubscribe | DailyAI Betting',
  robots: { index: false, follow: false },
};

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** DAI-26: confirm step for the email unsubscribe link. Opening the page changes nothing; the button does. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const done = one(sp.done) === '1';
  const failed = one(sp.error);
  const id = one(sp.id);
  const t = one(sp.t);
  const valid = !done && verifyUnsubscribe(id, t);

  return (
    <div className="container max-w-xl py-16 px-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Email list</h1>
      {failed === 'error' ? (
        <p data-testid="unsubscribe-error">
          Something went wrong and you were not unsubscribed. Please try the link again in a few minutes.
        </p>
      ) : done ? (
        <p data-testid="unsubscribe-done">
          You&apos;re unsubscribed. We won&apos;t email you again. If you sign up again later, you&apos;ll be back on the list.
        </p>
      ) : valid ? (
        <form method="post" action="/api/unsubscribe" data-testid="unsubscribe-form">
          <input type="hidden" name="source" value="page" />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="t" value={t} />
          <p className="mb-6">Unsubscribe this address from the DailyAI Betting email list?</p>
          <button type="submit" className="rounded-md bg-primary px-5 py-2 font-medium text-primary-foreground">
            Unsubscribe
          </button>
        </form>
      ) : (
        <p data-testid="unsubscribe-invalid">
          This unsubscribe link isn&apos;t valid. Please use the link from your most recent DailyAI Betting email.
        </p>
      )}
    </div>
  );
}
