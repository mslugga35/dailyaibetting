/**
 * Billing hardening round 2 (Breaker + Security reviews of fix/billing-dai11-15):
 * F1 first-bound seat, F2 per-IP burst, F3 email griefing, F4 promote a live duplicate,
 * F5 reserved-seat release, F6 no email in logs, F7 customer-typed comment, F8 ipKey.
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
const { GET: statusGET } = await import('../../src/app/api/checkout/status/route.ts');
const { POST: webhookPOST } = await import('../../src/app/api/webhooks/stripe/route.ts');
const offerMod = await import('../../src/lib/pricing/offer.ts');
const holdLimit = await import('../../src/lib/pricing/hold-limit.ts');

const checkout = (opts = {}) => quietly(() => checkoutPOST(req('/api/checkout', { method: 'POST', body: {}, ...opts })));
const checkoutLogs = async (opts = {}) => { let res; const lines = []; await quietly(async (l) => { res = await checkoutPOST(req('/api/checkout', { method: 'POST', body: {}, ...opts })); lines.push(...l); }); return { res, lines }; };
const deliver = (event) => quietly(async () => webhookPOST(signedWebhookRequest(event)));
const deliverLogs = async (event) => { let res; const lines = []; await quietly(async (l) => { res = await webhookPOST(signedWebhookRequest(event)); lines.push(...l); }); return { res, lines }; };
const rpcCalls = (name) => harness().db.log.filter((l) => l.op === 'rpc' && l.name === name).map((l) => l.args);
const clone = (x) => JSON.parse(JSON.stringify(x));
const paidEvent = (sub, id) => stripeEvent('invoice.paid', { id, object: 'invoice', amount_paid: 999, parent: { subscription_details: { subscription: sub.id } } });

beforeEach(() => { setup(); offerMod.resetOfferCache(); offerMod.resetPriceVerification(); holdLimit.resetFoundingHoldLimiter(); });

/** dailyai_founding_transition's state machine (supabase/migrations/20261117000000), over the seeded seats table. */
function seatSql() {
  const h = harness();
  h.stripe.prices[FOUNDING] = { unit_amount: 999 };
  h.stripe.prices[REGULAR] = { unit_amount: 1999 };
  h.db.rpcHandlers.set('dailyai_founding_transition', async (a) => {
    const seats = h.db.rows('dailyai_founding_seats');
    let v = a.p_seat != null ? seats.find((s) => s.id === a.p_seat) : null;
    if (!v && a.p_subscription) v = seats.find((s) => s.stripe_subscription_id === a.p_subscription);
    if (!v) return [];
    const bindNew = () => { v.stripe_subscription_id = a.p_subscription ?? v.stripe_subscription_id; };
    if (a.p_event === 'started' && ['reserved', 'released'].includes(v.status)) { v.status = 'trialing'; bindNew(); }
    else if (a.p_event === 'paid' && ['reserved', 'trialing', 'released'].includes(v.status)) { v.status = 'converted'; bindNew(); }
    else if (['started', 'paid'].includes(a.p_event) && ['trialing', 'converted'].includes(v.status)) { v.stripe_subscription_id = v.stripe_subscription_id ?? a.p_subscription; }
    else if (a.p_event === 'ended') {
      if (v.status === 'converted') v.status = 'ended';
      else if (['reserved', 'trialing'].includes(v.status)) v.status = 'released';
    }
    return [{ seat_id: v.id, status: v.status, over_cap: false }];
  });
}
const seat = (id = 41) => harness().db.rows('dailyai_founding_seats').find((s) => s.id === id);

// ---------------------------------------------------------------- F1: the first-bound subscription is the legitimate one

