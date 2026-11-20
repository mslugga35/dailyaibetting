// Stripe TEST mode only: a controlled paying subscriber (card on file, paid invoice) + portal session.
const fs = require('fs');
const env = (f) => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.trim().replace(/^"|"$/g, '')]));
const st = env(__dirname + '/../../stripe-test.env'); const fd = env(__dirname + '/../../founding-test.env');
if (!st.STRIPE_SECRET_KEY.startsWith('sk_test_')) throw new Error('refusing: not a test key');
const stripe = new (require('C:/Users/mpmmo/wt/dai-integrate/node_modules/stripe'))(st.STRIPE_SECRET_KEY);
(async () => {
  const bal = await stripe.balance.retrieve(); if (bal.livemode) throw new Error('live mode refused');
  const c = await stripe.customers.create({ email: 'dai03-portal-test@local.test', name: 'DAI-03 Portal Test', metadata: { purpose: 'DAI-03 billing portal verification' } });
  const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: c.id });
  await stripe.customers.update(c.id, { invoice_settings: { default_payment_method: pm.id } });
  const sub = await stripe.subscriptions.create({ customer: c.id, items: [{ price: fd.STRIPE_PRICE_FOUNDING }], default_payment_method: pm.id, metadata: { purpose: 'DAI-03' } });
  const inv = await stripe.invoices.list({ customer: c.id, limit: 1 });
  const s = await stripe.billingPortal.sessions.create({ customer: c.id, configuration: fd.STRIPE_PORTAL_CONFIGURATION_ID, return_url: 'https://dailyaibetting.com/account' });
  fs.writeFileSync(__dirname + '/portal-url.txt', s.url);
  console.log(JSON.stringify({ livemode: s.livemode, customer: c.id, sub_status: sub.status, price: sub.items.data[0].price.unit_amount, card: pm.card.last4, invoice: inv.data[0] && inv.data[0].status, portal_host: new URL(s.url).host, return_url: s.return_url }));
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
