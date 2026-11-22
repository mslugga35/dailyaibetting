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
  checkoutCompletedEvent, subscriptionEvent, stripeEvent, signedWebhookRequest, DAILYAI_PRICE_ID, captureEmails,
} from '../harness/helpers.mjs';
import { readFileSync } from 'node:fs';

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

test('founding offer reads the seat count; sold out = $19.99 automatically (Pro never closes)', async () => {
  setup({ env: { ...FOUNDING_ENV, FOUNDING_SEAT_CAP: '3' } });
  seatRpc({ taken: 1 });
  let o = await offerMod.getCurrentOffer();
  assert.equal(o.plan, 'founding');
  assert.equal(o.amountCents, 999);
  assert.deepEqual(o.founding, { cap: 3, remaining: 2, soldOut: false, paid: 1 });

  offerMod.resetOfferCache(); seatRpc({ taken: 3 });
  o = await offerMod.getCurrentOffer();
  assert.equal(o.plan, 'regular');
  assert.equal(o.amountCents, 1999);
  assert.equal(o.trialDays, 7);
  assert.equal(o.founding.soldOut, true);
});

test('sold out: no price-bearing text anywhere says $9.99; regular $19.99 with trial date and rules', () => {
  const soldOut = { mode: 'founding', plan: 'regular', amountCents: 1999, trialDays: 7, founding: { cap: 100, remaining: 0, soldOut: true } };
  const now = new Date('2026-11-17T15:00:00Z');
  const c = offerCopy(soldOut, now);
  const all = JSON.stringify(c);
  assert.doesNotMatch(all, /\$9\.99/);
  assert.equal(c.price, '$19.99/mo');
  assert.equal(c.ctaNew, 'Try 7 Days Free (New Members)');
  assert.equal(c.ctaReturning, 'Upgrade to Pro – $19.99/mo');
  assert.equal(c.lock, null, 'no founding lock offered once sold out');
  assert.equal(c.seats, 'All 100 Founding Member spots are taken.');
  assert.match(c.firstCharge, /first charge of \$19\.99 on November 24, 2026/);
  assert.match(c.firstChargeRelative, /first charge of \$19\.99 is 7 days after you start/);
  assert.match(c.trialRule, /One free trial per customer/);
  // the personalised offer for a former founder also stays regular
  setup({ env: FOUNDING_ENV });
  assert.equal(offerMod.personalizeOffer(soldOut, FOUNDING).plan, 'regular');
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
  assert.deepEqual(s.metadata, { user_id: 'u_legacy', app: 'dailyai' });
  assert.deepEqual(s.subscription_data.metadata, { user_id: 'u_legacy' }, 'subscription metadata unchanged');
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
  assert.match(s.custom_text.submit.message, /^You are subscribing to DailyAI Pro from DailyAI Betting \(dailyaibetting\.com\)\./);
  assert.ok(s.custom_text.submit.message.length <= 1200);
  assert.match(s.custom_text.submit.message, /you keep Pro until the end of the period you already paid for\.$/);
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

test('sold out → checkout sells regular $19.99 (no seat, promo codes as before, terms with first charge date)', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc({ outcome: 'sold_out', taken: 100 });
  const u = bearerUser('u_late2');
  assert.equal((await checkout({ headers: u.headers })).status, 200);
  const [s] = harness().stripe.sessions;
  assert.deepEqual(s.line_items, [{ price: REGULAR, quantity: 1 }]);
  assert.equal(s.metadata.plan, 'regular');
  assert.equal(s.metadata.founding_seat_id, undefined);
  assert.equal(s.subscription_data.trial_period_days, 7);
  assert.doesNotMatch(s.custom_text.submit.message, /\$9\.99/);
  assert.match(s.custom_text.submit.message, /first charge of \$19\.99 is 7 days after you start/);
  assert.match(s.custom_text.submit.message, /One free trial per customer/);
});

test('regular mode (owner flipped the switch) → $19.99 for new customers, Stripe price verified', async () => {
  setup({ env: { PRICING_MODE: 'regular', STRIPE_PRICE_PRO: REGULAR } });
  harness().stripe.prices[REGULAR] = { unit_amount: 1999 };
  const u = bearerUser('u_regular');
  assert.equal((await checkout({ headers: u.headers })).status, 200);
  assert.deepEqual(harness().stripe.sessions[0].line_items, [{ price: REGULAR, quantity: 1 }]);
  assert.equal(rpcCalls('dailyai_founding_reserve').length, 0);
});

test('founding mode without STRIPE_PRICE_PRO fails closed (the sold-out fallback must exist)', async () => {
  setup({ env: { PRICING_MODE: 'founding', STRIPE_PRICE_FOUNDING: FOUNDING } });
  seatRpc();
  assert.equal((await checkout({ headers: bearerUser('u_nopro').headers })).status, 500);
  assert.equal(harness().stripe.sessions.length, 0);
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
  assert.equal(b.busy, true);
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
  harness().db.seed('dailyai_founding_seats', [{ id: 41, stripe_subscription_id: sub.id, status: 'trialing' }]); // the seat is bound to this subscription
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

// ---------------------------------------------------------------- owner decisions (2026-11-17)

test('$20 legacy price and its subscribers are preserved in founding mode: allowed, never moved, cannot double-subscribe', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const { allowedPriceIds } = await import('../../src/lib/stripe-prices.ts');
  assert.ok(allowedPriceIds().has(DAILYAI_PRICE_ID), 'STRIPE_PRICE_ID stays an accepted DailyAI price');
  const u = bearerUser('u_twenty');
  const { sub } = seedSubscription({ userId: 'u_twenty', status: 'active' });
  // an active $20 subscriber cannot start a founding checkout
  assert.equal((await checkout({ headers: u.headers })).status, 400);
  assert.equal(harness().stripe.sessions.length, 0);
  // renewals / updates of the $20 subscription keep the $20 price and touch nothing else
  await deliver(subscriptionEvent('customer.subscription.updated', { ...sub }));
  await deliver(stripeEvent('invoice.paid', { id: 'in_20', object: 'invoice', amount_paid: 2000, parent: { subscription_details: { subscription: sub.id } } }));
  await deliver(checkoutCompletedEvent({ sub, userId: 'u_twenty' }));
  const row = harness().db.dump('user_subscriptions').find((r) => r.user_id === 'u_twenty');
  assert.equal(row.price_id, DAILYAI_PRICE_ID);
  assert.equal(row.status, 'active');
  assert.equal(harness().stripe.callsTo('subscriptions.update').length, 0, 'no automatic change to a $20 subscription');
  assert.equal(harness().stripe.subscriptions.find((x) => x.id === sub.id).items.data[0].price.id, DAILYAI_PRICE_ID);
  assert.equal(rpcCalls('dailyai_founding_transition').length, 0);
});

test('a former $20 subscriber who cancelled may join at $9.99 while seats remain (no second trial)', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc({ seatId: 77 });
  const u = bearerUser('u_was20');
  seedSubscription({ userId: 'u_was20', status: 'canceled' });
  assert.equal((await checkout({ headers: u.headers })).status, 200);
  const [s] = harness().stripe.sessions;
  assert.deepEqual(s.line_items, [{ price: FOUNDING, quantity: 1 }]);
  assert.equal(s.metadata.founding_seat_id, '77');
  assert.equal(s.subscription_data.trial_period_days, undefined, 'already had a trial');
});

test('one trial per person: another Stripe customer with the same email already subscribed → no trial', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const h = harness();
  const old = h.stripe.addCustomer({ email: 'twice@example.test' });
  h.stripe.addSubscription({ customer: old.id, status: 'canceled', priceId: DAILYAI_PRICE_ID });
  const u = bearerUser('u_twice', 'twice@example.test'); // signed-in path creates a NEW customer
  assert.equal((await checkout({ headers: u.headers })).status, 200);
  assert.equal(h.stripe.sessions[0].subscription_data.trial_period_days, undefined);
});

