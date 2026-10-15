import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createPicksReaderClient, resetPicksReaderForTests } from './picks-reader.ts';

const BASE = { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key' };
const READER = { ...BASE, HB_READER_EMAIL: 'reader@example.test', HB_READER_PASSWORD: 'pw' };

function fakeFactory(signIn: () => Promise<unknown>) {
  const calls: { url: string; key: string }[] = [];
  let signIns = 0;
  const create = (url: string, key: string) => {
    calls.push({ url, key });
    return { auth: { signInWithPassword: () => { signIns++; return signIn(); } } } as never;
  };
  return { create, calls, signIns: () => signIns };
}
const session = (expiresInSec: number, now: number) =>
  Promise.resolve({ data: { session: { expires_at: Math.floor(now / 1000) + expiresInSec } }, error: null });

beforeEach(() => resetPicksReaderForTests());

test('never uses the service-role key, even when it is set', async () => {
  const f = fakeFactory(() => session(3600, Date.now()));
  await createPicksReaderClient({ env: { ...READER, SUPABASE_SERVICE_ROLE_KEY: 'service-key' }, create: f.create });
  assert.deepEqual(f.calls.map((c) => c.key), ['anon-key']);
  assert.equal(f.signIns(), 1, 'signs in as the reader account');
});

test('without reader credentials: anon client, warns once, no sign-in', async () => {
  const warnings: string[] = [];
  const f = fakeFactory(() => assert.fail('must not sign in'));
  await createPicksReaderClient({ env: BASE, create: f.create, warn: (m) => warnings.push(m) });
  await createPicksReaderClient({ env: BASE, create: f.create, warn: (m) => warnings.push(m) });
  assert.equal(f.signIns(), 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /HB_READER_EMAIL/);
});

test('reuses the signed-in client until the token is near expiry', async () => {
  let now = 1_000_000_000_000;
  const f = fakeFactory(() => session(3600, now));
  const a = await createPicksReaderClient({ env: READER, create: f.create, now: () => now });
  now += 30 * 60 * 1000;
  const b = await createPicksReaderClient({ env: READER, create: f.create, now: () => now });
  assert.equal(a, b);
  assert.equal(f.signIns(), 1);
  now += 26 * 60 * 1000; // 4 min left: inside the 5 min margin
  await createPicksReaderClient({ env: READER, create: f.create, now: () => now });
  assert.equal(f.signIns(), 2);
});

test('sign-in failure throws without leaking the password, and is not cached', async () => {
  const f = fakeFactory(() => Promise.resolve({ data: { session: null }, error: { message: 'Invalid login credentials' } }));
  await assert.rejects(
    createPicksReaderClient({ env: { ...READER, HB_READER_PASSWORD: 'hunter2-secret' }, create: f.create }),
    (e: Error) => /sign-in failed: Invalid login credentials/.test(e.message) && !e.message.includes('hunter2-secret'),
  );
  await assert.rejects(createPicksReaderClient({ env: READER, create: f.create }));
  assert.equal(f.signIns(), 2);
});

test('missing Supabase URL or anon key fails loudly', async () => {
  await assert.rejects(createPicksReaderClient({ env: { HB_READER_EMAIL: 'a', HB_READER_PASSWORD: 'b' } }), /not set/);
});