function unboundSeatPair() {
  const h = harness();
  const c = h.stripe.addCustomer({ email: 'f1@example.test', metadata: { user_id: 'u_f1' } });
  h.stripe.invoices.in_A = { status: 'paid', amount_paid: 999 };
  h.stripe.invoices.in_B = { status: 'paid', amount_paid: 999 };
  const A = h.stripe.addSubscription({ customer: c.id, status: 'active', priceId: FOUNDING, latest_invoice: 'in_A', metadata: { user_id: 'u_f1', founding_seat_id: '41' } });
  const B = h.stripe.addSubscription({ customer: c.id, status: 'active', priceId: FOUNDING, latest_invoice: 'in_B', metadata: { user_id: 'u_f1', founding_seat_id: '41' } });
  h.db.seed('dailyai_founding_seats', [{ id: 41, stripe_customer_id: c.id, user_id: 'u_f1', stripe_subscription_id: null, status: 'reserved', checkout_session_id: 'cs_f1' }]);
  return { h, c, A, B };
}

test("F1: a newer duplicate's invoice.paid before the older subscription's checkout never takes the unbound seat", async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const { h, c, A, B } = unboundSeatPair();
  const { res, lines } = await deliverLogs(paidEvent(B, 'in_B'));
  assert.equal(res.status, 200);
  assert.equal(seat().stripe_subscription_id, null, 'seat bound to the newer duplicate');
  assert.equal(seat().status, 'reserved');
  assert.ok(lines.some((l) => l.includes('[billing-alert] duplicate_subscription') && l.includes(B.id) && l.includes(A.id)), lines.join('\n'));
  // the legitimate checkout arrives: the seat is A's
  assert.equal((await deliver(checkoutCompletedEvent({ sub: A, userId: 'u_f1', customerId: c.id }))).status, 200);
  assert.equal(seat().stripe_subscription_id, A.id);
  assert.equal(seat().status, 'converted');
  // an operator cancels the duplicate: A keeps its seat
  h.stripe.subscriptions.find((x) => x.id === B.id).status = 'canceled';
  await deliver(subscriptionEvent('customer.subscription.deleted', { ...clone(B), status: 'canceled' }));
  assert.equal(seat().stripe_subscription_id, A.id);
  assert.equal(seat().status, 'converted');
});

test("F1: a duplicate on ANOTHER customer of a user whose row tracks a live subscription never takes that user's unbound seat", async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const h = harness();
  const { customer, sub: A } = seedSubscription({ userId: 'u_f1b', status: 'trialing', priceId: FOUNDING });
  const other = h.stripe.addCustomer({ email: 'u_f1b@example.test', metadata: { user_id: 'u_f1b' } });
  h.stripe.invoices.in_B2 = { status: 'paid', amount_paid: 999 };
  const B = h.stripe.addSubscription({ customer: other.id, status: 'active', priceId: FOUNDING, latest_invoice: 'in_B2', metadata: { user_id: 'u_f1b', founding_seat_id: '41' } });
  h.db.seed('dailyai_founding_seats', [{ id: 41, stripe_customer_id: customer.id, user_id: 'u_f1b', stripe_subscription_id: null, status: 'reserved' }]);
  assert.equal((await deliver(paidEvent(B, 'in_B2'))).status, 200);
  assert.equal(seat().stripe_subscription_id, null);
  assert.equal(seat().status, 'reserved');
  void A;
});

// ---------------------------------------------------------------- F2: per-IP burst

