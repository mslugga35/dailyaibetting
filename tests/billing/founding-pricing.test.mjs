/**
 * Founding Member pricing: plan selection, checkout parameters, seat transitions
 * driven by Stripe webhooks, customer-facing copy, and the billing-metrics endpoint.
 *
 * The seat functions are Postgres functions (supabase/migrations/2026111700000*_dailyai_founding_seats.sql);
 * here they are fake RPC handlers that record calls. Their concurrency guarantee is
 * proven against a real local Postgres by local-test/founding-concurrency.mjs.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  setup, harness, req, body, quietly, bearerUser, seedSubscription,
  checkoutCompletedEvent, subscriptionEvent, stripeEvent, signedWebhookRequest, DAILYAI_PRICE_ID,
} from '../harness/helpers.mjs';

const FOUNDING = 'price_test_dailyai_founding_999';
const REGULAR = 'price_test_dailyai_regular_1999';
const FOUNDING_ENV = { PRICING_MODE: 'founding', STRIPE_PRICE_FOUNDING: FOUNDING, STRIPE_PRICE_PRO: REGULAR };

const { POST: checkoutPOST } = await import('../../src/app/api/checkout/route.ts');
const { POST: webhookPOST } = await import('../../src/app/api/webhooks/stripe/route.ts');
const { GET: metricsGET } = await import('../../src/app/api/admin/billing-metrics/route.ts');
const offerMod = await import('../../src/lib/pricing/offer.ts');
const { offerCopy, formatMonthly } = await import('../../src/lib/pricing/plans.ts');
const { summarize } = await import('../../src/lib/pricing/metrics.ts');

const checkout = (opts = {}) => quietly(() => checkoutPOST(req('/api/checkout', { method: 'POST', body: {}, ...opts })));
const deliver = (event) => quietly(() => webhookPOST(signedWebhookRequest(event)));
const rpcCalls = (name) => harness().db.log.filter((l) => l.op === 'rpc' && l.name === name).map((l) => l.args);

/** Fake seat functions: reserve returns `outcome`; transition echoes the event. */
function seatRpc({ outcome = 'reserved', seatId = 41, taken = 1 } = {}) {
  const h = harness();
  h.stripe.prices[FOUNDING] = { unit_amount: 999 };
  h.stripe.prices[REGULAR] = { unit_amount: 1999 };
  h.db.rpcHandlers.set('dailyai_founding_reserve', async () => [{ seat_id: outcome === 'reserved' || outcome === 'existing' ? seatId : null, outcome, taken }]);
  h.db.rpcHandlers.set('dailyai_founding_transition', async (a) => [{ seat_id: a.p_seat ?? seatId, status: a.p_event, over_cap: false }]);
  h.db.rpcHandlers.set('dailyai_founding_stats', async () => [{ reserved: 0, trialing: 0, converted: taken, ended: 0, released: 0, taken }]);
}

beforeEach(() => { setup(); offerMod.resetOfferCache(); offerMod.resetPriceVerification(); });

// ---------------------------------------------------------------- copy

test('legacy copy is word-for-word what the site said before ($20, 7-day trial)', () => {
  const c = offerCopy({ mode: 'legacy', plan: 'legacy', amountCents: 2000, trialDays: 7, founding: null });
  assert.equal(c.price, '$20/mo');
  assert.equal(c.ctaNew, 'Try 7 Days Free (New Members)');
  assert.equal(c.ctaReturning, 'Upgrade to Pro – $20/mo');
  assert.equal(c.after, "Then $20/mo. Cancel anytime before the trial ends and you won't be charged.");
  assert.equal(c.terms, "7-day free trial for first-time members, then $20/mo. Cancel anytime before the trial ends and you won't be charged.");
  assert.equal(c.lock, null);
});

