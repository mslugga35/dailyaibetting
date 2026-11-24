// Render the exact policy text the site will publish (src/lib/legal/policies.ts) as Markdown, with the
// owner-confirmed operator values, for the approval package. Read-only; prints to stdout.
//   node --experimental-strip-types --no-warnings --import ./tests/harness/register.mjs qa/launch-verify/render-policies-md.mjs
process.env.POLICY_LEGAL_NAME = 'Matthew Morales';
process.env.POLICY_GOVERNING_STATE = 'Florida';
process.env.POLICY_OPERATOR_TYPE = 'individual';
const P = await import('../../src/lib/legal/policies.ts');
const out = [];
for (const pol of [P.termsPolicy(), P.privacyPolicy(), P.REFUNDS, P.RESPONSIBLE]) {
  out.push(`## ${pol.title}`, `*Last updated: ${P.POLICY_LAST_UPDATED}* · URL: https://dailyaibetting.com/${pol.slug}`, '');
  for (const s of pol.sections) {
    out.push(`### ${s.heading}`);
    for (const p of s.paragraphs) out.push(p, '');
    for (const l of s.links || []) out.push(`[${l.label}](https://dailyaibetting.com${l.href})`, '');
  }
}
console.log(out.join('\n'));
