import Stripe from 'stripe';

// Lazy singleton — avoids module-load failure when STRIPE_SECRET_KEY is not set
// (e.g. during `next build` in CI without env vars).
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 3,
    });
  }
  return _stripe;
}

// Named export for backwards-compat with existing imports:
// `import { stripe } from '@/lib/stripe'` still works but now evaluated lazily.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