function trialingFoundingSubWithCard(fingerprint) {
  const h = harness();
  h.stripe.paymentMethods.pm_1 = { type: 'card', card: { fingerprint, last4: '4242' } };
  const customer = h.stripe.addCustomer({ email: 'card@example.test' });
  return h.stripe.addSubscription({ customer: customer.id, status: 'trialing', priceId: FOUNDING, default_payment_method: 'pm_1', metadata: { user_id: 'u_card', founding_seat_id: '41' } });
}

test('one trial per card: a reused card never gets charged — the new trial is cancelled without an invoice, access ends, seat released, customer emailed', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const emails = captureEmails();
  harness().db.rpcHandlers.set('dailyai_claim_trial_fingerprint', async () => 'reused');
  const sub = trialingFoundingSubWithCard('fp_used');
  await deliver(checkoutCompletedEvent({ sub, userId: 'u_card', customerEmail: 'card@example.test' }));
  const st = harness().stripe;
  // never converted to a paid subscription
  assert.equal(st.callsTo('subscriptions.update').filter((c) => c.args.params?.trial_end === 'now').length, 0);
  const [cancel] = st.callsTo('subscriptions.cancel');
  assert.equal(cancel?.args.id, sub.id);
  assert.equal(cancel.args.params.invoice_now, false);
  assert.equal(cancel.args.params.prorate, false);
  assert.equal(st.subscriptions.find((s) => s.id === sub.id).status, 'canceled');
  // access row reflects the cancellation now
  const row = harness().db.rows('user_subscriptions').find((r) => r.stripe_subscription_id === sub.id);
  assert.equal(row?.status, 'canceled');
  // the seat is ended (the database releases an unpaid trialing seat)
  assert.ok(rpcCalls('dailyai_founding_transition').some((c) => c.p_event === 'ended'), 'seat transitioned to ended');
  // one "no charge" email, no "access is active" email
  assert.equal(emails.length, 1);
  assert.match(emails[0].subject, /no charge/i);
  assert.match(emails[0].html, /have not been charged/);
  assert.deepEqual(emails[0].to, ['card@example.test']);
  const [claim] = rpcCalls('dailyai_claim_trial_fingerprint');
  assert.deepEqual([claim.p_fingerprint, claim.p_subscription], ['fp_used', sub.id]);

  // redelivery: subscription is no longer trialing → nothing cancelled or emailed twice
  await deliver(checkoutCompletedEvent({ sub, userId: 'u_card', customerEmail: 'card@example.test' }));
  assert.equal(st.callsTo('subscriptions.cancel').length, 1);
  assert.equal(emails.length, 1);
});

