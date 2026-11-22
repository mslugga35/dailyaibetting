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

test('DAI-11b: every DailyAI Checkout Session carries metadata.app=dailyai; a session without the marker (another product) is never expired', async () => {
  const h = harness();
  const u = bearerUser('u_marker');
  assert.equal((await checkout({ headers: u.headers })).status, 200);
  assert.equal(h.stripe.sessions[0].metadata.app, 'dailyai');
  h.stripe.sessions.unshift({ id: 'cs_foreign', object: 'checkout.session', status: 'open', mode: 'subscription', customer: h.stripe.customers[0].id, created: 1, metadata: { user_id: 'u_marker' } });
  assert.equal((await checkout({ headers: u.headers })).status, 200);
  assert.equal(h.stripe.sessions.find((x) => x.id === 'cs_foreign').status, 'open');
  assert.ok(h.stripe.sessions.some((x) => x.metadata?.app === 'dailyai' && x.status === 'expired'), 'the older DailyAI session was expired');
});

function completedWithOpenSessions(extra) {
  const h = harness();
  const c = h.stripe.addCustomer({ email: 'tabs@example.test' });
  const mk = (id, o) => h.stripe.sessions.push({ id, object: 'checkout.session', status: 'open', mode: 'subscription', customer: c.id, created: 100, metadata: { app: 'dailyai', user_id: 'u_tabs2' }, ...o });
  extra(mk);
  const sub = h.stripe.addSubscription({ customer: c.id, status: 'trialing', metadata: { user_id: 'u_tabs2' } });
  const evt = checkoutCompletedEvent({ sub, userId: 'u_tabs2', customerId: c.id });
  evt.data.object.created = 200;
  return { h, evt, sub, c };
}
const sessionStatus = (h, id) => h.stripe.sessions.find((x) => x.id === id).status;

test("DAI-11c: checkout.session.completed expires the same user's OLDER DailyAI open sessions, and only those", async () => {
  const { h, evt } = completedWithOpenSessions((mk) => {
    mk('cs_older_same');
    mk('cs_other_user', { metadata: { app: 'dailyai', user_id: 'someone_else' } });
    mk('cs_no_marker', { metadata: { user_id: 'u_tabs2' } });
    mk('cs_newer', { created: 300 });
  });
  assert.equal((await deliver(evt)).status, 200);
  assert.equal(sessionStatus(h, 'cs_older_same'), 'expired');
  assert.equal(sessionStatus(h, 'cs_other_user'), 'open');
  assert.equal(sessionStatus(h, 'cs_no_marker'), 'open');
  assert.equal(sessionStatus(h, 'cs_newer'), 'open', 'a newer attempt is never expired');
});

