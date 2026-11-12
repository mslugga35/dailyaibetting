/**
 * Server-side entitlement: getUserSubscription / isPremium (src/lib/auth/subscription.ts)
 * across every subscription state, Supabase outages, and recovery.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, seedSubscription } from '../harness/helpers.mjs';

const { getUserSubscription, isPremium } = await import('../../src/lib/auth/subscription.ts');
const { isProStatus, SUBSCRIPTION_STATUSES } = await import('../../src/lib/constants/subscription.ts');

beforeEach(() => { setup(); });

const STATES = [
  ['active', 'premium'],
  ['trialing', 'premium'],
  ['past_due', 'free'],
  ['canceled', 'free'],
  ['inactive', 'free'],
];

test('the status list matches the DB CHECK constraint (supabase/subscriptions.sql)', () => {
  assert.deepEqual([...SUBSCRIPTION_STATUSES], ['active', 'trialing', 'past_due', 'canceled', 'inactive']);
  assert.equal(isProStatus(null), false);
  assert.equal(isProStatus(undefined), false);
  assert.equal(isProStatus('ACTIVE'), false);
});

for (const [status, plan] of STATES) {
  test(`status "${status}" → plan "${plan}"`, async () => {
    seedSubscription({ userId: `u_${status}`, status });
    const sub = await getUserSubscription(`u_${status}`);
    assert.equal(sub.plan, plan);
    assert.equal(sub.status, status);
    assert.equal(await isPremium(`u_${status}`), plan === 'premium');
  });
}

test('no subscription row → free / inactive', async () => {
  const sub = await getUserSubscription('nobody');
  assert.equal(sub.plan, 'free');
  assert.equal(sub.status, 'inactive');
});

test('entitlement is read with the service-role client (RLS cannot hide a paying row)', async () => {
  seedSubscription({ userId: 'u_k', status: 'active' });
  await getUserSubscription('u_k');
  const read = harness().db.log.find((l) => l.table === 'user_subscriptions' && l.op === 'select');
  assert.equal(read.key, 'service');
});

test('recovery: once Supabase is back, a paying user is premium again (no sticky downgrade)', async () => {
  seedSubscription({ userId: 'u_rec', status: 'active' });
  harness().db.outage();
  await getUserSubscription('u_rec').catch(() => null);
  harness().db.restore();
  assert.equal(await isPremium('u_rec'), true);
});

test('B1: a Supabase error must NOT be reported as "free / inactive" for a paying user',
  async () => {
    seedSubscription({ userId: 'u_out', status: 'active' });
    harness().db.outage();
    let result;
    try { result = await getUserSubscription('u_out'); } catch { return; } // throwing is acceptable
    // The only other acceptable answer is an EXPLICIT unknown state. 'premium' would be a
    // fail-OPEN "fix" (everyone is Pro during an outage) and must not pass this test.
    assert.equal(result.plan, 'unknown', `got plan "${result.plan}" on a DB error`);
  });

test('outage must never fail OPEN: a NON-paying user is not premium while Supabase is down', async () => {
  seedSubscription({ userId: 'u_free_out', status: 'canceled' });
  harness().db.outage();
  let premium;
  try { premium = await isPremium('u_free_out'); } catch { premium = 'threw'; }
  assert.notEqual(premium, true);
  let sub;
  try { sub = await getUserSubscription('nobody_out'); } catch { sub = null; }
  assert.notEqual(sub?.plan, 'premium');
});

test('B1: a timeout on the entitlement read must not resolve isPremium() to a confident false',
  async () => {
    seedSubscription({ userId: 'u_to', status: 'trialing' });
    harness().db.fail({ table: 'user_subscriptions', op: 'select', error: { message: 'canceling statement due to statement timeout', code: '57014' } });
    await assert.rejects(isPremium('u_to'));
  });

const { EntitlementUnavailableError } = await import('../../src/lib/auth/subscription.ts');

test('B1: a HUNG entitlement read times out: it rejects with EntitlementUnavailableError and the request is aborted', async () => {
  seedSubscription({ userId: 'u_hang', status: 'active' });
  harness().db.hang({ table: 'user_subscriptions', op: 'select' });
  const t0 = Date.now();
  await assert.rejects(getUserSubscription('u_hang', { timeoutMs: 50 }), (e) => e instanceof EntitlementUnavailableError && e.code === 'TIMEOUT');
  assert.ok(Date.now() - t0 < 2000, 'the timeout decided, not the (never-answering) query');
  const signals = harness().db.abortSignals;
  assert.ok(signals.length >= 1, 'the entitlement query was given an abort signal');
  assert.equal(signals.at(-1).aborted, true, 'the timed-out query was cancelled');
  await assert.rejects(isPremium('u_hang', { timeoutMs: 50 }), EntitlementUnavailableError);
});

test('B1: a fast answer is not affected by the timeout, and no-row stays a confident free (PGRST116 is not an outage)', async () => {
  seedSubscription({ userId: 'u_fast', status: 'trialing' });
  assert.equal(await isPremium('u_fast', { timeoutMs: 1000 }), true);
  assert.equal((await getUserSubscription('no_row_user', { timeoutMs: 1000 })).plan, 'free');
  assert.equal(harness().db.abortSignals.at(-1).aborted, false, 'a completed read is not aborted');
});

test('B1: two subscription rows for one user are ambiguous: entitlement is unavailable, never "free" (PGRST116 is not trusted as no-row)', async () => {
  harness().db.seed('user_subscriptions', [
    { user_id: 'u_dup', status: 'active', stripe_customer_id: 'cus_dup_a' },
    { user_id: 'u_dup', status: 'canceled', stripe_customer_id: 'cus_dup_b' },
  ]);
  await assert.rejects(getUserSubscription('u_dup'), (e) => e instanceof EntitlementUnavailableError && e.code === 'DUPLICATE');
  await assert.rejects(isPremium('u_dup'), EntitlementUnavailableError);
});
