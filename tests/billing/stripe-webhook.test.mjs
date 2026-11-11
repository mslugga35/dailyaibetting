/**
 * POST /api/webhooks/stripe — signature, provisioning, status mapping, outages,
 * duplicate and out-of-order delivery.
 *
 * Tests marked `todo: 'OPEN …'` assert the TARGET behaviour for an audited
 * defect (docs: ClaudeGPT DAILYAI-P0-A0-FINDINGS-2026-11-09.md). They fail today
 * and are reported as TODO, not as failures. tests/harness/run.mjs fails the run
 * if a todo test starts PASSING, so the fixing task must promote it to a real test.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  setup, harness, quietly, captureEmails, seedSubscription,
  checkoutCompletedEvent, subscriptionEvent, signedWebhookRequest, DAILYAI_PRICE_ID,
} from '../harness/helpers.mjs';
import { FOREIGN_PRICE_ID } from '../harness/fake-stripe-state.mjs';

const { POST } = await import('../../src/app/api/webhooks/stripe/route.ts');
const { isPremium } = await import('../../src/lib/auth/subscription.ts');

const deliver = (event, opts) => quietly(() => POST(signedWebhookRequest(event, opts)));
const rowFor = (userId) => harness().db.dump('user_subscriptions').find((r) => r.user_id === userId);
const writes = () => harness().db.log.filter((l) => ['insert', 'upsert', 'update', 'delete'].includes(l.op));

function newStripeSub({ status = 'trialing', priceId = DAILYAI_PRICE_ID, email = 'buyer@example.test' } = {}) {
  const h = harness();
  const customer = h.stripe.addCustomer({ email });
  return h.stripe.addSubscription({ customer: customer.id, status, priceId });
}

beforeEach(() => { setup(); });

// ---------------------------------------------------------------- signature

test('rejects a request with no Stripe-Signature header (400, no DB writes)', async () => {
  const res = await deliver(checkoutCompletedEvent({ sub: newStripeSub(), userId: 'u1' }), { signature: null });
  assert.equal(res.status, 400);
  assert.equal(writes().length, 0);
});

test('rejects a tampered body (signature computed over different bytes)', async () => {
  const sub = newStripeSub();
  const event = checkoutCompletedEvent({ sub, userId: 'u1' });
  const { realWebhooks } = await import('../harness/fakes/stripe.mjs');
  const sig = realWebhooks.generateTestHeaderString({ payload: JSON.stringify(event), secret: process.env.STRIPE_WEBHOOK_SECRET });
  const tampered = JSON.stringify({ ...event, data: { object: { ...event.data.object, metadata: { user_id: 'attacker' } } } });
  const res = await deliver(event, { signature: sig, payload: tampered });
  assert.equal(res.status, 400);
  assert.equal(writes().length, 0);
});

test('rejects an event signed with a different secret', async () => {
  const res = await deliver(checkoutCompletedEvent({ sub: newStripeSub(), userId: 'u1' }), { secret: 'whsec_someone_else' });
  assert.equal(res.status, 400);
  assert.equal(writes().length, 0);
});

test('returns 500 (not 200) when STRIPE_WEBHOOK_SECRET is not configured', async () => {
  setup({ env: { STRIPE_WEBHOOK_SECRET: undefined } });
  const res = await deliver(checkoutCompletedEvent({ sub: newStripeSub(), userId: 'u1' }), { secret: 'whsec_harness_test_secret' });
  assert.equal(res.status, 500);
  assert.equal(writes().length, 0);
});

// ---------------------------------------------------------------- provisioning

test('checkout.session.completed (signed-in user, trialing) grants Pro with period dates', async () => {
  const sub = newStripeSub({ status: 'trialing' });
  const res = await deliver(checkoutCompletedEvent({ sub, userId: 'u1' }));
  assert.equal(res.status, 200);
  const row = rowFor('u1');
  assert.equal(row.status, 'trialing');
  assert.equal(row.stripe_subscription_id, sub.id);
  assert.equal(row.stripe_customer_id, sub.customer);
  assert.equal(row.price_id, DAILYAI_PRICE_ID);
  assert.match(row.current_period_end, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(await isPremium('u1'), true);
});

test('checkout.session.completed (active) records active', async () => {
  const sub = newStripeSub({ status: 'active' });
  await deliver(checkoutCompletedEvent({ sub, userId: 'u2' }));
  assert.equal(rowFor('u2').status, 'active');
});

test('one-time payment checkouts are ignored', async () => {
  const res = await deliver(checkoutCompletedEvent({ sub: null, userId: 'u3', mode: 'payment' }));
  assert.equal(res.status, 200);
  assert.equal(writes().length, 0);
});

test('Supabase outage during checkout.session.completed → 500 so Stripe retries; redelivery after recovery grants Pro', async () => {
  const sub = newStripeSub({ status: 'active' });
  const event = checkoutCompletedEvent({ sub, userId: 'u4' });
  harness().db.outage();
  const first = await deliver(event);
  assert.equal(first.status, 500);
  assert.equal(rowFor('u4'), undefined);
  harness().db.restore();
  const retry = await deliver(event);
  assert.equal(retry.status, 200);
  assert.equal(rowFor('u4').status, 'active');
});

test('Stripe API failure while retrieving the subscription → 500 (retryable), nothing written', async () => {
  const sub = newStripeSub();
  harness().stripe.fail({ method: 'subscriptions.retrieve', times: 1 });
  const res = await deliver(checkoutCompletedEvent({ sub, userId: 'u5' }));
  assert.equal(res.status, 500);
  assert.equal(rowFor('u5'), undefined);
});

test('duplicate delivery of the same checkout event leaves exactly one, unchanged row', async () => {
  const sub = newStripeSub({ status: 'active' });
  const event = checkoutCompletedEvent({ sub, userId: 'u6' });
  await deliver(event);
  const before = rowFor('u6');
  const again = await deliver(event);
  assert.equal(again.status, 200);
  const rows = harness().db.dump('user_subscriptions').filter((r) => r.user_id === 'u6');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], before);
});

// ---------------------------------------------------------------- status mapping

const MAPPING = [
  ['trialing', 'trialing', true],
  ['active', 'active', true],
  ['past_due', 'past_due', false],
  ['unpaid', 'past_due', false],
  ['canceled', 'canceled', false],
  ['incomplete', 'inactive', false],
  ['incomplete_expired', 'canceled', false],
  ['paused', 'inactive', false],
];

for (const [stripeStatus, dbStatus, pro] of MAPPING) {
  test(`customer.subscription.updated: Stripe "${stripeStatus}" → "${dbStatus}" (Pro=${pro})`, async () => {
    const { sub } = seedSubscription({ userId: 'u7', status: 'active' });
    const updated = { ...sub, status: stripeStatus };
    const res = await deliver(subscriptionEvent('customer.subscription.updated', updated));
    assert.equal(res.status, 200);
    assert.equal(rowFor('u7').status, dbStatus);
    assert.equal(await isPremium('u7'), pro);
  });
}

test('customer.subscription.deleted revokes Pro', async () => {
  const { sub } = seedSubscription({ userId: 'u8', status: 'active' });
  const res = await deliver(subscriptionEvent('customer.subscription.deleted', { ...sub, status: 'canceled' }));
  assert.equal(res.status, 200);
  assert.equal(rowFor('u8').status, 'canceled');
  assert.equal(await isPremium('u8'), false);
});

test('Supabase outage during subscription.deleted → 500 (Stripe retries); Pro not silently kept as success', async () => {
  const { sub } = seedSubscription({ userId: 'u9', status: 'active' });
  harness().db.outage();
  const res = await deliver(subscriptionEvent('customer.subscription.deleted', { ...sub, status: 'canceled' }));
  assert.equal(res.status, 500);
});

test('unhandled event types are acknowledged without writes', async () => {
  const res = await deliver(subscriptionEvent('invoice.paid', { id: 'in_1' }));
  assert.equal(res.status, 200);
  assert.equal(writes().length, 0);
});

// ---------------------------------------------------------------- guest checkout

test('guest checkout (flag on): creates the account, grants Pro, emails one magic link', async () => {
  setup({ env: { GUEST_CHECKOUT_ENABLED: 'true' } });
  const emails = captureEmails();
  const sub = newStripeSub({ status: 'trialing', email: 'guest@example.test' });
  const res = await deliver(checkoutCompletedEvent({ sub, guestEmail: 'Guest@Example.test ' }));
  assert.equal(res.status, 200);
  const user = harness().authUsers.find((u) => u.email === 'guest@example.test');
  assert.ok(user, 'guest auth user created (email normalised)');
  assert.equal(rowFor(user.id).status, 'trialing');
  assert.equal(emails.length, 1);
  assert.match(emails[0].html, /auth\.supabase\.test\/verify/);
});

test('guest email failure does not fail the webhook (access already granted)', async () => {
  setup({ env: { GUEST_CHECKOUT_ENABLED: 'true', RESEND_API_KEY: undefined } });
  const sub = newStripeSub({ status: 'active', email: 'g2@example.test' });
  const res = await deliver(checkoutCompletedEvent({ sub, guestEmail: 'g2@example.test' }));
  assert.equal(res.status, 200);
  assert.equal(harness().db.dump('user_subscriptions').length, 1);
});

test('B2: a subscription checkout for ANOTHER product on the shared Stripe account must not create a DailyAI user or grant Pro',
  { todo: 'OPEN B2 — P0-BILL-2 webhook price allowlist' }, async () => {
    setup({ env: { GUEST_CHECKOUT_ENABLED: 'true' } });
    captureEmails();
    const sub = newStripeSub({ status: 'active', priceId: FOREIGN_PRICE_ID, email: 'other-product-buyer@example.test' });
    const res = await deliver(checkoutCompletedEvent({ sub, customerEmail: 'other-product-buyer@example.test' }));
    assert.equal(res.status, 200, 'acknowledge so Stripe stops retrying');
    assert.equal(harness().authUsers.length, 0, 'no DailyAI account provisioned');
    assert.equal(harness().db.dump('user_subscriptions').length, 0, 'no Pro granted');
  });

test('B2: with GUEST_CHECKOUT_ENABLED off, the webhook must not provision guest accounts',
  { todo: 'OPEN B2 — P0-BILL-2 webhook honours the guest flag' }, async () => {
    captureEmails();
    const sub = newStripeSub({ status: 'active', email: 'noflag@example.test' });
    await deliver(checkoutCompletedEvent({ sub, customerEmail: 'noflag@example.test' }));
    assert.equal(harness().authUsers.length, 0);
    assert.equal(harness().db.dump('user_subscriptions').length, 0);
  });

test('B4: checkout.session.completed for an "incomplete" subscription must not be recorded as active',
  { todo: 'OPEN B4 — P0-BILL-2 status mapping on checkout' }, async () => {
    const sub = newStripeSub({ status: 'incomplete' });
    await deliver(checkoutCompletedEvent({ sub, userId: 'u10' }));
    const row = rowFor('u10');
    assert.ok(!row || row.status !== 'active', `recorded as ${row?.status}`);
    assert.equal(await isPremium('u10'), false);
  });

// ---------------------------------------------------------------- duplicates / ordering

test('B5: a redelivered guest checkout event must send the magic-link email only once',
  { todo: 'OPEN B5 — P0-BILL-2 event-id idempotency ledger' }, async () => {
    setup({ env: { GUEST_CHECKOUT_ENABLED: 'true' } });
    const emails = captureEmails();
    const sub = newStripeSub({ status: 'trialing', email: 'dup@example.test' });
    const event = checkoutCompletedEvent({ sub, guestEmail: 'dup@example.test' });
    await deliver(event);
    await deliver(event);
    assert.equal(emails.length, 1);
  });

test('B5: a stale subscription.updated(active) arriving AFTER subscription.deleted must not re-grant Pro',
  { todo: 'OPEN B5 — P0-BILL-2 ordering guard (re-read Stripe or compare event.created)' }, async () => {
    const { sub } = seedSubscription({ userId: 'u11', status: 'active' });
    const staleUpdate = subscriptionEvent('customer.subscription.updated', { ...sub, status: 'active' });
    harness().stripe.subscriptions.find((s) => s.id === sub.id).status = 'canceled'; // Stripe's truth
    await deliver(subscriptionEvent('customer.subscription.deleted', { ...sub, status: 'canceled' }));
    await deliver(staleUpdate); // delivered late, out of order
    assert.equal(rowFor('u11').status, 'canceled');
    assert.equal(await isPremium('u11'), false);
    // Positive controls: the guard must not drop every update, nor every update whose
    // status is 'active' (a past_due subscription that RECOVERS must become active).
    const { sub: other } = seedSubscription({ userId: 'u11b', status: 'active' });
    harness().stripe.subscriptions.find((s) => s.id === other.id).status = 'past_due';
    const down = await deliver(subscriptionEvent('customer.subscription.updated', { ...other, status: 'past_due' }));
    assert.equal(down.status, 200);
    assert.equal(rowFor('u11b').status, 'past_due');
    harness().stripe.subscriptions.find((s) => s.id === other.id).status = 'active';
    const up = await deliver(subscriptionEvent('customer.subscription.updated', { ...other, status: 'active' }));
    assert.equal(up.status, 200);
    assert.equal(rowFor('u11b').status, 'active');
    assert.equal(await isPremium('u11b'), true);
    // ...and the stale half still holds after the recovery traffic.
    assert.equal(rowFor('u11').status, 'canceled');
  });

test('B6: subscription.updated for a subscription with no DB row must not be acknowledged as success',
  { todo: 'OPEN B6 — P0-BILL-2 zero-row update is an error' }, async () => {
    const sub = newStripeSub({ status: 'past_due' });
    const early = subscriptionEvent('customer.subscription.updated', sub);
    const res = await deliver(early);
    assert.ok(res.status >= 400 && res.status !== 400, `HTTP ${res.status}: must be a retryable non-2xx (not a 400 signature-style rejection)`);
    // ...and the retry, after checkout.session.completed has created the row, must apply.
    await deliver(checkoutCompletedEvent({ sub: { ...sub, status: 'active' }, userId: 'u12' }));
    const retry = await deliver(early);
    assert.equal(retry.status, 200);
    assert.equal(rowFor('u12').status, 'past_due');
  });

test('resubscribe: a user who canceled and buys again gets the NEW subscription tracked (one row per user)', async () => {
  const { sub: oldSub } = seedSubscription({ userId: 'u13', status: 'canceled' });
  const newSub = newStripeSub({ status: 'active', email: 'u13@example.test' });
  const res = await deliver(checkoutCompletedEvent({ sub: newSub, userId: 'u13' }));
  assert.equal(res.status, 200);
  const rows = harness().db.dump('user_subscriptions').filter((r) => r.user_id === 'u13');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stripe_subscription_id, newSub.id);
  assert.notEqual(rows[0].stripe_subscription_id, oldSub.id);
  assert.equal(await isPremium('u13'), true);
});

test('duplicate subscription.updated and subscription.deleted deliveries are idempotent', async () => {
  const { sub } = seedSubscription({ userId: 'u14', status: 'active' });
  const upd = subscriptionEvent('customer.subscription.updated', { ...sub, status: 'past_due' });
  assert.equal((await deliver(upd)).status, 200);
  assert.equal((await deliver(upd)).status, 200);
  assert.equal(rowFor('u14').status, 'past_due');
  const del = subscriptionEvent('customer.subscription.deleted', { ...sub, status: 'canceled' });
  assert.equal((await deliver(del)).status, 200);
  assert.equal((await deliver(del)).status, 200);
  assert.equal(rowFor('u14').status, 'canceled');
  assert.equal(harness().db.dump('user_subscriptions').length, 1);
});

test('B5: checkout.session.completed redelivered AFTER a later subscription.updated(past_due) must not overwrite it with active',
  { todo: "OPEN B5 — P0-BILL-2 ordering guard: write Stripe's current status, not the event payload" }, async () => {
    const sub = newStripeSub({ status: 'active' });
    await deliver(checkoutCompletedEvent({ sub, userId: 'u15' }));
    harness().stripe.subscriptions.find((s) => s.id === sub.id).status = 'past_due';
    await deliver(subscriptionEvent('customer.subscription.updated', { ...sub, status: 'past_due' }));
    // Stripe retries the original checkout event after the update was processed (Stripe truth: past_due).
    const retried = checkoutCompletedEvent({ sub, userId: 'u15' });
    await deliver(retried);
    assert.equal(rowFor('u15').status, 'past_due');
  });

test('guest partial failure: DB write fails once → 500; redelivery completes with exactly one account and one row', async () => {
  setup({ env: { GUEST_CHECKOUT_ENABLED: 'true' } });
  captureEmails();
  const sub = newStripeSub({ status: 'active', email: 'partial@example.test' });
  const event = checkoutCompletedEvent({ sub, guestEmail: 'partial@example.test' });
  harness().db.fail({ table: 'user_subscriptions', op: 'upsert', times: 1 });
  assert.equal((await deliver(event)).status, 500);
  assert.equal((await deliver(event)).status, 200);
  assert.equal(harness().authUsers.length, 1);
  assert.equal(harness().db.dump('user_subscriptions').length, 1);
});