test('DAI-11c: a completed session with no user_id (guest) expires nothing; a redelivery does not expire either', async () => {
  const g = completedWithOpenSessions((mk) => mk('cs_x'));
  g.evt.data.object.metadata = { guest_email: 'g@example.test' };
  await deliver(g.evt);
  assert.equal(sessionStatus(g.h, 'cs_x'), 'open');
  setup();
  const { h, evt, sub } = completedWithOpenSessions((mk) => mk('cs_y'));
  h.db.seed('user_subscriptions', [{ user_id: 'u_tabs2', stripe_customer_id: sub.customer, stripe_subscription_id: sub.id, status: 'trialing' }]);
  await deliver(evt);
  assert.equal(sessionStatus(h, 'cs_y'), 'open');
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

test("review #1: a duplicate cancelled by hand (NO comment, flag off) never ends the legitimate subscription's seat", async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const { h, primary, dup } = twoLiveSubs('trialing');
  dup.metadata.founding_seat_id = '41'; dup.items.data[0].price.id = FOUNDING;
  primary.metadata.founding_seat_id = '41'; primary.items.data[0].price.id = FOUNDING;
  h.db.seed('dailyai_founding_seats', [{ id: 41, stripe_subscription_id: primary.id, status: 'trialing' }]);
  await deliver(subscriptionEvent('customer.subscription.deleted', { ...JSON.parse(JSON.stringify(dup)), status: 'canceled' }));
  assert.equal(rpcCalls('dailyai_founding_transition').filter((c) => c.p_event === 'ended').length, 0);
  // the bound subscription ending DOES end the seat
  await deliver(subscriptionEvent('customer.subscription.deleted', { ...JSON.parse(JSON.stringify(primary)), status: 'canceled' }));
  assert.equal(rpcCalls('dailyai_founding_transition').filter((c) => c.p_event === 'ended').length, 1);
});

test('review #2: why we cancelled is recorded in server-only metadata BEFORE the cancel; a customer-typed comment is not trusted', async () => {
  setup({ env: { ...FOUNDING_ENV, DAI_AUTO_CANCEL_DUPLICATE_TRIAL: 'true' } });
  seatRpc();
  const { h, customer, dup } = twoLiveSubs('trialing');
  await deliver(checkoutCompletedEvent({ sub: dup, userId: 'u_dup', customerId: customer.id }));
  const calls = h.stripe.calls.map((c) => c.method);
  const upd = h.stripe.callsTo('subscriptions.update').find((c) => c.args.params?.metadata?.dai_cancel_reason);
  assert.equal(upd.args.params.metadata.dai_cancel_reason, 'duplicate_trial');
  assert.ok(calls.indexOf('subscriptions.update') < calls.indexOf('subscriptions.cancel'));
  assert.equal(h.stripe.subscriptions.find((x) => x.id === dup.id).metadata.dai_cancel_reason, 'duplicate_trial');
  // a customer who cancels their OWN bound subscription in the portal typing "duplicate_trial" still ends their seat
  const { sub: own } = seedSubscription({ userId: 'u_typed', status: 'trialing', priceId: FOUNDING });
  own.metadata.founding_seat_id = '42';
  h.db.seed('dailyai_founding_seats', [{ id: 42, stripe_subscription_id: own.id, status: 'trialing' }]);
  await deliver(subscriptionEvent('customer.subscription.deleted', { ...JSON.parse(JSON.stringify(own)), status: 'canceled', cancellation_details: { comment: 'duplicate_trial: typed by the customer' } }));
  assert.ok(rpcCalls('dailyai_founding_transition').some((c) => c.p_event === 'ended' && c.p_seat === 42));
});

test('review #2: trial-reuse cancellation also writes dai_cancel_reason=trial_reuse and is recognised from metadata alone', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  captureEmails();
  const h = harness();
  h.stripe.paymentMethods.pm_1 = { type: 'card', card: { fingerprint: 'fp_used' } };
  h.db.rpcHandlers.set('dailyai_claim_trial_fingerprint', async () => 'reused');
  const c = h.stripe.addCustomer({ email: 'r@example.test' });
  const sub = h.stripe.addSubscription({ customer: c.id, status: 'trialing', priceId: FOUNDING, default_payment_method: 'pm_1', metadata: { user_id: 'u_r', founding_seat_id: '41' } });
  await deliver(checkoutCompletedEvent({ sub, userId: 'u_r', customerEmail: 'r@example.test' }));
  assert.equal(h.stripe.subscriptions.find((x) => x.id === sub.id).metadata.dai_cancel_reason, 'trial_reuse');
  h.stripe.subscriptions.find((x) => x.id === sub.id).cancellation_details = { comment: null };
  await deliver(checkoutCompletedEvent({ sub, userId: 'u_r', customerEmail: 'r@example.test' }));
  assert.equal(h.stripe.callsTo('subscriptions.cancel').length, 1);
  assert.equal(h.stripe.callsTo('subscriptions.update').filter((x) => x.args.params?.metadata?.trial_reuse_notified).length, 1, 'email marked once; a metadata-only refusal is not re-run');
});