test('F2: 8 parallel founding checkouts from one IP create at most 3 holds; the rest are refused and their seats released', async () => {
  setup({ env: FOUNDING_ENV });
  const h = harness();
  h.stripe.prices[FOUNDING] = { unit_amount: 999 };
  h.stripe.prices[REGULAR] = { unit_amount: 1999 };
  let n = 0;
  h.db.rpcHandlers.set('dailyai_founding_reserve', async () => [{ seat_id: 100 + (++n), outcome: 'reserved', taken: n }]);
  h.db.rpcHandlers.set('dailyai_founding_transition', async (a) => [{ seat_id: a.p_seat, status: a.p_event, over_cap: false }]);
  h.db.rpcHandlers.set('dailyai_founding_stats', async () => [{ reserved: 0, trialing: 0, converted: 1, ended: 0, released: 0, taken: 1 }]);
  const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => checkout({ headers: bearerUser(`burst${i}`).headers, ip: '198.51.100.50' })));
  const statuses = rs.map((r) => r.status);
  assert.equal(statuses.filter((s) => s === 200).length, 3, statuses.join(','));
  assert.equal(statuses.filter((s) => s === 429).length, 5, statuses.join(','));
  assert.equal(h.stripe.sessions.length, 3);
  assert.equal(rpcCalls('dailyai_founding_transition').filter((c) => c.p_event === 'abandon').length, 5);
});

test('F2: a provisional slot is given back when the Checkout Session cannot be created', async () => {
  setup({ env: FOUNDING_ENV });
  const h = harness();
  h.stripe.prices[FOUNDING] = { unit_amount: 999 };
  h.stripe.prices[REGULAR] = { unit_amount: 1999 };
  let n = 0;
  h.db.rpcHandlers.set('dailyai_founding_reserve', async () => [{ seat_id: 200 + (++n), outcome: 'reserved', taken: n }]);
  h.db.rpcHandlers.set('dailyai_founding_transition', async (a) => [{ seat_id: a.p_seat, status: a.p_event, over_cap: false }]);
  h.db.rpcHandlers.set('dailyai_founding_stats', async () => [{ reserved: 0, trialing: 0, converted: 1, ended: 0, released: 0, taken: 1 }]);
  h.stripe.fail({ method: 'checkout.sessions.create', times: 4 });
  const failed = [];
  for (let i = 0; i < 4; i++) failed.push((await checkout({ headers: bearerUser(`bf${i}`).headers, ip: '198.51.100.51' })).status);
  assert.deepEqual(failed, [500, 500, 500, 500], 'a failed create must not use up the allowance');
  const ok = await Promise.all(Array.from({ length: 3 }, (_, i) => checkout({ headers: bearerUser(`bo${i}`).headers, ip: '198.51.100.51' })));
  assert.deepEqual(ok.map((r) => r.status), [200, 200, 200]);
  assert.equal((await checkout({ headers: bearerUser('bx').headers, ip: '198.51.100.51' })).status, 429);
});

// ---------------------------------------------------------------- F3: a customer-editable email cannot lock out another user

test("F3: a live sub on a customer belonging to ANOTHER user (metadata.user_id) whose email was edited to the victim's does not 409", async () => {
  const h = harness();
  h.authUsers.push({ id: 'u_attacker', email: 'attacker@example.test' }); // the other user still exists (N4)
  const att = h.stripe.addCustomer({ email: 'victim@example.test', metadata: { user_id: 'u_attacker' } });
  h.stripe.addSubscription({ customer: att.id, status: 'active', priceId: DAILYAI_PRICE_ID });
  const { res, lines } = await checkoutLogs({ headers: bearerUser('u_victim', 'victim@example.test').headers });
  assert.equal(res.status, 200);
  assert.ok(lines.some((l) => l.includes('[billing-alert] email_conflict_other_user') && l.includes(att.id) && l.includes('u_victim')), lines.join('\n'));
  assert.ok(!lines.some((l) => l.includes('victim@example.test')), 'no email address in logs');
});

test('F3: the 409 stays when the holder customer has no user_id (guest/legacy) or the SAME user_id', async () => {
  const h = harness();
  const guest = h.stripe.addCustomer({ email: 'g3@example.test' });
  h.stripe.addSubscription({ customer: guest.id, status: 'active', priceId: DAILYAI_PRICE_ID });
  assert.equal((await checkout({ headers: bearerUser('u_g3', 'g3@example.test').headers })).status, 409);
  setup();
  const h2 = harness();
  const same = h2.stripe.addCustomer({ email: 'S3@Example.test', metadata: { user_id: 'u_s3' } });
  h2.stripe.addSubscription({ customer: same.id, status: 'trialing', priceId: DAILYAI_PRICE_ID });
  assert.equal((await checkout({ headers: bearerUser('u_s3', 's3@example.test').headers })).status, 409);
});