test('trial-reuse disclosure says no charge (never "charged from the first day")', () => {
  for (const f of ['src/lib/pricing/plans.ts', 'docs/legal-drafts/cancellation-refund-policy.md']) {
    const t = readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(t, /charged from the first day|charged from day one/i, f);
  }
});

test('one trial per card: a first-time card keeps its trial; legacy mode never checks (no migration needed)', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  harness().db.rpcHandlers.set('dailyai_claim_trial_fingerprint', async () => 'first');
  const sub = trialingFoundingSubWithCard('fp_new');
  await deliver(checkoutCompletedEvent({ sub, userId: 'u_card' }));
  // the trial is kept: no trial_end change, no cancel; only the "card checked" stamp for the success page
  const ups = harness().stripe.callsTo('subscriptions.update');
  assert.deepEqual(ups.map((u) => u.args.params), [{ metadata: { trial_card_checked: '1' } }]);
  assert.equal(harness().stripe.callsTo('subscriptions.cancel').length, 0);

  setup();
  const h = harness();
  h.stripe.paymentMethods.pm_1 = { type: 'card', card: { fingerprint: 'fp_used' } };
  const c = h.stripe.addCustomer({ email: 'l@example.test' });
  const legacySub = h.stripe.addSubscription({ customer: c.id, status: 'trialing', default_payment_method: 'pm_1' });
  await deliver(checkoutCompletedEvent({ sub: legacySub, userId: 'u_legacy_trial' }));
  assert.equal(rpcCalls('dailyai_claim_trial_fingerprint').length, 0);
  assert.equal(h.stripe.callsTo('subscriptions.update').length, 0);
});