test("review #4: a redelivered checkout for an already-cancelled duplicate never upserts it over the user's row nor ends the shared seat", async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const h = harness();
  const { customer, sub: primary } = seedSubscription({ userId: 'u_gone', status: 'canceled', priceId: FOUNDING });
  const dup = h.stripe.addSubscription({ customer: customer.id, status: 'canceled', priceId: FOUNDING, metadata: { user_id: 'u_gone', founding_seat_id: '41', dai_cancel_reason: 'duplicate_trial' } });
  const res = await deliver(checkoutCompletedEvent({ sub: dup, userId: 'u_gone', customerId: customer.id }));
  assert.equal(res.status, 200);
  assert.equal(h.db.rows('user_subscriptions').find((r) => r.user_id === 'u_gone').stripe_subscription_id, primary.id);
  assert.equal(rpcCalls('dailyai_founding_transition').length, 0);
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
  assert.match(j.error, /already has a DailyAI subscription/i);
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

test('DAI-13: login typed in mixed case still finds a customer stored in lower case (the lower-cased lookup)', async () => {
  const h = harness();
  const old = h.stripe.addCustomer({ email: 'john@gmail.com' });
  h.stripe.addSubscription({ customer: old.id, status: 'trialing', priceId: DAILYAI_PRICE_ID });
  const u = bearerUser('u_mixed', 'John@Gmail.com');
  assert.equal((await checkout({ headers: u.headers })).status, 409);
});

// Case gap (closed): customers.list's email filter is case-sensitive (CustomersResource.d.ts), so the lookup also
// runs customers.search with `email:'...'`: Stripe search's `:` is case-insensitive (docs.stripe.com/search) but on a
// string field matches values CONTAINING the words, so hits are re-checked for an exact lower-cased match. Search is
// eventually consistent (~1 min), so the exact and lower-cased list calls stay. Plus/dot aliases are out of scope.
test('DAI-13 case: customer "John@Gmail.com" with a live sub, login "john@gmail.com" is refused', async () => {
  const h = harness();
  const old = h.stripe.addCustomer({ email: 'John@Gmail.com' });
  h.stripe.addSubscription({ customer: old.id, status: 'active', priceId: DAILYAI_PRICE_ID });
  const u = bearerUser('u_gap', 'john@gmail.com');
  assert.equal((await checkout({ headers: u.headers })).status, 409);
  assert.equal(h.stripe.sessions.length, 0);
});

test('DAI-13 case: a mixed-case customer holding only ANOTHER product (or a canceled DailyAI sub) does not block', async () => {
  const h = harness();
  const old = h.stripe.addCustomer({ email: 'Mary@Example.test' });
  h.stripe.addSubscription({ customer: old.id, status: 'active', priceId: 'price_someone_else' });
  h.stripe.addSubscription({ customer: old.id, status: 'canceled', priceId: DAILYAI_PRICE_ID });
  assert.equal((await checkout({ headers: bearerUser('u_mary', 'mary@example.test').headers })).status, 200);
});

test('DAI-13 case: a search hit whose email only CONTAINS the login (not equal) does not block', async () => {
  const h = harness();
  const near = h.stripe.addCustomer({ email: 'Ann@Example.test.other' });
  h.stripe.addSubscription({ customer: near.id, status: 'active', priceId: DAILYAI_PRICE_ID });
  assert.equal((await checkout({ headers: bearerUser('u_ann', 'ann@example.test').headers })).status, 200);
});

test('DAI-13 case: the exact list lookup still catches a customer the search index has not picked up yet', async () => {
  const h = harness();
  const old = h.stripe.addCustomer({ email: 'fresh@example.test' });
  h.stripe.searchLag.add(old.id);
  h.stripe.addSubscription({ customer: old.id, status: 'trialing', priceId: DAILYAI_PRICE_ID });
  assert.equal((await checkout({ headers: bearerUser('u_fresh', 'fresh@example.test').headers })).status, 409);
});

test('DAI-13 case: quotes and backslashes in the email are escaped in the search query', async () => {
  const h = harness();
  const old = h.stripe.addCustomer({ email: "O'Brien@Example.test" });
  h.stripe.addSubscription({ customer: old.id, status: 'active', priceId: DAILYAI_PRICE_ID });
  assert.equal((await checkout({ headers: bearerUser('u_ob', "o'brien@example.test").headers })).status, 409);
  const q = h.stripe.callsTo('customers.search').map((c) => c.args.query);
  assert.ok(q.includes("email:'o\\'brien@example.test'"), q.join(' | '));
});

test('DAI-13 case: a failed search fails CLOSED (no customer, no Checkout Session)', async () => {
  const h = harness();
  h.stripe.fail({ method: 'customers.search' });
  const res = await checkout({ headers: bearerUser('u_sfail', 'sfail@example.test').headers });
  assert.ok(res.status >= 500, `HTTP ${res.status}`);
  assert.equal(h.stripe.callsTo('customers.search').length, 1, 'search was attempted');
  assert.equal(h.stripe.callsTo('customers.create').length, 0);
  assert.equal(h.stripe.sessions.length, 0);
});

test('DAI-13 case: one free trial per person also across a mixed-case customer (no second trial)', async () => {
  const h = harness();
  const old = h.stripe.addCustomer({ email: 'Trial@Example.test' });
  h.stripe.addSubscription({ customer: old.id, status: 'canceled', priceId: DAILYAI_PRICE_ID });
  assert.equal((await checkout({ headers: bearerUser('u_trial', 'trial@example.test').headers })).status, 200);
  assert.equal(h.stripe.sessions.at(-1).subscription_data.trial_period_days, undefined, 'a second trial was offered');
});

// ---------------------------------------------------------------- N1: a duplicate never takes the seat

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

function foundingPair({ primaryStatus = 'trialing', seatStatus = 'trialing' } = {}) {
  const h = harness();
  const { customer, sub: primary } = seedSubscription({ userId: 'u_seat', status: primaryStatus, priceId: FOUNDING });
  primary.metadata.founding_seat_id = '41';
  h.db.seed('dailyai_founding_seats', [{ id: 41, stripe_customer_id: customer.id, user_id: 'u_seat', stripe_subscription_id: primary.id, status: seatStatus }]);
  h.stripe.invoices.in_dup = { status: 'paid', amount_paid: 999 };
  const dup = h.stripe.addSubscription({ customer: customer.id, status: 'active', priceId: FOUNDING, latest_invoice: 'in_dup', metadata: { user_id: 'u_seat', founding_seat_id: '41' } });
  const seat = () => h.db.rows('dailyai_founding_seats').find((s) => s.id === 41);
  const paid = (sub, id) => stripeEvent('invoice.paid', { id, object: 'invoice', amount_paid: 999, parent: { subscription_details: { subscription: sub.id } } });
  return { h, customer, primary, dup, seat, paid };
}

test("N1: a PAID duplicate's invoice.paid never re-binds the live subscription's seat; cancelling the duplicate leaks nothing", async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const { primary, dup, seat, paid } = foundingPair();
  const { res, lines } = await deliverLogs(paid(dup, 'in_dup'));
  assert.equal(res.status, 200);
  assert.equal(seat().stripe_subscription_id, primary.id, 'seat re-bound to the duplicate');
  assert.equal(seat().status, 'trialing');
  assert.ok(lines.some((l) => l.includes('[billing-alert] duplicate_subscription') && l.includes(dup.id) && l.includes(primary.id)), lines.join('\n'));
  // the duplicate is cancelled (refund or by hand): the legitimate seat is untouched
  assert.equal((await deliver(subscriptionEvent('customer.subscription.deleted', { ...JSON.parse(JSON.stringify(dup)), status: 'canceled' }))).status, 200);
  assert.equal(seat().stripe_subscription_id, primary.id);
  assert.equal(seat().status, 'trialing');
});

