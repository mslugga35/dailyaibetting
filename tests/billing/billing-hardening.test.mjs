/**
 * Billing hardening (DAI-11..15): idempotent trial-card check, duplicate subscriptions,
 * unmapped payers, guest checkout off by default, founding-hold abuse limits.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  setup, harness, req, body, quietly, bearerUser, seedSubscription,
  checkoutCompletedEvent, subscriptionEvent, stripeEvent, signedWebhookRequest, DAILYAI_PRICE_ID, captureEmails,
} from '../harness/helpers.mjs';

const FOUNDING = 'price_test_dailyai_founding_999';
const REGULAR = 'price_test_dailyai_regular_1999';
const FOUNDING_ENV = { PRICING_MODE: 'founding', STRIPE_PRICE_FOUNDING: FOUNDING, STRIPE_PRICE_PRO: REGULAR };

const { POST: checkoutPOST } = await import('../../src/app/api/checkout/route.ts');
const { POST: webhookPOST } = await import('../../src/app/api/webhooks/stripe/route.ts');
const offerMod = await import('../../src/lib/pricing/offer.ts');
const holdLimit = await import('../../src/lib/pricing/hold-limit.ts');

const checkout = (opts = {}) => quietly(() => checkoutPOST(req('/api/checkout', { method: 'POST', body: {}, ...opts })));
const deliver = (event) => quietly(async () => webhookPOST(signedWebhookRequest(event)));
const deliverLogs = async (event) => { let res; const lines = []; await quietly(async (l) => { res = await webhookPOST(signedWebhookRequest(event)); lines.push(...l); }); return { res, lines }; };
const rpcCalls = (name) => harness().db.log.filter((l) => l.op === 'rpc' && l.name === name).map((l) => l.args);

function seatRpc({ outcome = 'reserved', seatId = 41, taken = 1 } = {}) {
  const h = harness();
  h.stripe.prices[FOUNDING] = { unit_amount: 999 };
  h.stripe.prices[REGULAR] = { unit_amount: 1999 };
  h.db.rpcHandlers.set('dailyai_founding_reserve', async () => [{ seat_id: outcome === 'reserved' || outcome === 'existing' ? seatId : null, outcome, taken }]);
  h.db.rpcHandlers.set('dailyai_founding_transition', async (a) => [{ seat_id: a.p_seat ?? seatId, status: a.p_event, over_cap: false }]);
  h.db.rpcHandlers.set('dailyai_founding_stats', async () => [{ reserved: 0, trialing: 0, converted: taken, ended: 0, released: 0, taken }]);
}

beforeEach(() => { setup(); offerMod.resetOfferCache(); offerMod.resetPriceVerification(); holdLimit.resetFoundingHoldLimiter(); });

// ---------------------------------------------------------------- DAI-12

test('DAI-12: a redelivered checkout.session.completed after a card change cancels nothing (check already passed)', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const h = harness();
  h.stripe.paymentMethods.pm_1 = { type: 'card', card: { fingerprint: 'fp_first' } };
  h.stripe.paymentMethods.pm_2 = { type: 'card', card: { fingerprint: 'fp_used_elsewhere' } };
  const c = h.stripe.addCustomer({ email: 'chg@example.test' });
  const sub = h.stripe.addSubscription({ customer: c.id, status: 'trialing', priceId: FOUNDING, default_payment_method: 'pm_1', metadata: { user_id: 'u_chg', founding_seat_id: '41' } });
  h.db.rpcHandlers.set('dailyai_claim_trial_fingerprint', async () => 'first');
  const evt = checkoutCompletedEvent({ sub, userId: 'u_chg', customerEmail: 'chg@example.test' });
  assert.equal((await deliver(evt)).status, 200);
  assert.equal(h.stripe.subscriptions.find((s) => s.id === sub.id).metadata.trial_card_checked, '1');
  // customer swaps to a card that another customer already used for a trial, then Stripe redelivers
  h.stripe.subscriptions.find((s) => s.id === sub.id).default_payment_method = 'pm_2';
  h.db.rpcHandlers.set('dailyai_claim_trial_fingerprint', async () => 'reused');
  assert.equal((await deliver(evt)).status, 200);
  assert.equal(h.stripe.callsTo('subscriptions.cancel').length, 0);
  assert.equal(h.stripe.subscriptions.find((s) => s.id === sub.id).status, 'trialing');
  assert.equal(rpcCalls('dailyai_claim_trial_fingerprint').length, 1, 'fingerprint claimed once');
});

// ---------------------------------------------------------------- DAI-11

test('DAI-11a: two concurrent first checkouts share ONE Stripe customer (idempotency key from the user id)', async () => {
  const u = bearerUser('u_race');
  const [a, b] = await Promise.all([checkout({ headers: u.headers }), checkout({ headers: u.headers })]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  const created = harness().stripe.callsTo('customers.create');
  assert.ok(created.every((c) => typeof c.args._idempotencyKey === 'string' && c.args._idempotencyKey.includes('u_race')));
  assert.equal(harness().stripe.customers.length, 1);
  assert.equal(new Set(harness().stripe.sessions.map((s) => s.customer)).size, 1);
});

test('DAI-11b: a new checkout expires the user\'s older open sessions (only the newest stays open)', async () => {
  const u = bearerUser('u_tabs');
  assert.equal((await checkout({ headers: u.headers })).status, 200);
  assert.equal((await checkout({ headers: u.headers })).status, 200);
  const [s1, s2] = harness().stripe.sessions;
  assert.equal(s1.status, 'expired');
  assert.equal(s2.status, 'open');
});

test('DAI-11c: checkout.session.completed expires the customer\'s other open sessions', async () => {
  const h = harness();
  const c = h.stripe.addCustomer({ email: 'tabs@example.test' });
  const other = await h.stripe.sessions.push({ id: 'cs_other_open', object: 'checkout.session', status: 'open', mode: 'subscription', customer: c.id, created: 1, metadata: { user_id: 'u_tabs2' } });
  const sub = h.stripe.addSubscription({ customer: c.id, status: 'trialing', metadata: { user_id: 'u_tabs2' } });
  const evt = checkoutCompletedEvent({ sub, userId: 'u_tabs2', customerId: c.id });
  assert.equal((await deliver(evt)).status, 200);
  assert.equal(h.stripe.sessions.find((s) => s.id === 'cs_other_open').status, 'expired');
  void other;
});

function twoLiveSubs(secondStatus) {
  const h = harness();
  const { customer, sub: primary } = seedSubscription({ userId: 'u_dup', status: 'trialing' });
  const dup = h.stripe.addSubscription({ customer: customer.id, status: secondStatus, metadata: { user_id: 'u_dup' } });
  return { h, customer, primary, dup };
}

test('DAI-11d: duplicate TRIAL with flag unset: not cancelled, structured alert, row keeps the first subscription', async () => {
  const { h, customer, primary, dup } = twoLiveSubs('trialing');
  const { res, lines } = await deliverLogs(checkoutCompletedEvent({ sub: dup, userId: 'u_dup', customerId: customer.id }));
  assert.equal(res.status, 200);
  assert.equal(h.stripe.callsTo('subscriptions.cancel').length, 0);
  assert.ok(lines.some((l) => l.includes('[billing-alert] duplicate_subscription') && l.includes(dup.id) && l.includes(primary.id)), lines.join('\n'));
  assert.equal(h.db.rows('user_subscriptions').find((r) => r.user_id === 'u_dup').stripe_subscription_id, primary.id);
});

test('DAI-11d: duplicate TRIAL with DAI_AUTO_CANCEL_DUPLICATE_TRIAL=true is cancelled without invoice or proration; the first stays', async () => {
  setup({ env: { DAI_AUTO_CANCEL_DUPLICATE_TRIAL: 'true' } });
  const { h, customer, primary, dup } = twoLiveSubs('trialing');
  assert.equal((await deliver(checkoutCompletedEvent({ sub: dup, userId: 'u_dup', customerId: customer.id }))).status, 200);
  const cancels = h.stripe.callsTo('subscriptions.cancel');
  assert.equal(cancels.length, 1);
  assert.equal(cancels[0].args.id, dup.id);
  assert.equal(cancels[0].args.params.invoice_now, false);
  assert.equal(cancels[0].args.params.prorate, false);
  assert.equal(h.stripe.subscriptions.find((s) => s.id === primary.id).status, 'trialing');
  // redelivery changes nothing further
  assert.equal((await deliver(checkoutCompletedEvent({ sub: dup, userId: 'u_dup', customerId: customer.id }))).status, 200);
  assert.equal(h.stripe.callsTo('subscriptions.cancel').length, 1);
});

test('DAI-11d: a PAID (active) duplicate is never auto-cancelled, even with the flag on: alert only', async () => {
  setup({ env: { DAI_AUTO_CANCEL_DUPLICATE_TRIAL: 'true' } });
  const { h, customer, dup } = twoLiveSubs('active');
  const { res, lines } = await deliverLogs(checkoutCompletedEvent({ sub: dup, userId: 'u_dup', customerId: customer.id }));
  assert.equal(res.status, 200);
  assert.equal(h.stripe.callsTo('subscriptions.cancel').length, 0);
  assert.ok(lines.some((l) => l.includes('[billing-alert] duplicate_subscription')));
});

test('DAI-11d: deleting the cancelled duplicate does not end the first subscription\'s founding seat', async () => {
  setup({ env: { ...FOUNDING_ENV, DAI_AUTO_CANCEL_DUPLICATE_TRIAL: 'true' } });
  seatRpc();
  const { h, customer, dup } = twoLiveSubs('trialing');
  dup.metadata.founding_seat_id = '41';
  dup.items.data[0].price.id = FOUNDING;
  await deliver(checkoutCompletedEvent({ sub: dup, userId: 'u_dup', customerId: customer.id }));
  const cancelled = h.stripe.subscriptions.find((s) => s.id === dup.id);
  assert.equal(cancelled.status, 'canceled');
  await deliver(subscriptionEvent('customer.subscription.deleted', JSON.parse(JSON.stringify(cancelled))));
  assert.equal(rpcCalls('dailyai_founding_transition').filter((c) => c.p_event === 'ended').length, 0);
});

// ---------------------------------------------------------------- DAI-13

test('DAI-13: signed-in user whose email already has a live DailyAI subscription on an unmapped customer → 409, nothing created', async () => {
  const h = harness();
  const old = h.stripe.addCustomer({ email: 'dupe@example.test' });
  h.stripe.addSubscription({ customer: old.id, status: 'active', priceId: DAILYAI_PRICE_ID });
  const u = bearerUser('u_dupe', 'dupe@example.test');
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 409);
  const j = await body(res);
  assert.match(j.error, /already have a DailyAI subscription/i);
  assert.equal(j.manage, true);
  assert.equal(h.stripe.callsTo('customers.create').length, 0);
  assert.equal(h.stripe.sessions.length, 0);
});

test('DAI-13: a live subscription for ANOTHER product on that email does not block DailyAI checkout; a canceled DailyAI one does not either', async () => {
  const h = harness();
  const old = h.stripe.addCustomer({ email: 'other@example.test' });
  h.stripe.addSubscription({ customer: old.id, status: 'active', priceId: 'price_someone_else' });
  h.stripe.addSubscription({ customer: old.id, status: 'canceled', priceId: DAILYAI_PRICE_ID });
  const u = bearerUser('u_other', 'other@example.test');
  assert.equal((await checkout({ headers: u.headers })).status, 200);
});

test('DAI-13: the email match is case-insensitive in effect (mixed-case customer email is found)', async () => {
  const h = harness();
  const old = h.stripe.addCustomer({ email: 'Mixed@Example.test' });
  h.stripe.addSubscription({ customer: old.id, status: 'trialing', priceId: DAILYAI_PRICE_ID });
  const u = bearerUser('u_mixed', 'Mixed@Example.test');
  assert.equal((await checkout({ headers: u.headers })).status, 409);
});

// ---------------------------------------------------------------- DAI-15

test('DAI-15: guest flag unset → disabled by default', async () => {
  const { isGuestCheckoutEnabled } = await import('../../src/lib/guest-checkout.ts');
  assert.equal(isGuestCheckoutEnabled(), false);
  process.env.GUEST_CHECKOUT_ENABLED = '1';
  assert.equal(isGuestCheckoutEnabled(), false, 'only the exact string "true" enables it');
});

test('DAI-15: checkout needs a signed-in, confirmed email even when GUEST_CHECKOUT_ENABLED=true', async () => {
  setup({ env: { GUEST_CHECKOUT_ENABLED: 'true' } });
  const anon = await checkout({ body: { guestEmail: 'x@example.test' } });
  assert.equal(anon.status, 401);
  const u = bearerUser('u_unconf', 'unconf@example.test', { email_confirmed_at: null });
  const r = await checkout({ headers: u.headers });
  assert.equal(r.status, 403);
  assert.match((await body(r)).error, /confirm your email/i);
  assert.equal(harness().stripe.calls.length, 0);
});

test('DAI-15: webhook with no user_id and the flag off creates no account, sends no email, and raises a billing alert', async () => {
  const h = harness();
  const emails = captureEmails();
  const c = h.stripe.addCustomer({ email: 'guest@example.test' });
  const sub = h.stripe.addSubscription({ customer: c.id, status: 'trialing', metadata: { guest_email: 'guest@example.test' } });
  const { res, lines } = await deliverLogs(checkoutCompletedEvent({ sub, guestEmail: 'guest@example.test', customerId: c.id }));
  assert.equal(res.status, 200);
  assert.ok(lines.some((l) => l.includes('[billing-alert] guest_provisioning_disabled') && l.includes(sub.id)), lines.join('\n'));
  assert.ok(!lines.some((l) => l.includes('guest@example.test')), 'no email address in logs');
  assert.equal(h.db.log.filter((l) => String(l.op).includes('auth')).length, 0);
  assert.equal(emails.length, 0);
  assert.equal(h.db.rows('user_subscriptions').length, 0);
});

test('DAI-15: EXISTING guest-created subscriptions (guest_email metadata, mapped row) keep syncing with the flag unset', async () => {
  const h = harness();
  const c = h.stripe.addCustomer({ email: 'g@example.test' });
  const sub = h.stripe.addSubscription({ customer: c.id, status: 'active', metadata: { guest_email: 'g@example.test' } });
  h.db.seed('user_subscriptions', [{ user_id: 'u_guest_mapped', stripe_customer_id: c.id, stripe_subscription_id: sub.id, status: 'active', price_id: DAILYAI_PRICE_ID, cancel_at_period_end: false }]);
  const row = () => h.db.rows('user_subscriptions').find((r) => r.user_id === 'u_guest_mapped');
  // renewal / period change
  sub.items.data[0].current_period_end += 30 * 86400;
  assert.equal((await deliver(subscriptionEvent('customer.subscription.updated', { ...sub, cancel_at_period_end: true }))).status, 200);
  assert.equal(row().cancel_at_period_end, true);
  // redelivered checkout.session.completed (no user_id in metadata) refreshes, never alerts or provisions
  const { res, lines } = await deliverLogs(checkoutCompletedEvent({ sub, guestEmail: 'g@example.test', customerId: c.id }));
  assert.equal(res.status, 200);
  assert.ok(!lines.some((l) => l.includes('[billing-alert]')), lines.join('\n'));
  // payment failure then cancellation
  assert.equal((await deliver(subscriptionEvent('customer.subscription.updated', { ...sub, status: 'past_due' }))).status, 200);
  assert.equal(row().status, 'past_due');
  assert.equal((await deliver(subscriptionEvent('customer.subscription.deleted', { ...sub, status: 'canceled' }))).status, 200);
  assert.equal(row().status, 'canceled');
  // invoice.paid for it is accepted
  assert.equal((await deliver(stripeEvent('invoice.paid', { id: 'in_g', object: 'invoice', amount_paid: 2000, parent: { subscription_details: { subscription: sub.id } } }))).status, 200);
});

// ---------------------------------------------------------------- DAI-14

test('DAI-14: at most 3 NEW founding holds per IP per window; the 4th is refused, its seat released, and the response offers the regular price', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const ip = '198.51.100.7';
  for (let i = 0; i < 3; i++) {
    const u = bearerUser(`u_ip${i}`);
    assert.equal((await checkout({ headers: u.headers, ip })).status, 200);
  }
  const u4 = bearerUser('u_ip3');
  const res = await checkout({ headers: u4.headers, ip });
  assert.equal(res.status, 429);
  const j = await body(res);
  assert.equal(j.regularPriceAvailable, true);
  assert.equal(j.busy, true);
  assert.ok(rpcCalls('dailyai_founding_transition').some((c) => c.p_event === 'abandon'), 'the just-reserved seat was given back');
  assert.equal(harness().stripe.sessions.length, 3);
  // the UI can then ask for the regular price explicitly: no seat, regular price line item
  const reg = await checkout({ headers: u4.headers, ip, body: { plan: 'regular' } });
  assert.equal(reg.status, 200);
  assert.deepEqual(harness().stripe.sessions.at(-1).line_items, [{ price: REGULAR, quantity: 1 }]);
});

test('DAI-14: reusing your own existing hold never counts against the IP limit; another IP is unaffected', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc({ outcome: 'existing' });
  const ip = '198.51.100.8';
  for (let i = 0; i < 6; i++) assert.equal((await checkout({ headers: bearerUser('u_same').headers, ip })).status, 200);
  seatRpc({ outcome: 'reserved' });
  for (let i = 0; i < 3; i++) assert.equal((await checkout({ headers: bearerUser(`u_a${i}`).headers, ip: '198.51.100.9' })).status, 200);
  assert.equal((await checkout({ headers: bearerUser('u_b').headers, ip: '198.51.100.10' })).status, 200);
});

test('DAI-14: when all hold slots are busy the response says the regular price is available', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc({ outcome: 'busy' });
  const res = await checkout({ headers: bearerUser('u_busy').headers });
  assert.equal(res.status, 409);
  const j = await body(res);
  assert.equal(j.busy, true);
  assert.equal(j.regularPriceAvailable, true);
});