test('charge.refunded / charge.dispute.created: recorded once per event for DailyAI customers, seat marked, nothing refunded or cancelled', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const h = harness();
  const { customer, sub } = seedSubscription({ userId: 'u_ref', status: 'active', priceId: FOUNDING });
  h.db.seed('dailyai_founding_seats', [{ id: 5, stripe_customer_id: customer.id, stripe_subscription_id: sub.id, status: 'converted', refunded_cents: 0, disputed_at: null }]);
  // charge -> PaymentIntent -> invoice -> subscription
  h.stripe.invoicePayments.pi_1 = 'in_ref1';
  h.stripe.invoicePayments.pi_2 = 'in_ref2';
  h.stripe.invoices.in_ref1 = { status: 'paid', amount_paid: 999, parent: { subscription_details: { subscription: sub.id } } };
  h.stripe.invoices.in_ref2 = { status: 'paid', amount_paid: 999, parent: { subscription_details: { subscription: sub.id } } };
  const refunded = stripeEvent('charge.refunded', { id: 'ch_1', object: 'charge', customer: customer.id, payment_intent: 'pi_1', amount: 999, amount_refunded: 999, refunded: true }, { id: 'evt_refund_1' });
  assert.equal((await deliver(refunded)).status, 200);
  assert.equal((await deliver(refunded)).status, 200, 'redelivery is fine');
  h.stripe.charges.ch_2 = { customer: customer.id, payment_intent: 'pi_2', amount: 999, amount_refunded: 0 };
  await deliver(stripeEvent('charge.dispute.created', { id: 'dp_1', object: 'dispute', charge: 'ch_2', amount: 999, reason: 'fraudulent' }, { id: 'evt_dispute_1' }));
  const events = h.db.dump('dailyai_billing_events');
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((e) => e.event_type).sort(), ['charge.dispute.created', 'charge.refunded']);
  assert.equal(events.find((e) => e.event_type === 'charge.refunded').stripe_subscription_id, sub.id);
  const seat = h.db.dump('dailyai_founding_seats')[0];
  assert.equal(seat.refunded_cents, 999);
  assert.ok(seat.disputed_at);
  assert.equal(h.stripe.callsTo('subscriptions.update').length, 0);
  assert.equal(h.db.dump('user_subscriptions').find((r) => r.user_id === 'u_ref').status, 'active', 'Pro ends only via the normal subscription events');

  // a refund on the SAME customer for another product's subscription is not DailyAI's: ignored
  const foreign = h.stripe.addSubscription({ customer: customer.id, status: 'active', priceId: 'price_someone_else' });
  h.stripe.invoicePayments.pi_x = 'in_x';
  h.stripe.invoices.in_x = { status: 'paid', amount_paid: 500, parent: { subscription_details: { subscription: foreign.id } } };
  await deliver(stripeEvent('charge.refunded', { id: 'ch_x', object: 'charge', customer: customer.id, payment_intent: 'pi_x', amount: 500, amount_refunded: 500 }, { id: 'evt_refund_x' }));
  // a one-off (non-invoice) charge is ignored too
  await deliver(stripeEvent('charge.refunded', { id: 'ch_y', object: 'charge', customer: customer.id, payment_intent: 'pi_none', amount: 300, amount_refunded: 300 }, { id: 'evt_refund_y' }));
  assert.equal(h.db.dump('dailyai_billing_events').length, 2);
  assert.equal(h.db.dump('dailyai_founding_seats')[0].refunded_cents, 999, 'other product refund not added to the seat');
});

test('card check never touches a legacy $20 trialing subscription, even in founding mode', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const h = harness();
  h.db.rpcHandlers.set('dailyai_claim_trial_fingerprint', async () => 'reused');
  h.stripe.paymentMethods.pm_1 = { type: 'card', card: { fingerprint: 'fp_used' } };
  const c = h.stripe.addCustomer({ email: 'old20@example.test' });
  const legacySub = h.stripe.addSubscription({ customer: c.id, status: 'trialing', priceId: DAILYAI_PRICE_ID, default_payment_method: 'pm_1' });
  await deliver(checkoutCompletedEvent({ sub: legacySub, userId: 'u_old20_trial' }));
  assert.equal(rpcCalls('dailyai_claim_trial_fingerprint').length, 0);
  assert.equal(h.stripe.callsTo('subscriptions.update').length, 0);
});

