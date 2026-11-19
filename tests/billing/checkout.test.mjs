/**
 * POST /api/checkout — authenticated and guest flows, duplicate-subscription
 * guards, outages. `todo: 'OPEN …'` = target behaviour of an audited defect.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, harness, req, body, quietly, bearerUser, seedSubscription, DAILYAI_PRICE_ID } from '../harness/helpers.mjs';

const { POST } = await import('../../src/app/api/checkout/route.ts');

const checkout = (opts = {}) => quietly(() => POST(req('/api/checkout', { method: 'POST', body: {}, ...opts })));
const stripeCalls = (m) => harness().stripe.callsTo(m).length;

beforeEach(() => { setup(); });

// ---------------------------------------------------------------- anonymous / guest

test('anonymous request with guest checkout OFF → 401 and no Stripe calls', async () => {
  const res = await checkout({ body: { guestEmail: 'a@example.test' } });
  assert.equal(res.status, 401);
  assert.equal(harness().stripe.calls.length, 0);
});





test('signed-in new user → one Stripe customer, session carries user_id metadata and the trial', async () => {
  const u = bearerUser('u_new');
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 200);
  assert.equal(stripeCalls('customers.create'), 1);
  const [s] = harness().stripe.sessions;
  assert.equal(s.metadata.user_id, 'u_new');
  assert.equal(s.subscription_data.metadata.user_id, 'u_new');
  assert.equal(s.subscription_data.trial_period_days, 7);
  assert.equal(s.customer, harness().stripe.customers[0].id);
});

test('DB lags the webhook: Stripe already shows an active subscription → 400, no second session', async () => {
  const u = bearerUser('u_lag');
  const h = harness();
  const c = h.stripe.addCustomer({ email: u.email });
  h.stripe.addSubscription({ customer: c.id, status: 'trialing' });
  h.db.seed('user_subscriptions', [{ user_id: 'u_lag', stripe_customer_id: c.id, status: 'inactive' }]);
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 400);
  assert.equal(h.stripe.sessions.length, 0);
});

test('Stripe outage → 500 with a generic message (no internals leaked)', async () => {
  const u = bearerUser('u_so');
  harness().stripe.fail({});
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 500);
  assert.deepEqual(await body(res), { error: 'Failed to create checkout session' });
});

test('invalid bearer token is treated as anonymous (401 with guest checkout off)', async () => {
  const res = await checkout({ headers: { Authorization: 'Bearer forged' } });
  assert.equal(res.status, 401);
});

test('B3: the placeholder row must persist the Stripe customer id, so a retried checkout reuses it',
  async () => {
    const u = bearerUser('u_retry');
    await checkout({ headers: u.headers }); // user abandons the Stripe page
    await checkout({ headers: u.headers }); // and tries again
    assert.equal(stripeCalls('customers.create'), 1, 'a second Stripe customer was created');
    const row = harness().db.dump('user_subscriptions').find((r) => r.user_id === 'u_retry');
    assert.ok(row?.stripe_customer_id, 'customer id persisted');
  });

test('B1/B3: a PAYING user hitting checkout during a Supabase outage must not get a second subscription session',
  async () => {
    const u = bearerUser('u_paying');
    seedSubscription({ userId: 'u_paying', status: 'active' });
    harness().db.outage();
    const res = await checkout({ headers: u.headers });
    assert.equal(harness().stripe.sessions.length, 0, 'a checkout session was created for an already-paying user');
    assert.ok(res.status >= 500 || res.status === 409 || res.status === 400);
  });

test('B11: a past_due subscriber must be sent to billing, not into a second subscription',
  async () => {
    const u = bearerUser('u_pd');
    const { customer } = seedSubscription({ userId: 'u_pd', status: 'past_due' });
    assert.ok(customer);
    await checkout({ headers: u.headers });
    assert.equal(harness().stripe.sessions.length, 0);
  });

test('B1: checkout returns 503 and makes NO Stripe call (no customer, no session) when entitlement cannot be read', async () => {
  const u = bearerUser('u_unknown_co');
  harness().db.fail({ table: 'user_subscriptions', op: 'select' });
  const callsBefore = harness().stripe.calls.length;
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 503);
  assert.equal(harness().stripe.calls.length, callsBefore, `stripe calls: ${harness().stripe.calls.slice(callsBefore).map((c) => c.method ?? c).join(',')}`);
  assert.equal(stripeCalls('customers.create'), 0);
  assert.equal(harness().stripe.sessions.length, 0);
});

test('B1: duplicate subscription rows for the user → 503, no Stripe call (cannot tell whether they already pay)', async () => {
  const u = bearerUser('u_dup_co');
  harness().db.seed('user_subscriptions', [
    { user_id: 'u_dup_co', status: 'active', stripe_customer_id: 'cus_dup_c' },
    { user_id: 'u_dup_co', status: 'inactive', stripe_customer_id: 'cus_dup_d' },
  ]);
  const callsBefore = harness().stripe.calls.length;
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 503);
  assert.equal(harness().stripe.calls.length, callsBefore);
});

test('trial: a returning subscriber (canceled before) gets NO new free trial; a first-time subscriber does', async () => {
  const back = bearerUser('u_back');
  seedSubscription({ userId: 'u_back', status: 'canceled' });
  assert.equal((await checkout({ headers: back.headers })).status, 200);
  assert.equal(harness().stripe.sessions.at(-1).subscription_data.trial_period_days, undefined, 'returning subscriber got another trial');
  const fresh = bearerUser('u_first');
  assert.equal((await checkout({ headers: fresh.headers })).status, 200);
  assert.equal(harness().stripe.sessions.at(-1).subscription_data.trial_period_days, 7);
});



test('owner decision 2026-11-19: anonymous checkout is refused even with GUEST_CHECKOUT_ENABLED=true (no customer, no session, no seat)', async () => {
  setup({ env: { GUEST_CHECKOUT_ENABLED: 'true' } });
  const h = harness();
  const res = await checkout({ body: { guestEmail: 'walkin@example.test' }, ip: '192.0.2.70' });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).signIn, true);
  assert.equal(h.stripe.sessions.length, 0);
  assert.equal(h.stripe.customers?.length ?? 0, 0);
});

test('checkout requires a confirmed email address', async () => {
  setup();
  const h = harness();
  const u = bearerUser('u_unconfirmed', 'unconfirmed@example.test', { email_confirmed_at: null });
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 403);
  assert.equal(h.stripe.sessions.length, 0);
});

test("shared Stripe account: another product's subscriptions on the same email do not use up the DailyAI trial", async () => {
  setup();
  const h = harness();
  const c = h.stripe.addCustomer({ email: 'coach@example.test' });
  h.stripe.addSubscription({ customer: c.id, status: 'past_due', priceId: 'price_other_product' });
  h.stripe.addSubscription({ customer: c.id, status: 'canceled', priceId: 'price_other_product' });
  const u = bearerUser('u_coach', 'coach@example.test');
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 200, "another product's past_due sub must not block DailyAI");
  assert.equal(h.stripe.sessions.at(-1).subscription_data.trial_period_days, 7);
});
