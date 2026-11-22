#!/usr/bin/env node
/**
 * READ-ONLY reconcile: DailyAI subscriptions in Stripe vs public.user_subscriptions rows.
 * Prints mismatches with ids and masked emails only. There is NO write path: only Stripe GETs
 * and a Supabase REST GET. `--dry-run` is the default and the only mode (flag accepted for clarity).
 *
 * Env (read from the process, never from files): STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, STRIPE_PRICE_ID / STRIPE_PRICE_FOUNDING / STRIPE_PRICE_PRO /
 * STRIPE_ALLOWED_PRICE_IDS (the DailyAI price ids; the Stripe account is shared with other products).
 * Use a restricted read-only Stripe key. Run: node scripts/billing/reconcile-stripe-db.mjs
 */
const args = new Set(process.argv.slice(2));
if ([...args].some((a) => a !== '--dry-run')) { console.error('Only --dry-run is supported (this script never writes).'); process.exit(2); }

const need = (k) => { const v = (process.env[k] || '').trim(); if (!v) { console.error(`Missing env ${k}`); process.exit(2); } return v; };
const STRIPE_KEY = need('STRIPE_SECRET_KEY');
const SB_URL = need('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
const SB_KEY = need('SUPABASE_SERVICE_ROLE_KEY');
const PRICES = new Set([process.env.STRIPE_PRICE_ID, process.env.STRIPE_PRICE_FOUNDING, process.env.STRIPE_PRICE_PRO, ...(process.env.STRIPE_ALLOWED_PRICE_IDS || '').split(',')].map((v) => (v || '').trim()).filter(Boolean));
if (PRICES.size === 0) { console.error('No DailyAI price ids configured (refusing: would treat every product as DailyAI).'); process.exit(2); }

const LIVE = new Set(['trialing', 'active', 'past_due', 'unpaid']);
const DB_LIVE = new Set(['trialing', 'active', 'past_due', 'unpaid']); // unpaid is a live (blocking) state: STATUS_MAP keeps it past_due, but a raw 'unpaid' row must not read as a mismatch
const mask = (e) => { const m = /^(.)[^@]*(@.+)$/.exec(e || ''); return m ? `${m[1]}***${m[2]}` : '(no email)'; };

async function stripeGet(path, params = {}) {
  const url = new URL(`https://api.stripe.com/v1/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.append(k, v);
  const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${STRIPE_KEY}` } });
  if (!res.ok) throw new Error(`Stripe GET ${path} -> ${res.status}`);
  return res.json();
}

async function allSubscriptions() {
  const out = []; let after;
  for (;;) {
    const page = await stripeGet('subscriptions', { status: 'all', limit: '100', 'expand[]': 'data.customer', ...(after ? { starting_after: after } : {}) });
    out.push(...page.data);
    if (!page.has_more) return out;
    after = page.data[page.data.length - 1].id;
  }
}

async function dbRows() {
  const out = [];
  for (let from = 0; ; from += 1000) { // PostgREST caps a select at 1000 rows: page explicitly
    const res = await fetch(`${SB_URL}/rest/v1/user_subscriptions?select=user_id,stripe_customer_id,stripe_subscription_id,status&order=user_id`, {
      method: 'GET', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`Supabase GET user_subscriptions -> ${res.status}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

const subs = (await allSubscriptions()).filter((s) => s.items?.data?.some((i) => PRICES.has(i.price?.id)));
const rows = await dbRows();
const bySub = new Map(rows.filter((r) => r.stripe_subscription_id).map((r) => [r.stripe_subscription_id, r]));
const findings = [];
const email = (s) => mask(typeof s.customer === 'object' ? s.customer?.email : '');

for (const s of subs) {
  const row = bySub.get(s.id);
  const cus = typeof s.customer === 'object' ? s.customer.id : s.customer;
  if (!row && LIVE.has(s.status)) findings.push(`STRIPE_LIVE_NO_ROW sub=${s.id} cus=${cus} status=${s.status} email=${email(s)}`);
  else if (row) {
    const stripeLive = LIVE.has(s.status);
    const dbLive = DB_LIVE.has(row.status);
    if (stripeLive !== dbLive) findings.push(`STATUS_MISMATCH sub=${s.id} stripe=${s.status} db=${row.status} user=${row.user_id}`);
    if (row.stripe_customer_id && row.stripe_customer_id !== cus) findings.push(`CUSTOMER_MISMATCH sub=${s.id} stripe_cus=${cus} db_cus=${row.stripe_customer_id} user=${row.user_id}`);
  }
}
const liveByCustomer = new Map();
for (const s of subs.filter((x) => LIVE.has(x.status))) {
  const cus = typeof s.customer === 'object' ? s.customer.id : s.customer;
  liveByCustomer.set(cus, [...(liveByCustomer.get(cus) || []), s.id]);
}
for (const [cus, ids] of liveByCustomer) if (ids.length > 1) findings.push(`MULTIPLE_LIVE_ON_CUSTOMER cus=${cus} subs=${ids.join(',')}`);
const liveByEmail = new Map();
for (const s of subs.filter((x) => LIVE.has(x.status))) {
  const e = (typeof s.customer === 'object' ? s.customer?.email : '') || '';
  if (e) liveByEmail.set(e.toLowerCase(), [...(liveByEmail.get(e.toLowerCase()) || []), s.id]);
}
for (const [e, ids] of liveByEmail) if (ids.length > 1) findings.push(`MULTIPLE_LIVE_SAME_EMAIL email=${mask(e)} subs=${ids.join(',')}`);
const stripeIds = new Set(subs.map((s) => s.id));
for (const r of rows) {
  if (r.stripe_subscription_id && DB_LIVE.has(r.status) && !stripeIds.has(r.stripe_subscription_id)) findings.push(`DB_LIVE_NOT_IN_STRIPE user=${r.user_id} sub=${r.stripe_subscription_id} db=${r.status}`);
}

console.log(`[reconcile] DRY RUN (read-only). DailyAI subscriptions in Stripe: ${subs.length}; user_subscriptions rows: ${rows.length}`);
console.log(findings.length ? findings.join('\n') : 'No mismatches.');
console.log(`[reconcile] ${findings.length} finding(s).`);
