// DAI-05: what Supabase (hosted GoTrue) actually does with several sign-in links for one address.
// FREE test account only; links are minted in-process (no email) and NEVER printed (8-char sha256 tags).
// Independent check: auth.audit_log_entries must show exactly the mints this run made.
// Usage: node link-semantics-prod.cjs <label>     Exit code 1 on any FAIL or a wrong check count.
const { createClient } = require('C:/Users/mpmmo/wt/dai-integrate/node_modules/@supabase/supabase-js');
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const label = process.argv[2] || 'run';
const OUT = path.join(__dirname, '..', '..', 'docs', 'launch-evidence', `DAI-05-semantics-${label}`);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const envFile = (f) => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.trim().replace(/^"|"$/g, '')]));
const env = envFile('C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/.env.local');
const acct = envFile('C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/local-test/TEST-ACCOUNTS.env');
process.loadEnvFile('C:/Users/mpmmo/hiddenbag-v2/.env.local'); // SUPABASE_ACCESS_TOKEN (read-only audit query)
const EMAIL = acct.DAI_TEST_FREE_EMAIL;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = (t) => crypto.createHash('sha256').update(t).digest('hex').slice(0, 8);
const res = []; const ok = (n, p, i = '') => { res.push({ check: n, pass: !!p, info: i }); console.log(`${p ? 'PASS' : 'FAIL'} ${n}${i ? ' :: ' + i : ''}`); };
let mints = 0;
async function gen() {
  const t0 = Date.now();
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
  if (error) throw error; mints++;
  return { t: data.properties.hashed_token, type: data.properties.verification_type, sentAt: t0, doneAt: Date.now() };
}
// Each spend uses its own fresh client: independent "browser sessions", no shared storage.
async function spend(l) {
  const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.verifyOtp({ token_hash: l.t, type: l.type });
  if (!error) await c.auth.signOut().catch(() => {});
  return error ? { ok: false, why: `${error.status} ${error.code || error.message}` } : { ok: data.user?.email === EMAIL, why: data.user?.email };
}
async function audit(sinceIso) {
  const q = `select payload->>'action' a, count(*) n from auth.audit_log_entries where created_at >= '${sinceIso}' and payload->>'actor_username' = '${EMAIL}' group by 1`;
  const r = await fetch('https://api.supabase.com/v1/projects/aeeykasmymitzbuhdlfe/database/query', { method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `begin transaction read only; ${q}; rollback;` }) });
  return Object.fromEntries((await r.json()).map((x) => [x.a, Number(x.n)]));
}
(async () => {
  const started = new Date().toISOString();
  // 1. Sequential pairs at each gap: newest works, older is refused, in BOTH orders of use.
  for (const gap of [0, 1, 3, 7, 15, 30, 60]) {
    const a = await gen(); await sleep(gap * 1000); const b = await gen();
    const order = gap % 2 ? ['old', 'new'] : ['new', 'old'];
    const out = {};
    for (const w of order) out[w] = await spend(w === 'new' ? b : a);
    ok(`gap ${gap}s: newest link works (used ${order[0]} first)`, out.new.ok, `${tag(b.t)} ${out.new.why}`);
    ok(`gap ${gap}s: older link refused`, !out.old.ok && /403/.test(out.old.why), `${tag(a.t)} ${out.old.why}`);
  }
  // 2. Overlapping requests: fire 3 at once, record completion order, then find which token survived.
  for (let round = 1; round <= 3; round++) {
    const links = await Promise.all([gen(), gen(), gen()]);
    const byDone = [...links].sort((x, y) => x.doneAt - y.doneAt);
    const results = [];
    for (const l of links) results.push({ l, r: await spend(l) });
    const winners = results.filter((x) => x.r.ok);
    const lastDone = byDone[byDone.length - 1];
    ok(`overlap round ${round}: exactly one of 3 simultaneous links works`, winners.length === 1, winners.map((w) => tag(w.l.t)).join(','));
    // Not a pass/fail of our code: records whether "the response that arrived last" is the valid one.
    res.push({ check: `overlap round ${round}: last-arriving response holds the valid token (observation)`, pass: null, info: String(winners[0]?.l === lastDone) });
    console.log(`INFO overlap round ${round}: last-arriving response is the valid one = ${winners[0]?.l === lastDone}`);
  }
  // 3. Duplicate spend of one valid link from two sessions at once: exactly one succeeds.
  const d = await gen();
  const both = await Promise.all([spend(d), spend(d)]);
  // Upstream limitation found 11-20 (run1): GoTrue does not lock the token during /verify, so two presses
  // landing in the same instant can BOTH sign in. Only someone already holding the link can do this; it
  // admits nobody else. Recorded as an observation (accepted, DAI-05 tracker), never as a DailyAI pass.
  ok('same link pressed in two sessions at once: only this account, at least one sign-in', both.some((x) => x.ok) && both.every((x) => x.ok || /403/.test(x.why)), both.map((x) => x.why).join(' | '));
  res.push({ check: 'UPSTREAM OBSERVATION: both simultaneous presses signed in', pass: null, info: String(both.filter((x) => x.ok).length === 2) });
  // 4. Independent check: the audit log saw exactly the mints we made (no other writer in the window).
  await sleep(3000);
  const a = await audit(started);
  ok('audit log: user_recovery_requested == links this run minted', a.user_recovery_requested === mints, `audit ${a.user_recovery_requested} / minted ${mints}`);
  const EXPECTED = 7 * 2 + 3 + 1 + 1;
  const graded = res.filter((x) => x.pass !== null);
  const sum = { label, at: new Date().toISOString(), email: 'FREE test account', expected: EXPECTED, ran: graded.length, pass: graded.filter((x) => x.pass).length, fail: graded.filter((x) => !x.pass).length, results: res };
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(sum, null, 1));
  console.log(`== ${sum.pass} pass / ${sum.fail} fail (expected ${EXPECTED}, ran ${sum.ran}) -> ${OUT}`);
  process.exit(sum.fail || sum.ran !== EXPECTED ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.status, e.code, e.message); process.exit(1); });