test('F3: customers created by checkout carry metadata.user_id (set server-side)', async () => {
  assert.equal((await checkout({ headers: bearerUser('u_meta').headers })).status, 200);
  const created = harness().stripe.callsTo('customers.create');
  assert.equal(created.length, 1);
  assert.equal(created[0].args.metadata.user_id, 'u_meta');
});

// ---------------------------------------------------------------- F4: promote a live duplicate when the tracked one ends

test('F4: the tracked subscription is deleted while a paid duplicate on the same customer lives → the row moves to the duplicate', async () => {
  const h = harness();
  const { customer, sub: A } = seedSubscription({ userId: 'u_f4', status: 'active' });
  const B = h.stripe.addSubscription({ customer: customer.id, status: 'active', metadata: { user_id: 'u_f4' } });
  assert.equal((await deliver(checkoutCompletedEvent({ sub: B, userId: 'u_f4', customerId: customer.id }))).status, 200);
  h.stripe.subscriptions.find((s) => s.id === A.id).status = 'canceled';
  const { res, lines } = await deliverLogs(subscriptionEvent('customer.subscription.deleted', { ...clone(A), status: 'canceled' }));
  assert.equal(res.status, 200);
  const row = h.db.rows('user_subscriptions').find((x) => x.user_id === 'u_f4');
  assert.equal(row.stripe_subscription_id, B.id, 'paying duplicate never became the row');
  assert.equal(row.status, 'active');
  assert.ok(lines.some((l) => l.includes('[billing-alert] promoted_live_duplicate') && l.includes(B.id) && l.includes(A.id)), lines.join('\n'));
  // later events for B now apply normally
  assert.equal((await deliver(subscriptionEvent('customer.subscription.updated', { ...clone(B), status: 'past_due' }))).status, 200);
  assert.equal(h.db.rows('user_subscriptions').find((x) => x.user_id === 'u_f4').status, 'past_due');
});

test("F4: a live duplicate on ANOTHER customer with the user's metadata.user_id is promoted (customer id follows)", async () => {
  const h = harness();
  const { sub: A } = seedSubscription({ userId: 'u_f4b', status: 'active' });
  const other = h.stripe.addCustomer({ email: 'x@example.test', metadata: { user_id: 'u_f4b' } });
  const B = h.stripe.addSubscription({ customer: other.id, status: 'trialing', metadata: { user_id: 'u_f4b' } });
  h.stripe.subscriptions.find((s) => s.id === A.id).status = 'canceled';
  assert.equal((await deliver(subscriptionEvent('customer.subscription.deleted', { ...clone(A), status: 'canceled' }))).status, 200);
  const row = h.db.rows('user_subscriptions').find((x) => x.user_id === 'u_f4b');
  assert.equal(row.stripe_subscription_id, B.id);
  assert.equal(row.stripe_customer_id, other.id);
  assert.equal(row.status, 'trialing');
});

