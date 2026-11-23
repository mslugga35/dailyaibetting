// DAI-02 grader production check 2 (docs/DAI-02-NOV24-VERIFICATION.md). READ-ONLY.
// Refuses to run before 2026-11-24 00:00 ET (05:00Z). Every query is a single SELECT inside
// `begin transaction read only; …; rollback;`. Prints each check next to the 11-22 baseline; a human
// still checks the twin rows (check 2) against ESPN finals and the writer log (check 1, Hetzner).
// Usage: node qa/launch-verify/dai02-nov24-check.mjs
//   SUPABASE_ENV  env file with SUPABASE_ACCESS_TOKEN (default: ~/hiddenbag-v2/.env.local; project A aeeyk…)
const NOT_BEFORE = Date.parse('2026-11-24T05:00:00Z');
if (Date.now() < NOT_BEFORE && process.env.DAI02_ALLOW_EARLY !== 'dry-run-syntax-only') {
  console.error(`refused: DAI-02 check 2 runs on or after 2026-11-24 00:00 ET (now ${new Date().toISOString()})`);
  process.exit(3);
}
process.loadEnvFile(process.env.SUPABASE_ENV || 'C:/Users/mpmmo/hiddenbag-v2/.env.local');
const PROJECT = 'aeeykasmymitzbuhdlfe';
const BASELINE_AT = '2026-11-22 20:44Z';
const BASELINE = { pending: 96, pre_floor_pending: 52, post_floor_stale: 3, twin_total: 162, fire_wlp: '1303-1203-28' };

async function q(sql) {
  const s = sql.trim().replace(/;+\s*$/, '');
  if (!/^(select|with)\b/i.test(s) || s.includes(';')) throw new Error('refused: single SELECT only');
  if (process.env.DAI02_ALLOW_EARLY === 'dry-run-syntax-only') return [];
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `begin transaction read only; ${s}; rollback;` }),
  });
  const j = await r.json();
  if (!r.ok || !Array.isArray(j)) throw new Error(`query failed: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

console.log(`== DAI-02 check 2 at ${new Date().toISOString()} (baseline ${BASELINE_AT})`);
const [m] = await q(`select
  count(*) filter (where result='pending') pending,
  count(*) filter (where result='pending' and et_date < '2026-11-21') pre_floor_pending,
  count(*) filter (where result='pending' and et_date >= '2026-11-21' and commence_time < now() - interval '6 hours') post_floor_stale,
  count(*) filter (where grade_source like '%_twin') twin_total,
  count(*) filter (where is_fire and result='win') || '-' || count(*) filter (where is_fire and result='loss') || '-' || count(*) filter (where is_fire and result='push') fire_wlp_live
  from hb_consensus_live`);
const [rec] = await q(`select count(*) filter (where is_fire and result='WIN') || '-' || count(*) filter (where is_fire and result='LOSS') || '-' || count(*) filter (where is_fire and result='PUSH') fire_wlp_record from hb_consensus_record`);
console.log('metric | baseline 11-22 | now');
for (const k of ['pending', 'pre_floor_pending', 'post_floor_stale', 'twin_total']) console.log(`${k} | ${BASELINE[k]} | ${m?.[k]}`);
console.log(`fire W-L-P | ${BASELINE.fire_wlp} | hb_consensus_live ${m?.fire_wlp_live} · hb_consensus_record (public record) ${rec?.fire_wlp_record}`);
console.log('  (the exact 11-22 fire query was not recorded: both sources are shown; the one whose numbers fit the baseline plus the check-2 rows is the comparable one)');

console.log(`\n== Check 2: rows newly twin-graded since the baseline (verify each against the ESPN final)`);
const twins = await q(`select id, et_date, sport, market, side, team, opponent, home_team, away_team,
  consensus_line, result, grade_source, home_score, away_score, final_score, graded_at
  from hb_consensus_live where grade_source like '%_twin' and graded_at > '${BASELINE_AT}' order by graded_at`);
console.log(`count ${twins.length}`); for (const r of twins) console.log(JSON.stringify(r));

console.log(`\n== Check 3: pending ≥ floor, started > 6 h ago (each needs: no final ESPN twin yet, or a writer hold reason)`);
const stuck = await q(`select id, et_date, sport, team, opponent, commence_time, warnings from hb_consensus_live
  where result='pending' and et_date >= '2026-11-21' and commence_time < now() - interval '6 hours' order by commence_time`);
console.log(`count ${stuck.length}`); for (const r of stuck) console.log(JSON.stringify(r));

console.log(`\n== Check 4: pre-floor rows changed since the baseline (pass: 0, or only et_date 2026-11-20 graded before 2026-11-23 by the live writeCycle)`);
const pre = await q(`select id, et_date, result, grade_source, graded_at from hb_consensus_live
  where et_date < '2026-11-21' and graded_at > '${BASELINE_AT}' order by et_date, graded_at`);
const preBad = pre.filter((r) => !(String(r.et_date).startsWith('2026-11-20') && Date.parse(r.graded_at) < Date.parse('2026-11-23T00:00:00Z')));
console.log(`count ${pre.length}, outside the allowed 11-20 window: ${preBad.length}`); for (const r of pre) console.log(JSON.stringify(r));

console.log(`\n== Check 1 (manual, Hetzner): ssh root@87.99.132.176 'pm2 logs hb-consensus-writer --lines 400 --nostream | grep "regrade older pending"'  → need a cycle after 11-24 00:00 ET with twin>0 and no errors`);
console.log(`== Check 5 (manual): fire W-L-P change since baseline = results of check-2 rows + normal fresh grades since ${BASELINE_AT}`);
console.log(`\nAUTOMATIC: check 4 ${preBad.length === 0 ? 'PASS' : 'FAIL'} · checks 1, 2, 3, 5 need the human review above. Record the result in the tracker § DAI-02.`);
