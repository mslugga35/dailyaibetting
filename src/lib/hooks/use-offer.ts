'use client';

import { useEffect, useState } from 'react';
import { offerCopy, type OfferCopy, type PublicOffer } from '@/lib/pricing/plans';

// One request per page load, shared by every component that shows a price.
let inflight: Promise<PublicOffer | null> | null = null;

function loadOffer(): Promise<PublicOffer | null> {
  if (!inflight) {
    inflight = fetch('/api/pricing/offer', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<PublicOffer>) : null))
      .catch(() => null)
      .then((o) => {
        if (!o) inflight = null; // allow a retry on the next mount
        return o;
      });
  }
  return inflight;
}

/**
 * The Pro plan on sale (from the server, the same decision checkout uses) and its
 * customer-facing wording. Until it loads, `copy.price` is null: show no amount
 * rather than a possibly wrong one.
 */
export function useOffer(initial: PublicOffer | null = null): { offer: PublicOffer | null; copy: OfferCopy } {
  const [offer, setOffer] = useState<PublicOffer | null>(initial);
  useEffect(() => {
    let alive = true;
    loadOffer().then((o) => { if (alive && o) setOffer(o); });
    return () => { alive = false; };
  }, []);
  return { offer, copy: offerCopy(offer) };
}