test('F4: two live candidates → ambiguous: alert, row stays canceled; another product or a foreign-user sub is never a candidate', async () => {
  const h = harness();
  const { customer, sub: A } = seedSubscription({ userId: 'u_f4c', status: 'active' });
  const B1 = h.stripe.addSubscription({ customer: customer.id, status: 'active', metadata: { user_id: 'u_f4c' } });
  const B2 = h.stripe.addSubscription({ customer: customer.id, status: 'active', metadata: { user_id: 'u_f4c' } });
  h.stripe.subscriptions.find((s) => s.id === A.id).status = 'canceled';
  const { res, lines } = await deliverLogs(subscriptionEvent('customer.subscription.deleted', { ...clone(A), status: 'canceled' }));
  assert.equal(res.status, 200);
  const row = h.db.rows('user_subscriptions').find((x) => x.user_id === 'u_f4c');
  assert.equal(row.stripe_subscription_id, A.id);
  assert.equal(row.status, 'canceled');
  assert.ok(lines.some((l) => l.includes('[billing-alert]') && l.includes('ambiguous') && l.includes(B1.id) && l.includes(B2.id)), lines.join('\n'));
  // only non-candidates: nothing promoted
  setup();
  const h2 = harness();
  const { customer: c2, sub: A2 } = seedSubscription({ userId: 'u_f4d', status: 'active' });
  h2.stripe.addSubscription({ customer: c2.id, status: 'active', priceId: 'price_someone_else', metadata: { user_id: 'u_f4d' } });
  const stranger = h2.stripe.addCustomer({ email: 's@example.test' });
  h2.stripe.addSubscription({ customer: stranger.id, status: 'active', metadata: { user_id: 'someone_else' } });
  h2.stripe.subscriptions.find((s) => s.id === A2.id).status = 'canceled';
  assert.equal((await deliver(subscriptionEvent('customer.subscription.deleted', { ...clone(A2), status: 'canceled' }))).status, 200);
  const r2 = h2.db.rows('user_subscriptions').find((x) => x.user_id === 'u_f4d');
  assert.equal(r2.stripe_subscription_id, A2.id);
  assert.equal(r2.status, 'canceled');
});

test("F4: a promoted founding duplicate does not take the ended paid seat of the subscription it replaces", async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const h = harness();
  const { customer, sub: A } = seedSubscription({ userId: 'u_f4s', status: 'active', priceId: FOUNDING });
  A.metadata.founding_seat_id = '41';
  h.stripe.subscriptions.find((s) => s.id === A.id).metadata.founding_seat_id = '41';
  h.db.seed('dailyai_founding_seats', [{ id: 41, stripe_customer_id: customer.id, user_id: 'u_f4s', stripe_subscription_id: A.id, status: 'converted' }]);
  h.stripe.invoices.in_B4 = { status: 'paid', amount_paid: 999 };
  const B = h.stripe.addSubscription({ customer: customer.id, status: 'active', priceId: FOUNDING, latest_invoice: 'in_B4', metadata: { user_id: 'u_f4s', founding_seat_id: '41' } });
  h.stripe.subscriptions.find((s) => s.id === A.id).status = 'canceled';
  assert.equal((await deliver(subscriptionEvent('customer.subscription.deleted', { ...clone(A), status: 'canceled' }))).status, 200);
  assert.equal(h.db.rows('user_subscriptions').find((x) => x.user_id === 'u_f4s').stripe_subscription_id, B.id);
  assert.equal(seat().status, 'ended');
  assert.equal(seat().stripe_subscription_id, A.id);
});

// ---------------------------------------------------------------- F5: a deleted founding sub releases its own unbound reserved seat

test('F5: a founding subscription deleted before its checkout was processed releases its reserved (unbound) seat', async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const h = harness();
  const c = h.stripe.addCustomer({ email: 'f5@example.test' });
  const A = h.stripe.addSubscription({ customer: c.id, status: 'canceled', priceId: FOUNDING, metadata: { user_id: 'u_f5', founding_seat_id: '41' } });
  h.db.seed('dailyai_founding_seats', [{ id: 41, stripe_customer_id: c.id, user_id: 'u_f5', stripe_subscription_id: null, status: 'reserved', checkout_session_id: 'cs_f5' }]);
  assert.equal((await deliver(subscriptionEvent('customer.subscription.deleted', clone(A)))).status, 200);
  assert.equal(seat().status, 'released');
});