test('N1: the legitimate subscription keeps converting and ending its own seat as before', async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const { h, primary, dup, seat, paid } = foundingPair();
  await deliver(paid(dup, 'in_dup'));
  h.stripe.invoices.in_primary = { status: 'paid', amount_paid: 999 };
  const p = h.stripe.subscriptions.find((s) => s.id === primary.id);
  p.status = 'active'; p.latest_invoice = 'in_primary';
  assert.equal((await deliver(paid(primary, 'in_primary'))).status, 200);
  assert.equal(seat().status, 'converted');
  assert.equal(seat().stripe_subscription_id, primary.id);
  // a renewal of the duplicate still changes nothing
  assert.equal((await deliver(paid(dup, 'in_dup'))).status, 200);
  assert.equal(seat().stripe_subscription_id, primary.id);
  // the bound subscription ending ends the seat
  await deliver(subscriptionEvent('customer.subscription.deleted', { ...JSON.parse(JSON.stringify(p)), status: 'canceled' }));
  assert.equal(seat().status, 'ended');
});

test('N1: a seat whose bound subscription has ENDED may still be re-claimed by a new subscription (unchanged)', async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const { h, primary, dup, seat, paid } = foundingPair({ primaryStatus: 'canceled', seatStatus: 'released' });
  assert.equal(h.stripe.subscriptions.find((s) => s.id === primary.id).status, 'canceled');
  assert.equal((await deliver(paid(dup, 'in_dup'))).status, 200);
  assert.equal(seat().stripe_subscription_id, dup.id);
  assert.equal(seat().status, 'converted');
});

