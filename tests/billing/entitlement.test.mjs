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
  { todo: 'OPEN B1 — P0-BILL-1 entitlement fails safe (explicit unknown state or throw)' }, async () => {
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
  { todo: 'OPEN B1 — P0-BILL-1' }, async () => {
    seedSubscription({ userId: 'u_to', status: 'trialing' });
    harness().db.fail({ table: 'user_subscriptions', op: 'select', error: { message: 'canceling statement due to statement timeout', code: '57014' } });
    await assert.rejects(isPremium('u_to'));
  });