test('owner rule: at most 100 founding seats, paid seats are permanent (no setting can raise or free them)', async () => {
  const { pricingConfig } = await import('../../src/lib/pricing/offer.ts');
  setup({ env: { ...FOUNDING_ENV, FOUNDING_SEAT_CAP: '101' } });
  assert.throws(() => pricingConfig(), /FOUNDING_SEAT_CAP/);
  setup({ env: { ...FOUNDING_ENV, FOUNDING_SEAT_CAP: '100', FOUNDING_SEAT_COUNT: 'live' } });
  const cfg = pricingConfig();
  assert.equal(cfg.seatCap, 100);
  assert.equal(cfg.countEnded, true, 'FOUNDING_SEAT_COUNT=live is ignored');
  setup({ env: { ...FOUNDING_ENV } });
  assert.equal(pricingConfig().seatCap, 100, 'default is 100');
});

test('/api/checkout/status: the truth, only once settled (trial refused / trialing only after the card check / pending), nothing else', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  const { GET: statusGET } = await import('../../src/app/api/checkout/status/route.ts');
  const h = harness();
  const ask = async (id) => { const r = await quietly(() => statusGET(req(`/api/checkout/status?session_id=${id}`))); return { status: r.status, json: await r.json() }; };
  const sub = trialingFoundingSubWithCard('fp_x');
  const li = (price) => ({ data: [{ price: { id: price } }] });
  const sess = (extra) => { const s = { id: `cs_test_${'a'.repeat(12)}${h.stripe.sessions.length}`, mode: 'subscription', status: 'complete', subscription: sub.id, line_items: li(FOUNDING), ...extra }; h.stripe.sessions.push(s); return s.id; };
  const done = sess();
  const live = () => h.stripe.subscriptions.find((s) => s.id === sub.id);
  // card check not done yet: a refusal is still possible -> pending, never "trialing"
  assert.deepEqual((await ask(done)).json, { state: 'pending' });
  live().metadata = { ...live().metadata, trial_card_checked: '1' };
  assert.deepEqual((await ask(done)).json, { state: 'trialing' });
  // the webhook refused it for card reuse
  Object.assign(live(), { status: 'canceled', cancellation_details: { comment: 'trial_reuse: card already used for a DailyAI free trial; cancelled without charge' } });
  const r = await ask(done);
  assert.deepEqual(r.json, { state: 'trial_not_started' });
  assert.deepEqual(Object.keys(r.json), ['state'], 'no personal data');
  // an ordinary cancellation is NOT reported as a trial refusal
  live().cancellation_details = { comment: null };
  assert.deepEqual((await ask(done)).json, { state: 'pending' });
  assert.deepEqual((await ask(sess({ status: 'open' }))).json, { state: 'pending' });
  // malformed / unknown ids
  assert.equal((await ask('nope')).status, 400);
  assert.deepEqual((await ask('cs_test_doesnotexist1234')).json, { state: 'unknown' });
  // sessions of another product on the shared Stripe account: identical answer whatever their state (no oracle)
  const other = h.stripe.addSubscription({ customer: sub.customer, status: 'trialing', priceId: 'price_someone_else' });
  for (const [n, extra] of [['b', { status: 'complete' }], ['c', { status: 'open' }], ['d', { mode: 'payment', subscription: null }]]) {
    const oid = `cs_test_${n.repeat(14)}`; h.stripe.sessions.push({ id: oid, mode: 'subscription', subscription: other.id, line_items: li('price_someone_else'), ...extra });
    assert.deepEqual((await ask(oid)).json, { state: 'unknown' }, n);
  }
});

test('legacy mode: status reports trialing at once (no card check exists for the $20 plan)', async () => {
  setup();
  const { GET: statusGET } = await import('../../src/app/api/checkout/status/route.ts');
  const h = harness();
  const c = h.stripe.addCustomer({ email: 'leg@example.test' });
  const sub = h.stripe.addSubscription({ customer: c.id, status: 'trialing' });
  const id = `cs_test_${'e'.repeat(14)}`;
  h.stripe.sessions.push({ id, mode: 'subscription', status: 'complete', subscription: sub.id, line_items: { data: [{ price: { id: DAILYAI_PRICE_ID } }] } });
  const r = await quietly(() => statusGET(req(`/api/checkout/status?session_id=${id}`)));
  assert.deepEqual(await r.json(), { state: 'trialing' });
});

