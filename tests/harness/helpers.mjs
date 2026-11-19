/** Test helpers: fresh state per test, request builders, signed Stripe events. */
import { resetHarness, harness } from './state.mjs';
import { TEST_ENV } from './register.mjs';
import { realWebhooks } from './fakes/stripe.mjs';
import { DAILYAI_PRICE_ID } from './fake-stripe-state.mjs';

export { harness, DAILYAI_PRICE_ID };

/**
 * Reset all fakes and the env. `env` overrides: a value of `undefined` deletes
 * the variable (e.g. `{ CRON_SECRET: undefined }` = "not configured").
 */
export function setup({ env = {} } = {}) {
  const h = resetHarness();
  for (const k of Object.keys(TEST_ENV)) process.env[k] = TEST_ENV[k];
  delete process.env.GUEST_CHECKOUT_ENABLED;
  // Pricing switches default to unset (legacy $20 behaviour) in every test.
  for (const k of ['PRICING_MODE', 'STRIPE_PRICE_FOUNDING', 'STRIPE_PRICE_PRO', 'STRIPE_ALLOWED_PRICE_IDS', 'FOUNDING_SEAT_CAP',
    'FOUNDING_SEAT_COUNT', 'FOUNDING_TRIAL_DAYS', 'FOUNDING_SOLD_OUT', 'FOUNDING_RETURNING', 'STRIPE_PORTAL_CONFIGURATION_ID']) delete process.env[k];
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return h;
}

let ipSeq = 0;
/** Each request gets its own client IP so the in-memory rate limiter never interferes. */
export function req(path, { method = 'GET', headers = {}, body, ip } = {}) {
  const h = new Headers(headers);
  if (!h.has('x-forwarded-for')) h.set('x-forwarded-for', ip || `203.0.113.${(++ipSeq % 250) + 1}, 10.0.0.${ipSeq % 250}`);
  const init = { method, headers: h };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (!h.has('content-type')) h.set('content-type', 'application/json');
  }
  return new Request(`https://dailyai.test${path}`, init);
}

export async function body(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

/** A signed-in user, via Bearer token (the implicit-flow path resolveUser supports). */
export function bearerUser(id = 'user_paid_1', email = `${id}@example.test`, extra = {}) {
  const token = `jwt_${id}`;
  // Signed-up users have a confirmed email (checkout requires one); pass email_confirmed_at: null to test an unconfirmed account.
  harness().bearerUsers.set(token, { id, email, email_confirmed_at: '2026-11-01T00:00:00Z', ...extra });
  return { id, email, headers: { Authorization: `Bearer ${token}` } };
}

/** A signed-in user via the session cookie (createServerSupabaseClient path). */
export function cookieUser(id = 'user_cookie_1', email = `${id}@example.test`, extra = {}) {
  harness().cookieUser = { id, email, email_confirmed_at: '2026-11-01T00:00:00Z', ...extra };
  return { id, email };
}

/** Seed a user_subscriptions row (and the matching Stripe objects). */
export function seedSubscription({ userId, status = 'active', priceId = DAILYAI_PRICE_ID } = {}) {
  const h = harness();
  const customer = h.stripe.addCustomer({ email: `${userId}@example.test`, metadata: { user_id: userId } });
  const stripeStatus = status === 'inactive' ? 'canceled' : status;
  const sub = h.stripe.addSubscription({ customer: customer.id, status: stripeStatus, priceId, metadata: { user_id: userId } });
  h.db.seed('user_subscriptions', [{
    user_id: userId,
    stripe_customer_id: customer.id,
    stripe_subscription_id: sub.id,
    status,
    price_id: priceId,
    current_period_end: '2026-12-01T00:00:00.000Z',
    cancel_at_period_end: false,
  }]);
  return { customer, sub };
}

// ---------------------------------------------------------------- Stripe events

let evtSeq = 0;
export function stripeEvent(type, object, { id } = {}) {
  return { id: id || `evt_test_${++evtSeq}`, object: 'event', type, api_version: '2025-01-27.acacia', created: 1762646400 + evtSeq, livemode: false, data: { object } };
}

export function checkoutCompletedEvent({ sub, customerId, userId, guestEmail, mode = 'subscription', customerEmail } = {}) {
  const metadata = {};
  if (userId) metadata.user_id = userId;
  if (guestEmail) metadata.guest_email = guestEmail;
  return stripeEvent('checkout.session.completed', {
    id: `cs_test_${evtSeq + 1}`,
    object: 'checkout.session',
    mode,
    subscription: sub ? sub.id : null,
    customer: customerId ?? sub?.customer ?? null,
    customer_email: customerEmail ?? null,
    customer_details: customerEmail ? { email: customerEmail } : null,
    metadata,
  });
}

/**
 * A customer.subscription.* event. Stripe emits it BECAUSE its subscription changed,
 * so building the event also moves the fake Stripe's stored subscription to that
 * state (as of this moment). A test that wants a STALE event builds it first and
 * changes Stripe's state afterwards.
 */
export function subscriptionEvent(type, sub) {
  const stored = harness().stripe.subscriptions.find((s) => s.id === sub.id);
  if (stored) {
    if (sub.status !== undefined) stored.status = sub.status;
    if (sub.cancel_at_period_end !== undefined) stored.cancel_at_period_end = sub.cancel_at_period_end;
    if (sub.cancel_at !== undefined) stored.cancel_at = sub.cancel_at;
  }
  return stripeEvent(type, JSON.parse(JSON.stringify(sub)));
}

/** Build the webhook POST exactly as Stripe sends it: raw body + Stripe-Signature. */
export function signedWebhookRequest(event, { secret = TEST_ENV.STRIPE_WEBHOOK_SECRET, signature, payload } = {}) {
  const raw = payload ?? JSON.stringify(event);
  const headers = { 'content-type': 'application/json' };
  if (signature !== null) headers['stripe-signature'] = signature ?? realWebhooks.generateTestHeaderString({ payload: raw, secret });
  return req('/api/webhooks/stripe', { method: 'POST', headers, body: raw });
}

/** Capture Resend emails instead of sending them. */
export function captureEmails() {
  const sent = [];
  harness().fetchRoutes.set('https://api.resend.com/', async (_url, init) => {
    sent.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: `email_${sent.length}` }), { status: 200 });
  });
  return sent;
}

/** Silence the app's console noise for a block, keeping it inspectable. */
export async function quietly(fn) {
  const saved = { error: console.error, warn: console.warn, log: console.log, info: console.info };
  const lines = [];
  console.error = console.warn = console.log = console.info = (...a) => lines.push(a.map(String).join(' '));
  try { return await fn(lines); } finally { Object.assign(console, saved); }
}