test("F5: the unbound reserved seat is NOT released by a deleted sub while another live DailyAI sub of that customer may still claim it, nor by another customer's sub", async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const h = harness();
  const c = h.stripe.addCustomer({ email: 'f5b@example.test' });
  h.stripe.addSubscription({ customer: c.id, status: 'active', priceId: FOUNDING, metadata: { user_id: 'u_f5b', founding_seat_id: '41' } });
  const B = h.stripe.addSubscription({ customer: c.id, status: 'canceled', priceId: FOUNDING, metadata: { user_id: 'u_f5b', founding_seat_id: '41' } });
  h.db.seed('dailyai_founding_seats', [{ id: 41, stripe_customer_id: c.id, user_id: 'u_f5b', stripe_subscription_id: null, status: 'reserved' }]);
  await deliver(subscriptionEvent('customer.subscription.deleted', clone(B)));
  assert.equal(seat().status, 'reserved');
  const stranger = h.stripe.addCustomer({ email: 'f5c@example.test' });
  const S = h.stripe.addSubscription({ customer: stranger.id, status: 'canceled', priceId: FOUNDING, metadata: { founding_seat_id: '41' } });
  await deliver(subscriptionEvent('customer.subscription.deleted', clone(S)));
  assert.equal(seat().status, 'reserved');
});

// ---------------------------------------------------------------- F6: no email address in checkout error logs

test('F6: a Stripe error echoing the search query (with the email) is logged without the email', async () => {
  const h = harness();
  h.stripe.fail({ method: 'customers.search', error: Object.assign(new Error("Invalid query: email:'leak@example.test'"), { type: 'StripeInvalidRequestError', code: 'parameter_invalid_string', requestId: 'req_test_1' }) });
  const { res, lines } = await checkoutLogs({ headers: bearerUser('u_leak', 'leak@example.test').headers });
  assert.equal(res.status, 500);
  assert.ok(!lines.some((l) => l.includes('leak@example.test')), lines.join('\n'));
  assert.ok(lines.some((l) => l.includes('StripeInvalidRequestError') && l.includes('req_test_1')), lines.join('\n'));
});

test('F6: a non-Stripe error message is logged with any email address redacted', async () => {
  const h = harness();
  h.stripe.fail({ method: 'customers.search', error: new Error('boom for leak2@example.test') });
  const { lines } = await checkoutLogs({ headers: bearerUser('u_leak2', 'leak2@example.test').headers });
  assert.ok(!lines.some((l) => l.includes('leak2@example.test')), lines.join('\n'));
  assert.ok(lines.some((l) => l.includes('boom for')), lines.join('\n'));
});

// ---------------------------------------------------------------- F7: a customer-typed "trial_reuse" comment is not trusted

const CUTOFF = Math.floor(Date.UTC(2026, 10, 22) / 1000);
// N2: the cutoff is configured per deploy (DAI_TRIAL_REUSE_COMMENT_CUTOFF); these tests pin it.
const CUTOFF_ENV = { DAI_TRIAL_REUSE_COMMENT_CUTOFF: '2026-11-22T00:00:00Z' };

test('F7: a subscription cancelled AFTER the cutoff with a customer-typed "trial_reuse" comment is not treated as a refused trial', async () => {
  setup({ env: { ...FOUNDING_ENV, ...CUTOFF_ENV, RESEND_API_KEY: 're_test_x' } });
  seatSql();
  const h = harness();
  const sent = captureEmails();
  const { customer, sub } = seedSubscription({ userId: 'u_f7', status: 'canceled', priceId: FOUNDING });
  Object.assign(h.stripe.subscriptions.find((x) => x.id === sub.id), { status: 'canceled', canceled_at: CUTOFF + 3600, cancellation_details: { comment: 'trial_reuse: typed by customer' } });
  assert.equal((await deliver(checkoutCompletedEvent({ sub, userId: 'u_f7', customerId: customer.id, customerEmail: 'u_f7@example.test' }))).status, 200);
  assert.equal(sent.length, 0);
  assert.equal(h.stripe.callsTo('subscriptions.update').filter((c) => c.args.params?.metadata?.trial_reuse_notified).length, 0);
});