test('founding copy states price, renewal, cancellation, the lock terms and an honest seat count', () => {
  assert.equal(formatMonthly(999), '$9.99/mo');
  assert.equal(formatMonthly(1999), '$19.99/mo');
  const c = offerCopy({ mode: 'founding', plan: 'founding', amountCents: 999, trialDays: 7, founding: { cap: 100, remaining: 63, soldOut: false } });
  assert.equal(c.price, '$9.99/mo');
  assert.match(c.terms, /7-day free trial for first-time members, then \$9\.99\/mo \(Founding Member price\)/);
  assert.match(c.renewal, /Renews every month at \$9\.99 until you cancel/);
  assert.match(c.renewal, /keep Pro until the end of the period you already paid for/);
  assert.match(c.lock, /locked for as long as your subscription stays active/);
  assert.match(c.lock, /payment can't be collected/);
  assert.equal(c.seats, '63 of 100 Founding Member spots left (limited to the first 100 paying members).');
  const unknown = offerCopy({ mode: 'founding', plan: 'founding', amountCents: 999, trialDays: 7, founding: { cap: 100, remaining: null, soldOut: false } });
  assert.doesNotMatch(unknown.seats, /\d+ of/, 'no made-up count when the count is unavailable');
  assert.equal(offerCopy(null).price, null, 'nothing shown before the offer is known');
});

// ---------------------------------------------------------------- offer

test('no PRICING_MODE = legacy $20 exactly as before, no database read', async () => {
  const o = await offerMod.getCurrentOffer();
  assert.deepEqual(o, { mode: 'legacy', plan: 'legacy', amountCents: 2000, trialDays: 7, founding: null });
  assert.equal(rpcCalls('dailyai_founding_stats').length, 0);
});

test('founding offer reads the seat count; sold out = closed by default, regular only when configured', async () => {
  setup({ env: { ...FOUNDING_ENV, FOUNDING_SEAT_CAP: '3' } });
  seatRpc({ taken: 1 });
  let o = await offerMod.getCurrentOffer();
  assert.equal(o.plan, 'founding');
  assert.equal(o.amountCents, 999);
  assert.deepEqual(o.founding, { cap: 3, remaining: 2, soldOut: false });

  offerMod.resetOfferCache(); seatRpc({ taken: 3 });
  o = await offerMod.getCurrentOffer();
  assert.equal(o.plan, null);
  assert.equal(o.founding.soldOut, true);

  setup({ env: { ...FOUNDING_ENV, FOUNDING_SEAT_CAP: '3', FOUNDING_SOLD_OUT: 'regular' } });
  offerMod.resetOfferCache(); seatRpc({ taken: 3 });
  o = await offerMod.getCurrentOffer();
  assert.equal(o.plan, 'regular');
  assert.equal(o.amountCents, 1999);
});

test('a former founding member is shown the regular price, not $9.99', () => {
  setup({ env: FOUNDING_ENV });
  const base = { mode: 'founding', plan: 'founding', amountCents: 999, trialDays: 7, founding: { cap: 100, remaining: 50, soldOut: false } };
  assert.equal(offerMod.personalizeOffer(base, FOUNDING).plan, 'regular');
  assert.equal(offerMod.personalizeOffer(base, DAILYAI_PRICE_ID).plan, 'founding');
});

// ---------------------------------------------------------------- checkout

test('legacy checkout is unchanged: $20 price, trial, promotion codes allowed, no expiry, no seat', async () => {
  const u = bearerUser('u_legacy');
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 200);
  const [s] = harness().stripe.sessions;
  assert.deepEqual(s.line_items, [{ price: DAILYAI_PRICE_ID, quantity: 1 }]);
  assert.equal(s.allow_promotion_codes, true);
  assert.equal(s.expires_at, undefined);
  assert.deepEqual(s.metadata, { user_id: 'u_legacy' });
  assert.equal(rpcCalls('dailyai_founding_reserve').length, 0);
});

test('founding checkout reserves a seat, charges the founding price, expires in 31 min, no promo codes, terms on the page', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc({ seatId: 7 });
  const u = bearerUser('u_f1');
  const before = Math.floor(Date.now() / 1000);
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 200);
  const [s] = harness().stripe.sessions;
  assert.deepEqual(s.line_items, [{ price: FOUNDING, quantity: 1 }]);
  assert.equal(s.allow_promotion_codes, false);
  assert.ok(s.expires_at >= before + 31 * 60 && s.expires_at <= before + 31 * 60 + 5);
  assert.equal(s.subscription_data.trial_period_days, 7);
  assert.equal(s.metadata.founding_seat_id, '7');
  assert.equal(s.subscription_data.metadata.founding_seat_id, '7');
  assert.match(s.custom_text.submit.message, /\$9\.99/);
  assert.match(s.custom_text.submit.message, /locked for as long as your subscription stays active/);
  const [r] = rpcCalls('dailyai_founding_reserve');
  assert.equal(r.p_cap, 100);
  assert.equal(r.p_hold_seconds, 91 * 60, 'hold outlives the 31-minute session by an hour');
  assert.equal(r.p_max_holds, 20);
  const [t] = rpcCalls('dailyai_founding_transition');
  assert.equal(t.p_event, 'session');
  assert.equal(t.p_seat, 7);
  assert.equal(t.p_session, s.id);
});