test('refused trial survives a partial failure: email failure -> 503 retry; redelivery sends once and stamps it', async () => {
  setup({ env: FOUNDING_ENV });
  seatRpc();
  harness().db.rpcHandlers.set('dailyai_claim_trial_fingerprint', async () => 'reused');
  const h = harness();
  let fail = true; const sent = [];
  h.fetchRoutes.set('https://api.resend.com/', async (_u, init) => {
    if (fail) return new Response('{"message":"down"}', { status: 500 });
    sent.push(JSON.parse(init.body)); return new Response('{"id":"e1"}', { status: 200 });
  });
  const sub = trialingFoundingSubWithCard('fp_used');
  const ev = checkoutCompletedEvent({ sub, userId: 'u_card', customerEmail: 'card@example.test' });
  const r1 = await deliver(ev);
  assert.equal(r1.status, 503, 'Stripe is asked to redeliver');
  const live = h.stripe.subscriptions.find((s) => s.id === sub.id);
  assert.equal(live.status, 'canceled', 'still cancelled: nothing can be charged');
  assert.equal(h.db.rows('user_subscriptions').find((r) => r.stripe_subscription_id === sub.id)?.status, 'canceled', 'access ended despite the email failure');
  assert.equal(sent.length, 0);
  fail = false;
  const r2 = await deliver(ev);
  assert.equal(r2.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(live.metadata.trial_reuse_notified, '1');
  await deliver(ev);
  assert.equal(sent.length, 1, 'never emailed twice');
  assert.equal(h.stripe.callsTo('subscriptions.cancel').length, 1, 'cancelled once');
});

test('refused trial with email not configured: no retry storm, manual follow-up logged', async () => {
  setup({ env: { ...FOUNDING_ENV, RESEND_API_KEY: undefined } });
  seatRpc();
  harness().db.rpcHandlers.set('dailyai_claim_trial_fingerprint', async () => 'reused');
  const sub = trialingFoundingSubWithCard('fp_used');
  const lines = [];
  const r = await quietly(async (l) => { const x = await webhookPOST(signedWebhookRequest(checkoutCompletedEvent({ sub, userId: 'u_card', customerEmail: 'card@example.test' }))); lines.push(...l); return x; });
  assert.equal(r.status, 200);
  assert.ok(lines.some((l) => /MANUAL FOLLOW-UP/.test(l)), lines.join(' | ').slice(0, 300));
  assert.equal(harness().stripe.subscriptions.find((s) => s.id === sub.id).status, 'canceled');
});

test('Nov 19: seat counter counts only PAID founding memberships; checkout holds and trials are named, never counted as sold', async () => {
  setup({ env: { ...FOUNDING_ENV, FOUNDING_SEAT_CAP: '100' } });
  seatRpc();
  harness().db.rpcHandlers.set('dailyai_founding_stats', async () => [{ reserved: 2, trialing: 1, converted: 0, ended: 0, released: 4, taken: 3 }]);
  const o = await offerMod.getCurrentOffer();
  assert.deepEqual(o.founding, { cap: 100, remaining: 97, soldOut: false, paid: 0 });
  const c = offerCopy(o);
  assert.equal(c.seats, '97 of 100 Founding Member spots left (limited to the first 100 paying members). 3 spots are reserved by members in checkout or a free trial and reopen if not paid.');
  const { foundingSeatsCopy } = await import('../../src/lib/pricing/plans.ts');
  assert.equal(foundingSeatsCopy({ cap: 100, remaining: 63, soldOut: false, paid: 37 }), '63 of 100 Founding Member spots left (limited to the first 100 paying members).');
  assert.match(foundingSeatsCopy({ cap: 3, remaining: 0, soldOut: true, paid: 1 }), /^No Founding Member spots are open right now. 2 spots are reserved/);
  assert.equal(foundingSeatsCopy({ cap: 3, remaining: 0, soldOut: true, paid: 3 }), 'All 3 Founding Member spots are taken.');
  assert.equal(foundingSeatsCopy({ cap: 3, remaining: null, soldOut: false, paid: null }), 'Limited to the first 3 paying members.');
});