test('N1: a seat read error is retried (5xx) and the seat is not moved', async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const { h, primary, dup, seat, paid } = foundingPair();
  h.db.fail({ table: 'dailyai_founding_seats', op: 'select', times: 1 });
  const ev = paid(dup, 'in_dup');
  assert.ok((await deliver(ev)).status >= 500);
  assert.equal(seat().stripe_subscription_id, primary.id);
  assert.equal(rpcCalls('dailyai_founding_transition').length, 0);
  assert.equal((await deliver(ev)).status, 200);
  assert.equal(seat().stripe_subscription_id, primary.id);
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

test('review #5: IPv6 clients are limited by /64; an unknown IP is never limited', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  for (let i = 0; i < 3; i++) assert.equal((await checkout({ headers: bearerUser(`u_v6${i}`).headers, ip: `2001:db8:1:2::${i + 1}` })).status, 200);
  assert.equal((await checkout({ headers: bearerUser('u_v6x').headers, ip: '2001:db8:1:2:ffff::9' })).status, 429);
  assert.equal((await checkout({ headers: bearerUser('u_v6y').headers, ip: '2001:db8:1:3::1' })).status, 200, 'a different /64 is unaffected');
  for (let i = 0; i < 5; i++) assert.equal((await checkout({ headers: { ...bearerUser(`u_unk${i}`).headers, 'x-forwarded-for': '' } })).status, 200);
});

test('review #5: a hold counts only once its Checkout Session exists (failed creates and price-changed 409s do not use up the limit)', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const ip = '198.51.100.77';
  for (let i = 0; i < 3; i++) {
    const r = await checkout({ headers: bearerUser(`u_pc${i}`).headers, ip, body: { expectedCents: 2000 } });
    assert.equal(r.status, 409);
    assert.equal((await body(r)).priceChanged, true);
  }
  harness().stripe.fail({ method: 'checkout.sessions.create', times: 3 });
  for (let i = 0; i < 3; i++) assert.equal((await checkout({ headers: bearerUser(`u_fail${i}`).headers, ip })).status, 500);
  for (let i = 0; i < 3; i++) assert.equal((await checkout({ headers: bearerUser(`u_ok${i}`).headers, ip })).status, 200);
  assert.equal((await checkout({ headers: bearerUser('u_over').headers, ip })).status, 429);
});