test('FOUNDING_TRIAL_DAYS=0 gives founding members no trial', async () => {
  setup({ env: { ...FOUNDING_ENV, FOUNDING_TRIAL_DAYS: '0' } });
  seatRpc();
  const u = bearerUser('u_notrial');
  await checkout({ headers: u.headers });
  assert.equal(harness().stripe.sessions[0].subscription_data.trial_period_days, undefined);
});

test('sold out (default closed) → 409, no Checkout Session', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc({ outcome: 'sold_out', taken: 100 });
  const u = bearerUser('u_late');
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 409);
  assert.equal((await body(res)).soldOut, true);
  assert.equal(harness().stripe.sessions.length, 0);
});

test('sold out with FOUNDING_SOLD_OUT=regular → regular $19.99 price, promo codes as before', async () => {
  setup({ env: { ...FOUNDING_ENV, FOUNDING_SOLD_OUT: 'regular' } });
  seatRpc({ outcome: 'sold_out', taken: 100 });
  const u = bearerUser('u_late2');
  assert.equal((await checkout({ headers: u.headers })).status, 200);
  const [s] = harness().stripe.sessions;
  assert.deepEqual(s.line_items, [{ price: REGULAR, quantity: 1 }]);
  assert.equal(s.metadata.plan, 'regular');
  assert.equal(s.metadata.founding_seat_id, undefined);
});

test('a returning former founding member gets the regular price', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc({ outcome: 'returning' });
  const u = bearerUser('u_back');
  assert.equal((await checkout({ headers: u.headers })).status, 200);
  assert.deepEqual(harness().stripe.sessions[0].line_items, [{ price: REGULAR, quantity: 1 }]);
});

test('Stripe fails to create the session → the seat this request reserved is released', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc({ seatId: 9 });
  harness().stripe.fail({ method: 'checkout.sessions.create' });
  const u = bearerUser('u_fail');
  assert.equal((await checkout({ headers: u.headers })).status, 500);
  const abandon = rpcCalls('dailyai_founding_transition').find((a) => a.p_event === 'abandon');
  assert.equal(abandon?.p_seat, 9);
});

test('founding mode without STRIPE_PRICE_FOUNDING fails closed (500, no session, no other price)', async () => {
  setup({ env: { PRICING_MODE: 'founding' } });
  const u = bearerUser('u_cfg');
  assert.equal((await checkout({ headers: u.headers })).status, 500);
  assert.equal(harness().stripe.sessions.length, 0);
});

test('seat database unavailable → 500, no Checkout Session (never sells a seat it could not count)', async () => {
  setup({ env: FOUNDING_ENV });
  const u = bearerUser('u_dbdown');
  assert.equal((await checkout({ headers: u.headers })).status, 500);
  assert.equal(harness().stripe.sessions.length, 0);
});

test('too many open founding checkouts (busy) → 409 try later, not "sold out"', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc({ outcome: 'busy' });
  const u = bearerUser('u_busy');
  const res = await checkout({ headers: u.headers });
  assert.equal(res.status, 409);
  const b = await body(res);
  assert.equal(b.soldOut, false);
  assert.match(b.error, /try again/i);
  assert.equal(harness().stripe.sessions.length, 0);
});

test('page showed a different price than checkout would charge → 409 priceChanged, seat given back, no session', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc({ seatId: 12 });
  const u = bearerUser('u_stale');
  const res = await checkout({ headers: u.headers, body: { expectedCents: 1999 } });
  assert.equal(res.status, 409);
  const b = await body(res);
  assert.equal(b.priceChanged, true);
  assert.equal(b.amountCents, 999);
  assert.equal(harness().stripe.sessions.length, 0);
  assert.equal(rpcCalls('dailyai_founding_transition').find((a) => a.p_event === 'abandon')?.p_seat, 12);
  const ok = await checkout({ headers: bearerUser('u_fresh').headers, body: { expectedCents: 999 } });
  assert.equal(ok.status, 200, 'matching expected price proceeds');
});

