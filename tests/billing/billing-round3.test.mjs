/**
 * Billing hardening round 3 (Breaker re-review N1-N6, Security G1-G2):
 * tracked members are never treated as duplicates, deploy-time comment cutoff, trial
 * eligibility vs edited emails, promoted trials checked per card, owner must still exist,
 * full-token email redaction, promoted sub without user metadata.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  setup, harness, req, quietly, bearerUser, seedSubscription,
  checkoutCompletedEvent, subscriptionEvent, stripeEvent, signedWebhookRequest, DAILYAI_PRICE_ID, captureEmails,
} from '../harness/helpers.mjs';

const FOUNDING = 'price_test_dailyai_founding_999';
const REGULAR = 'price_test_dailyai_regular_1999';
const FOUNDING_ENV = { PRICING_MODE: 'founding', STRIPE_PRICE_FOUNDING: FOUNDING, STRIPE_PRICE_PRO: REGULAR };

const { POST: checkoutPOST } = await import('../../src/app/api/checkout/route.ts');
const { POST: webhookPOST } = await import('../../src/app/api/webhooks/stripe/route.ts');
const offerMod = await import('../../src/lib/pricing/offer.ts');
const holdLimit = await import('../../src/lib/pricing/hold-limit.ts');
const cancelMod = await import('../../src/lib/cancel-reason.ts');

const checkout = (opts = {}) => quietly(() => checkoutPOST(req('/api/checkout', { method: 'POST', body: {}, ...opts })));
const checkoutLogs = async (opts = {}) => { let res; const lines = []; await quietly(async (l) => { res = await checkoutPOST(req('/api/checkout', { method: 'POST', body: {}, ...opts })); lines.push(...l); }); return { res, lines }; };
const deliver = (event) => quietly(async () => webhookPOST(signedWebhookRequest(event)));
const deliverLogs = async (event) => { let res; const lines = []; await quietly(async (l) => { res = await webhookPOST(signedWebhookRequest(event)); lines.push(...l); }); return { res, lines }; };
const clone = (x) => JSON.parse(JSON.stringify(x));
const paidEvent = (sub, id) => stripeEvent('invoice.paid', { id, object: 'invoice', amount_paid: 999, parent: { subscription_details: { subscription: sub.id } } });
const del = (s) => subscriptionEvent('customer.subscription.deleted', { ...clone(s), status: 'canceled' });

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

// ---------------------------------------------------------------- N1: a tracked / seat-bound member is never a "duplicate"

/** Customer with an OLDER untracked live DailyAI sub (e.g. an old double-billing) and the NEWER sub the row tracks. */
function trackedWithOlderUntracked({ seatBound = true, seatStatus = 'trialing' } = {}) {
  const h = harness();
  const c = h.stripe.addCustomer({ email: 'm@example.test', metadata: { user_id: 'u_m' } });
  const older = h.stripe.addSubscription({ customer: c.id, status: 'active', priceId: FOUNDING, metadata: { user_id: 'u_m' } });
  h.stripe.invoices.in_cur = { status: 'paid', amount_paid: 999 };
  const cur = h.stripe.addSubscription({ customer: c.id, status: 'active', priceId: FOUNDING, latest_invoice: 'in_cur', metadata: { user_id: 'u_m', founding_seat_id: '41' } });
  h.db.seed('user_subscriptions', [{ user_id: 'u_m', stripe_customer_id: c.id, stripe_subscription_id: cur.id, status: 'active' }]);
  h.db.seed('dailyai_founding_seats', [{ id: 41, stripe_customer_id: c.id, user_id: 'u_m', stripe_subscription_id: seatBound ? cur.id : null, status: seatStatus }]);
  return { h, c, older, cur };
}

test('N1: the TRACKED subscription (seat bound to it) converts its seat even with an older untracked live sub on the customer; renewals keep it; its end ENDS it', async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const { h, cur } = trackedWithOlderUntracked();
  assert.equal((await deliver(paidEvent(cur, 'in_cur'))).status, 200);
  assert.equal(seat().status, 'converted', 'legitimate member never converted');
  assert.equal(seat().stripe_subscription_id, cur.id);
  // a normal renewal
  assert.equal((await deliver(paidEvent(cur, 'in_cur_2'))).status, 200);
  assert.equal(seat().status, 'converted');
  assert.equal(seat().stripe_subscription_id, cur.id);
  // the member cancels: a paid seat ENDS (stays counted), it is not released
  h.stripe.subscriptions.find((s) => s.id === cur.id).status = 'canceled';
  assert.equal((await deliver(del(cur))).status, 200);
  assert.equal(seat().status, 'ended');
});

test('N1: the subscription the ROW tracks claims its still-unbound seat despite an older untracked live sub', async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const { cur } = trackedWithOlderUntracked({ seatBound: false, seatStatus: 'reserved' });
  assert.equal((await deliver(paidEvent(cur, 'in_cur'))).status, 200);
  assert.equal(seat().stripe_subscription_id, cur.id);
  assert.equal(seat().status, 'converted');
});