test('F7: a comment-only refusal cancelled BEFORE the cutoff is still recognised (pre-change cancellations)', async () => {
  setup({ env: { ...FOUNDING_ENV, ...CUTOFF_ENV, RESEND_API_KEY: 're_test_x' } });
  seatSql();
  const h = harness();
  const sent = captureEmails();
  const { customer, sub } = seedSubscription({ userId: 'u_f7b', status: 'canceled', priceId: FOUNDING });
  Object.assign(h.stripe.subscriptions.find((x) => x.id === sub.id), { status: 'canceled', canceled_at: CUTOFF - 3600, cancellation_details: { comment: 'trial_reuse: card already used for a DailyAI free trial; cancelled without charge' } });
  assert.equal((await deliver(checkoutCompletedEvent({ sub, userId: 'u_f7b', customerId: customer.id, customerEmail: 'u_f7b@example.test' }))).status, 200);
  assert.equal(sent.length, 1);
});

test('F7: /api/checkout/status honours the comment only for pre-cutoff cancellations', async () => {
  setup({ env: { ...FOUNDING_ENV, ...CUTOFF_ENV } });
  const h = harness();
  const c = h.stripe.addCustomer({ email: 's7@example.test' });
  const sub = h.stripe.addSubscription({ customer: c.id, status: 'canceled', priceId: FOUNDING, metadata: {} });
  const live = h.stripe.subscriptions.find((s) => s.id === sub.id);
  const id = `cs_test_${'f'.repeat(14)}`;
  h.stripe.sessions.push({ id, mode: 'subscription', status: 'complete', subscription: sub.id, line_items: { data: [{ price: { id: FOUNDING } }] } });
  const ask = async () => (await quietly(() => statusGET(req(`/api/checkout/status?session_id=${id}`)))).json();
  Object.assign(live, { canceled_at: CUTOFF + 60, cancellation_details: { comment: 'trial_reuse: typed' } });
  assert.deepEqual(await ask(), { state: 'pending' });
  live.canceled_at = CUTOFF - 60;
  assert.deepEqual(await ask(), { state: 'trial_not_started' });
  live.canceled_at = CUTOFF + 60; live.metadata = { dai_cancel_reason: 'trial_reuse' };
  assert.deepEqual(await ask(), { state: 'trial_not_started' });
});

// ---------------------------------------------------------------- F8: ipKey normalisation

test('F8: ipKey strips brackets, ports and zone ids, decodes hex IPv4-mapped, and keys loopback/unspecified apart', () => {
  const k = holdLimit.ipKey;
  assert.equal(k('::ffff:c000:201'), '192.0.2.1');
  assert.equal(k('::ffff:192.0.2.1'), '192.0.2.1');
  assert.equal(k('0:0:0:0:0:ffff:c000:201'), '192.0.2.1');
  assert.equal(k('192.0.2.1:5555'), '192.0.2.1');
  assert.equal(k('[2001:db8::1]'), '2001:0db8:0000:0000::/64');
  assert.equal(k('[2001:db8::1]:443'), '2001:0db8:0000:0000::/64');
  assert.equal(k('2001:DB8::1'), '2001:0db8:0000:0000::/64');
  assert.equal(k('fe80::1%eth0'), 'fe80:0000:0000:0000::/64');
  assert.equal(k('::1'), 'loopback');
  assert.equal(k('127.0.0.1'), 'loopback');
  assert.equal(k('[::1]:3000'), 'loopback');
  assert.equal(k('::'), 'unspecified');
  assert.equal(k('0.0.0.0'), 'unspecified');
  assert.notEqual(k('::2'), k('::1'));
  assert.equal(k('unknown'), null);
  assert.equal(k(''), null);
  assert.equal(k('198.51.100.7'), '198.51.100.7');
});