test('a Stripe price whose amount differs from the displayed price fails closed (500, no session)', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  harness().stripe.prices[FOUNDING] = { unit_amount: 1000 };
  const res = await checkout({ headers: bearerUser('u_wrongprice').headers });
  assert.equal(res.status, 500);
  assert.equal(harness().stripe.sessions.length, 0);
  assert.equal(rpcCalls('dailyai_founding_reserve').length, 0, 'no seat reserved');
});

test('billing portal in founding mode without a no-switch portal configuration → 503 (fail closed)', async () => {
  const { POST: portalPOST } = await import('../../src/app/api/billing-portal/route.ts');
  setup({ env: FOUNDING_ENV });
  const u = bearerUser('u_portal');
  seedSubscription({ userId: 'u_portal', status: 'active' });
  const res = await quietly(() => portalPOST(req('/api/billing-portal', { method: 'POST', headers: u.headers })));
  assert.equal(res.status, 503);
  setup({ env: { ...FOUNDING_ENV, STRIPE_PORTAL_CONFIGURATION_ID: 'bpc_test_noswitch' } });
  const u2 = bearerUser('u_portal2');
  seedSubscription({ userId: 'u_portal2', status: 'active' });
  const ok = await quietly(() => portalPOST(req('/api/billing-portal', { method: 'POST', headers: u2.headers })));
  assert.equal(ok.status, 200);
  assert.equal(harness().stripe.portalSessions[0].configuration, 'bpc_test_noswitch');
});

// ---------------------------------------------------------------- webhook

function foundingSub({ status = 'trialing', seat = '41' } = {}) {
  const h = harness();
  const customer = h.stripe.addCustomer({ email: 'f@example.test' });
  return h.stripe.addSubscription({ customer: customer.id, status, priceId: FOUNDING, metadata: { user_id: 'u_fw', founding_seat_id: seat } });
}

test('founding subscription is accepted (row written, plan price recorded) and its seat moves to trialing', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const sub = foundingSub();
  const res = await deliver(checkoutCompletedEvent({ sub, userId: 'u_fw' }));
  assert.equal(res.status, 200);
  const row = harness().db.dump('user_subscriptions').find((r) => r.user_id === 'u_fw');
  assert.equal(row.status, 'trialing');
  assert.equal(row.price_id, FOUNDING);
  const [t] = rpcCalls('dailyai_founding_transition');
  assert.deepEqual([t.p_event, t.p_seat, t.p_subscription], ['started', 41, sub.id]);
});

test('active founding subscription converts its seat only when the latest invoice collected money', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const h = harness();
  h.stripe.invoices.in_open = { status: 'open', amount_paid: 0 };
  h.stripe.invoices.in_paid = { status: 'paid', amount_paid: 999 };
  const unpaid = foundingSub({ status: 'active' });
  unpaid.latest_invoice = 'in_open'; // trial just ended, first charge not collected yet
  await deliver(checkoutCompletedEvent({ sub: unpaid, userId: 'u_fw' }));
  assert.equal(rpcCalls('dailyai_founding_transition')[0].p_event, 'started');
  setup({ env: FOUNDING_ENV });
  seatRpc();
  harness().stripe.invoices.in_paid = { status: 'paid', amount_paid: 999 };
  const paid = foundingSub({ status: 'active' });
  paid.latest_invoice = 'in_paid';
  await deliver(checkoutCompletedEvent({ sub: paid, userId: 'u_fw' }));
  assert.equal(rpcCalls('dailyai_founding_transition')[0].p_event, 'paid');
});

test('invoice.paid with money collected converts the seat; a $0 invoice does not', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const sub = foundingSub({ status: 'active' });
  sub.latest_invoice = 'in_1';
  harness().stripe.invoices.in_1 = { status: 'paid', amount_paid: 999 };
  const inv = (amount) => stripeEvent('invoice.paid', { id: 'in_1', object: 'invoice', amount_paid: amount, parent: { subscription_details: { subscription: sub.id } } });
  await deliver(inv(0));
  assert.equal(rpcCalls('dailyai_founding_transition').length, 0);
  await deliver(inv(999));
  const [t] = rpcCalls('dailyai_founding_transition');
  assert.deepEqual([t.p_event, t.p_seat], ['paid', 41]);
});