test('N1 (other direction kept): an UNTRACKED newer duplicate still never takes an unbound seat, while the tracked sub does', async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  const h = harness();
  const { customer, sub: A } = seedSubscription({ userId: 'u_dir', status: 'active', priceId: FOUNDING });
  A.metadata.founding_seat_id = '41';
  Object.assign(h.stripe.subscriptions.find((s) => s.id === A.id), { latest_invoice: 'in_A' });
  h.stripe.subscriptions.find((s) => s.id === A.id).metadata.founding_seat_id = '41';
  h.stripe.invoices.in_A = { status: 'paid', amount_paid: 999 };
  h.stripe.invoices.in_B = { status: 'paid', amount_paid: 999 };
  const B = h.stripe.addSubscription({ customer: customer.id, status: 'active', priceId: FOUNDING, latest_invoice: 'in_B', metadata: { user_id: 'u_dir', founding_seat_id: '41' } });
  h.db.seed('dailyai_founding_seats', [{ id: 41, stripe_customer_id: customer.id, user_id: 'u_dir', stripe_subscription_id: null, status: 'reserved' }]);
  const { lines } = await deliverLogs(paidEvent(B, 'in_B'));
  assert.equal(seat().stripe_subscription_id, null);
  assert.ok(lines.some((l) => l.includes('[billing-alert] duplicate_subscription') && l.includes(B.id)), lines.join('\n'));
  await deliver(paidEvent(A, 'in_A'));
  assert.equal(seat().stripe_subscription_id, A.id);
  assert.equal(seat().status, 'converted');
});

// ---------------------------------------------------------------- N2: the comment-fallback cutoff is set per deploy

test('N2: with DAI_TRIAL_REUSE_COMMENT_CUTOFF unset, a comment-only trial_reuse cancellation made NOW is still recognised (old behaviour), with one warning', async () => {
  cancelMod.resetCutoffWarning();
  const now = Math.floor(Date.now() / 1000);
  const sub = { metadata: {}, canceled_at: now, cancellation_details: { comment: 'trial_reuse: card already used' } };
  let r1, r2;
  const lines = [];
  await quietly(async (l) => { r1 = cancelMod.cancelledFor(sub, 'trial_reuse'); r2 = cancelMod.cancelledFor(sub, 'trial_reuse'); lines.push(...l); });
  assert.equal(r1, true);
  assert.equal(r2, true);
  assert.equal(lines.filter((l) => l.includes('DAI_TRIAL_REUSE_COMMENT_CUTOFF')).length, 1, lines.join('\n'));
  // duplicate cancellations never had a comment fallback
  assert.equal(cancelMod.cancelledFor({ metadata: {}, canceled_at: now, cancellation_details: { comment: 'duplicate_trial: x' } }, 'duplicate_trial'), false);
});

test('N2: an INVALID cutoff keeps the old behaviour and warns; a valid cutoff honours the comment only for earlier cancellations', async () => {
  setup({ env: { DAI_TRIAL_REUSE_COMMENT_CUTOFF: 'not-a-date' } });
  cancelMod.resetCutoffWarning();
  const at = (t) => ({ metadata: {}, canceled_at: t, cancellation_details: { comment: 'trial_reuse: x' } });
  const deploy = Math.floor(Date.UTC(2026, 11, 1) / 1000);
  let r;
  const lines = [];
  await quietly(async (l) => { r = cancelMod.cancelledFor(at(deploy + 10), 'trial_reuse'); lines.push(...l); });
  assert.equal(r, true);
  assert.ok(lines.some((l) => l.includes('DAI_TRIAL_REUSE_COMMENT_CUTOFF')), lines.join('\n'));
  process.env.DAI_TRIAL_REUSE_COMMENT_CUTOFF = '2026-12-01T00:00:00Z';
  assert.equal(cancelMod.cancelledFor(at(deploy - 10), 'trial_reuse'), true);
  assert.equal(cancelMod.cancelledFor(at(deploy + 10), 'trial_reuse'), false);
  assert.equal(cancelMod.cancelledFor({ ...at(deploy + 10), canceled_at: undefined }, 'trial_reuse'), false, 'no canceled_at never qualifies once a cutoff is set');
  assert.equal(cancelMod.cancelledFor({ metadata: { dai_cancel_reason: 'trial_reuse' }, canceled_at: deploy + 10 }, 'trial_reuse'), true, 'metadata always counts');
});

// ---------------------------------------------------------------- G1: trial eligibility ignores another (existing) user's customer

test("G1: a customer of ANOTHER existing user whose email was edited to the victim's does not cost the victim the free trial", async () => {
  const h = harness();
  h.authUsers.push({ id: 'u_att', email: 'att@example.test' });
  const att = h.stripe.addCustomer({ email: 'victim2@example.test', metadata: { user_id: 'u_att' } });
  h.stripe.addSubscription({ customer: att.id, status: 'canceled', priceId: DAILYAI_PRICE_ID });
  assert.equal((await checkout({ headers: bearerUser('u_victim2', 'victim2@example.test').headers })).status, 200);
  assert.equal(h.stripe.sessions.at(-1).subscription_data.trial_period_days, 7, 'victim lost the free trial');
});

