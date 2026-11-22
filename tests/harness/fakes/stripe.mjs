/**
 * Replaces src/lib/stripe.ts. Same exports (`stripe`, `getStripe`), backed by
 * the in-memory account in harness().stripe. `webhooks` is the REAL stripe-node
 * implementation (pure HMAC, no network), so signature checks are genuine.
 */
import Stripe from 'stripe';
import { harness } from '../state.mjs';

const real = new Stripe('sk_test_harness_offline_never_sent', {
  httpClient: {
    makeRequest() { throw new Error('[harness] real Stripe HTTP client must never be used'); },
    getClientName() { return 'harness-blocked'; },
  },
});

const st = () => harness().stripe;
const list = (data) => ({ object: 'list', data, has_more: false });

const fakeStripe = {
  webhooks: real.webhooks,
  customers: {
    async list(params) {
      st().record('customers.list', params);
      const hit = st().customers.filter((c) => !params?.email || c.email === params.email);
      return list(hit.slice(0, params?.limit ?? 10));
    },
    /**
     * Search: only the `email:'...'` form is modelled. Stripe's `:` operator is case-INSENSITIVE and,
     * on a string field, matches any value CONTAINING the query's words in order (docs.stripe.com/search),
     * so it can return more than an exact match: modelled as a lower-cased substring match.
     * Quotes inside the value are escaped with a backslash.
     * `st().searchLag` (ids) models eventual consistency: those customers are not yet indexed.
     */
    async search(params) {
      st().record('customers.search', params);
      const m = /^email:'((?:[^'\\]|\\.)*)'$/.exec(params?.query ?? '');
      if (!m) throw Object.assign(new Error(`[harness] unsupported customers.search query: ${params?.query}`), { type: 'StripeInvalidRequestError', statusCode: 400 });
      const want = m[1].replace(/\\(.)/g, '$1').toLowerCase();
      const lag = st().searchLag || new Set();
      const hit = st().customers.filter((c) => !lag.has(c.id) && (c.email || '').toLowerCase().includes(want));
      return { object: 'search_result', data: hit.slice(0, params?.limit ?? 10), has_more: false, next_page: null };
    },
    async create(params, options) {
      st().record('customers.create', { ...params, _idempotencyKey: options?.idempotencyKey ?? null });
      const key = options?.idempotencyKey;
      if (key && st().idempotent.has(key)) return st().idempotent.get(key);
      const c = st().addCustomer({ email: params?.email ?? null, metadata: params?.metadata ?? {} });
      if (key) st().idempotent.set(key, c);
      return c;
    },
  },
  subscriptions: {
    async list(params) {
      st().record('subscriptions.list', params);
      const hit = st().subscriptions.filter(
        (s) => (!params?.customer || s.customer === params.customer) && (!params?.status || params.status === 'all' || s.status === params.status),
      );
      return list(hit.slice(0, params?.limit ?? 10));
    },
    /** Search: only `metadata['user_id']:'...'` is modelled (token field: exact match). Honors searchLag by subscription id. */
    async search(params) {
      st().record('subscriptions.search', params);
      const m = /^metadata\['user_id'\]:'((?:[^'\\]|\\.)*)'$/.exec(params?.query ?? '');
      if (!m) throw Object.assign(new Error(`[harness] unsupported subscriptions.search query: ${params?.query}`), { type: 'StripeInvalidRequestError', statusCode: 400 });
      const want = m[1].replace(/\\(.)/g, '$1');
      const lag = st().searchLag || new Set();
      const hit = st().subscriptions.filter((s) => !lag.has(s.id) && s.metadata?.user_id === want);
      return { object: 'search_result', data: JSON.parse(JSON.stringify(hit.slice(0, params?.limit ?? 10))), has_more: false, next_page: null };
    },
    async update(subId, params) {
      st().record('subscriptions.update', { id: subId, params });
      const s = st().subscriptions.find((x) => x.id === subId);
      if (!s) throw Object.assign(new Error(`No such subscription: '${subId}'`), { type: 'StripeInvalidRequestError', statusCode: 404 });
      if (params?.trial_end === 'now' && s.status === 'trialing') s.status = 'active';
      if (params?.metadata) s.metadata = { ...(s.metadata || {}), ...params.metadata };
      return JSON.parse(JSON.stringify(s));
    },
    async cancel(subId, params) {
      st().record('subscriptions.cancel', { id: subId, params });
      const s = st().subscriptions.find((x) => x.id === subId);
      if (!s) throw Object.assign(new Error(`No such subscription: '${subId}'`), { type: 'StripeInvalidRequestError', statusCode: 404 });
      if (s.status === 'canceled') throw Object.assign(new Error('A canceled subscription can only update its cancellation_details and metadata.'), { type: 'StripeInvalidRequestError', statusCode: 400 });
      if (params?.cancellation_details) s.cancellation_details = { ...params.cancellation_details };
      s.status = 'canceled';
      s.canceled_at = Math.floor(Date.now() / 1000);
      return JSON.parse(JSON.stringify(s));
    },
    async retrieve(subId) {
      st().record('subscriptions.retrieve', { id: subId });
      const s = st().subscriptions.find((x) => x.id === subId);
      if (!s) throw Object.assign(new Error(`No such subscription: '${subId}'`), { type: 'StripeInvalidRequestError', statusCode: 404 });
      return JSON.parse(JSON.stringify(s));
    },
  },
  paymentMethods: {
    async retrieve(id) {
      st().record('paymentMethods.retrieve', { id });
      const pm = st().paymentMethods[id];
      if (!pm) throw Object.assign(new Error(`No such payment method: '${id}'`), { type: 'StripeInvalidRequestError', statusCode: 404 });
      return { id, object: 'payment_method', ...pm };
    },
  },
  charges: {
    async retrieve(id) {
      st().record('charges.retrieve', { id });
      const c = st().charges[id];
      if (!c) throw Object.assign(new Error(`No such charge: '${id}'`), { type: 'StripeInvalidRequestError', statusCode: 404 });
      return { id, object: 'charge', ...c };
    },
  },
  invoicePayments: {
    async list(params) {
      st().record('invoicePayments.list', params);
      const inv = st().invoicePayments[params?.payment?.payment_intent];
      return list(inv ? [{ object: 'invoice_payment', invoice: inv }] : []);
    },
  },
  invoices: {
    async retrieve(invoiceId) {
      st().record('invoices.retrieve', { id: invoiceId });
      const inv = st().invoices[invoiceId];
      if (!inv) throw Object.assign(new Error(`No such invoice: '${invoiceId}'`), { type: 'StripeInvalidRequestError', statusCode: 404 });
      return { id: invoiceId, object: 'invoice', ...inv };
    },
  },
  prices: {
    async retrieve(priceId) {
      st().record('prices.retrieve', { id: priceId });
      const p = st().prices[priceId];
      if (!p) throw Object.assign(new Error(`No such price: '${priceId}'`), { type: 'StripeInvalidRequestError', statusCode: 404 });
      return { id: priceId, object: 'price', active: true, currency: 'usd', recurring: { interval: 'month', interval_count: 1 }, ...p };
    },
  },
  checkout: {
    sessions: {
      async create(params) {
        st().record('checkout.sessions.create', params);
        const s = { id: st().newId('cs'), object: 'checkout.session', status: 'open', created: st().nextCreated(), url: `https://checkout.stripe.test/${st().sessions.length + 1}`, ...params };
        st().sessions.push(s);
        return s;
      },
      async list(params) {
        st().record('checkout.sessions.list', params);
        const hit = st().sessions.filter((x) => (!params?.customer || x.customer === params.customer) && (!params?.status || x.status === params.status));
        return list(JSON.parse(JSON.stringify(hit.slice(0, params?.limit ?? 10))));
      },
      async expire(id) {
        st().record('checkout.sessions.expire', { id });
        const s = st().sessions.find((x) => x.id === id);
        if (!s) throw Object.assign(new Error(`No such checkout.session: '${id}'`), { type: 'StripeInvalidRequestError', statusCode: 404 });
        if (s.status !== 'open') throw Object.assign(new Error('Only open Checkout Sessions can be expired.'), { type: 'StripeInvalidRequestError', statusCode: 400 });
        s.status = 'expired';
        return JSON.parse(JSON.stringify(s));
      },
      async retrieve(id, params) {
        st().record('checkout.sessions.retrieve', { id, params });
        const s = st().sessions.find((x) => x.id === id);
        if (!s) throw Object.assign(new Error(`No such checkout.session: '${id}'`), { type: 'StripeInvalidRequestError', statusCode: 404 });
        const out = JSON.parse(JSON.stringify(s));
        if (params?.expand?.includes('subscription') && typeof out.subscription === 'string') {
          const sub = st().subscriptions.find((x) => x.id === out.subscription);
          out.subscription = sub ? JSON.parse(JSON.stringify(sub)) : null;
        }
        return out;
      },
    },
  },
  billingPortal: {
    sessions: {
      async create(params) {
        st().record('billingPortal.sessions.create', params);
        const s = { id: st().newId('bps'), url: 'https://billing.stripe.test/session', ...params };
        st().portalSessions.push(s);
        return s;
      },
    },
  },
};

export function getStripe() {
  return fakeStripe;
}

export const stripe = fakeStripe;

/** For fixtures: sign a payload exactly as Stripe does. */
export const realWebhooks = real.webhooks;