test('invoice.paid arriving after the subscription already ended does not convert the seat', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const sub = foundingSub({ status: 'canceled' });
  await deliver(stripeEvent('invoice.paid', { id: 'in_late', object: 'invoice', amount_paid: 999, parent: { subscription_details: { subscription: sub.id } } }));
  const [t] = rpcCalls('dailyai_founding_transition');
  assert.equal(t.p_event, 'ended');
});

test('subscription deleted → seat ended (released if never paid, decided by the database)', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const sub = foundingSub();
  await deliver(subscriptionEvent('customer.subscription.deleted', { ...sub, status: 'canceled' }));
  assert.equal(rpcCalls('dailyai_founding_transition')[0].p_event, 'ended');
});

test('checkout.session.expired releases the founding hold of that session only', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  await deliver(stripeEvent('checkout.session.expired', { id: 'cs_old', object: 'checkout.session', mode: 'subscription', metadata: { founding_seat_id: '41' } }));
  const [t] = rpcCalls('dailyai_founding_transition');
  assert.deepEqual([t.p_event, t.p_seat, t.p_session], ['expired', 41, 'cs_old']);
});

test('legacy $20 subscriptions never touch founding seats, in any mode', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const { sub } = seedSubscription({ userId: 'u_old', status: 'active' });
  await deliver(subscriptionEvent('customer.subscription.updated', { ...sub, cancel_at_period_end: true }));
  await deliver(stripeEvent('invoice.paid', { id: 'in_2', object: 'invoice', amount_paid: 2000, parent: { subscription_details: { subscription: sub.id } } }));
  assert.equal(rpcCalls('dailyai_founding_transition').length, 0);
  assert.equal(harness().db.dump('user_subscriptions').find((r) => r.user_id === 'u_old').price_id, DAILYAI_PRICE_ID);
});

test('a price that is not DailyAI\'s is still ignored with founding prices configured', async () => {
  setup({ env: FOUNDING_ENV });
  const h = harness();
  const c = h.stripe.addCustomer({ email: 'x@example.test' });
  const sub = h.stripe.addSubscription({ customer: c.id, status: 'active', priceId: 'price_someone_else' });
  await deliver(checkoutCompletedEvent({ sub, userId: 'u_x' }));
  assert.equal(h.db.dump('user_subscriptions').length, 0);
});

// ---------------------------------------------------------------- metrics

test('billing metrics: MRR by plan from active subs only, trial conversion, churn; no customer data', () => {
  setup({ env: FOUNDING_ENV });
  const now = 1_800_000_000;
  const sub = (price, cents, status, extra = {}) => ({ status, items: { data: [{ price: { id: price, unit_amount: cents }, quantity: 1 }] }, customer: 'cus_secret', ...extra });
  const m = summarize([
    sub(FOUNDING, 999, 'active', { trial_end: now - 86400 }),
    sub(FOUNDING, 999, 'trialing', { trial_end: now + 86400 }),
    sub(FOUNDING, 999, 'past_due', { trial_end: now - 86400 }),
    sub(DAILYAI_PRICE_ID, 2000, 'active'),
    sub(DAILYAI_PRICE_ID, 2000, 'canceled', { ended_at: now - 86400 }),
    sub('price_someone_else', 5000, 'active'),
  ], now);
  assert.equal(m.by_plan.founding.mrr_cents, 999);
  assert.equal(m.by_plan.founding.trialing, 1);
  assert.equal(m.by_plan.founding.past_due, 1);
  assert.equal(m.by_plan.legacy.mrr_cents, 2000);
  assert.equal(m.totals.mrr_cents, 2999, 'other products on the shared account excluded');
  assert.deepEqual(m.trials, { ended: 2, now_active: 1, conversion_rate: 0.5 });
  assert.equal(m.churn_30d_rate, +(1 / 3).toFixed(4));
  assert.doesNotMatch(JSON.stringify(m), /cus_/);
});

test('billing metrics endpoint requires the CRON_SECRET bearer', async () => {
  const res = await quietly(() => metricsGET(req('/api/admin/billing-metrics')));
  assert.equal(res.status, 401);
  const wrong = await quietly(() => metricsGET(req('/api/admin/billing-metrics', { headers: { Authorization: 'Bearer nope' } })));
  assert.equal(wrong.status, 401);
});
