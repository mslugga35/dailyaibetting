/**
 * In-memory Stripe account for tests. Holds customers, subscriptions and
 * Checkout sessions, logs every call, and can be told to fail.
 * Nothing here talks to Stripe; the real `stripe` package is used only for its
 * offline webhook signature helpers (see fixtures/stripe-events.mjs).
 */

let seq = 0;
const id = (prefix) => `${prefix}_test_${(++seq).toString(36).padStart(6, '0')}`;

export const DAILYAI_PRICE_ID = 'price_test_dailyai_pro_monthly';
export const FOREIGN_PRICE_ID = 'price_test_other_product_on_shared_account';

export class FakeStripeState {
  constructor() {
    this.customers = [];
    this.subscriptions = [];
    this.sessions = [];
    this.portalSessions = [];
    /** priceId -> partial Stripe Price (unit_amount, currency, recurring, active). */
    this.prices = { [DAILYAI_PRICE_ID]: { unit_amount: 2000 } };
    /** invoiceId -> partial Stripe Invoice (status, amount_paid). */
    this.invoices = {};
    this.calls = [];
    this.failures = [];
  }

  fail({ method, times = Infinity, error } = {}) {
    this.failures.push({ method, remaining: times, error: error || Object.assign(new Error('Stripe API unavailable (simulated)'), { type: 'StripeConnectionError' }) });
  }

  record(method, args) {
    this.calls.push({ method, args: JSON.parse(JSON.stringify(args ?? null)) });
    for (const f of this.failures) {
      if ((f.method === undefined || f.method === method) && f.remaining > 0) {
        f.remaining -= 1;
        throw f.error;
      }
    }
  }

  callsTo(method) {
    return this.calls.filter((c) => c.method === method);
  }

  addCustomer(fields = {}) {
    const c = { id: id('cus'), object: 'customer', email: null, metadata: {}, ...fields };
    this.customers.push(c);
    return c;
  }

  addSubscription(fields = {}) {
    const now = Math.floor(Date.UTC(2026, 10, 1) / 1000);
    const priceId = fields.priceId || DAILYAI_PRICE_ID;
    const s = {
      id: fields.id || id('sub'),
      object: 'subscription',
      customer: fields.customer,
      status: fields.status || 'active',
      cancel_at_period_end: fields.cancel_at_period_end ?? false,
      cancel_at: fields.cancel_at ?? null,
      metadata: fields.metadata || {},
      latest_invoice: fields.latest_invoice ?? null,
      items: {
        object: 'list',
        data: [{ id: id('si'), price: { id: priceId }, current_period_start: fields.current_period_start ?? now, current_period_end: fields.current_period_end ?? now + 30 * 86400 }],
      },
    };
    this.subscriptions.push(s);
    return s;
  }

  newId(prefix) {
    return id(prefix);
  }
}