test("G1: the same-email customer of a user that no longer exists, or with no user_id, still uses up the trial", async () => {
  const h = harness();
  const gone = h.stripe.addCustomer({ email: 'rereg2@example.test', metadata: { user_id: 'u_deleted' } });
  h.stripe.addSubscription({ customer: gone.id, status: 'canceled', priceId: DAILYAI_PRICE_ID });
  assert.equal((await checkout({ headers: bearerUser('u_new2', 'rereg2@example.test').headers })).status, 200);
  assert.equal(h.stripe.sessions.at(-1).subscription_data.trial_period_days, undefined);
});

// ---------------------------------------------------------------- N4: "another user" only if that user still exists

test('N4: a holder customer tagged with a user id that NO LONGER exists (account re-created) still blocks with 409', async () => {
  const h = harness();
  const old = h.stripe.addCustomer({ email: 'rereg@example.test', metadata: { user_id: 'old_uid' } });
  h.stripe.addSubscription({ customer: old.id, status: 'active', metadata: { user_id: 'old_uid' } });
  assert.equal((await checkout({ headers: bearerUser('new_uid', 'rereg@example.test').headers })).status, 409);
});

test('N4: the owner lookup failing fails CLOSED (500, no session)', async () => {
  const h = harness();
  const att = h.stripe.addCustomer({ email: 'v4@example.test', metadata: { user_id: 'u_att4' } });
  h.stripe.addSubscription({ customer: att.id, status: 'active', priceId: DAILYAI_PRICE_ID });
  h.authAdminOutage = true;
  const res = await checkout({ headers: bearerUser('u_v4', 'v4@example.test').headers });
  assert.equal(res.status, 500);
  assert.equal(h.stripe.sessions.length, 0);
});

// ---------------------------------------------------------------- G2: a promoted trial is checked per card

test('G2: a TRIALING duplicate promoted after the tracked sub ends gets the one-trial-per-card check (card reused → cancelled, no charge)', async () => {
  setup({ env: FOUNDING_ENV });
  seatSql();
  captureEmails();
  const h = harness();
  const { customer, sub: A } = seedSubscription({ userId: 'u_g2', status: 'active', priceId: FOUNDING });
  h.stripe.paymentMethods.pm_reused = { type: 'card', card: { fingerprint: 'fp_reused' } };
  h.db.rpcHandlers.set('dailyai_claim_trial_fingerprint', async () => 'reused');
  const B = h.stripe.addSubscription({ customer: customer.id, status: 'trialing', priceId: FOUNDING, default_payment_method: 'pm_reused', metadata: { user_id: 'u_g2' } });
  h.stripe.subscriptions.find((s) => s.id === A.id).status = 'canceled';
  assert.equal((await deliver(del(A))).status, 200);
  const cancels = h.stripe.callsTo('subscriptions.cancel');
  assert.equal(cancels.length, 1, 'promoted trial skipped the card check');
  assert.equal(cancels[0].args.id, B.id);
  assert.equal(cancels[0].args.params.invoice_now, false);
  const row = h.db.rows('user_subscriptions').find((r) => r.user_id === 'u_g2');
  assert.equal(row.stripe_subscription_id, B.id);
  assert.equal(row.status, 'canceled');
});

// ---------------------------------------------------------------- N5: redaction removes the whole token

test('N5: emails containing quotes or wrapped in quotes are fully redacted from checkout error logs', async () => {
  harness().stripe.fail({ method: 'customers.search', error: new Error("bad query email:'o'brien+tag@example.test' and \"bob.smith@example.test\" (x) mailto:z@example.test.") });
  const { lines } = await checkoutLogs({ headers: bearerUser('u_r5', "o'brien+tag@example.test").headers });
  const logged = lines.filter((l) => l.includes('Checkout error')).join(' | ');
  assert.ok(logged.includes('bad query'), logged);
  assert.ok(!logged.includes('example.test') && !logged.includes("o'"), logged);
});

// ---------------------------------------------------------------- N3: promoted sub without user metadata is flagged

test('N3: promoting a live sub with NO metadata.user_id flags no_user_metadata', async () => {
  const h = harness();
  const { customer, sub: A } = seedSubscription({ userId: 'u_n3', status: 'active' });
  const nometa = h.stripe.addSubscription({ customer: customer.id, status: 'active', metadata: {} });
  h.stripe.subscriptions.find((s) => s.id === A.id).status = 'canceled';
  const { res, lines } = await deliverLogs(del(A));
  assert.equal(res.status, 200);
  assert.equal(h.db.rows('user_subscriptions')[0].stripe_subscription_id, nometa.id);
  assert.ok(lines.some((l) => l.includes('[billing-alert] promoted_live_duplicate') && l.includes('no_user_metadata')), lines.join('\n'));
});
