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
    async create(params) {
      st().record('customers.create', params);
      return st().addCustomer({ email: params?.email ?? null, metadata: params?.metadata ?? {} });
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
    async retrieve(subId) {
      st().record('subscriptions.retrieve', { id: subId });
      const s = st().subscriptions.find((x) => x.id === subId);
      if (!s) throw Object.assign(new Error(`No such subscription: '${subId}'`), { type: 'StripeInvalidRequestError', statusCode: 404 });
      return JSON.parse(JSON.stringify(s));
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
        const s = { id: st().newId('cs'), object: 'checkout.session', url: `https://checkout.stripe.test/${st().sessions.length + 1}`, ...params };
        st().sessions.push(s);
        return s;
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
