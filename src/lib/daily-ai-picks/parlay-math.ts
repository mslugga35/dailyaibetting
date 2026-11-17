/**
 * Ported 2026-11-17 from hiddenbag-v2/scripts/daily-report/parlay-math.mjs
 * (same logic; TypeScript annotations only). Keep the two in step.
 */
/**
 * Parlay odds arithmetic and a validator for LLM-generated reports.
 *
 * The report prompt asks the model to "calculate combined decimal odds and
 * convert to American". Compounding a dozen legs is exponentiation, and the
 * model gets it wrong intermittently — a measured example published a 12-leg
 * parlay as "+150 to +250" when the true figure was ≈+1099, understating the
 * payout roughly 5x. Another run of the identical prompt got it right, so this
 * cannot be fixed by prompting alone.
 *
 * Everything here is deterministic. The validator recomputes every arithmetic
 * claim it can parse and annotates the ones that are wrong, so a bad number is
 * visibly corrected rather than silently published.
 */

/** Convert American odds to decimal. -150 → 1.667, +150 → 2.5 */
export function americanToDecimal(american: number | string): number {
  const a = Number(american);
  if (!Number.isFinite(a) || a === 0) return NaN;
  return a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
}

/** Convert decimal odds to American. 2.5 → +150, 1.667 → -150 */
export function decimalToAmerican(decimal: number | string): number {
  const d = Number(decimal);
  if (!Number.isFinite(d) || d <= 1) return NaN;
  return d >= 2 ? Math.round((d - 1) * 100) : -Math.round(100 / (d - 1));
}

/** Combine decimal odds for a parlay (product of all legs). */
export function combineDecimal(decimals: Array<number | string>): number {
  return decimals.reduce<number>((acc, d) => acc * Number(d), 1);
}

/** Combine American odds legs into a single American price. */
export function combineAmerican(americanLegs: Array<number | string>): number {
  return decimalToAmerican(combineDecimal(americanLegs.map(americanToDecimal)));
}

/** Format an American number with an explicit sign, the way books display it. */
export function formatAmerican(n: number): string {
  if (!Number.isFinite(n)) return '?';
  return n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`;
}

// Relative error above which a claim is treated as wrong rather than rounded.
// The model routinely rounds (51.4 vs 52.8 on a 5-leg product), so the band has
// to tolerate real rounding while still catching a 5x miss.
const TOLERANCE = 0.15;

function relError(claimed: number, actual: number): number {
  if (!Number.isFinite(claimed) || !Number.isFinite(actual) || actual === 0) return Infinity;
  return Math.abs(claimed - actual) / Math.abs(actual);
}

/**
 * Scan a generated report for parlay arithmetic and recompute it.
 *
 * Handles the three shapes the model actually produces:
 *   product  "2.5 × 2.1 × 2.18 = 51.4"
 *   power    "1.55^12 ≈ 250x"
 *   convert  "6.32 dec = +532"
 *
 * @returns {{issues: Array, corrected: string}} issues found, and the report
 *   with each wrong figure annotated inline.
 */
export interface ParlayIssue {
  type: string;
  claimed: number;
  actual: number;
  relativeError: number;
  severity: 'severe' | 'minor';
  excerpt: string;
}

export function validateParlayMath(report: string): { issues: ParlayIssue[]; corrected: string } {
  const issues: ParlayIssue[] = [];
  let corrected = report;

  const record = (type: string, claimed: number, actual: number, excerpt: string): ParlayIssue | null => {
    const err = relError(claimed, actual);
    if (err <= TOLERANCE) return null;
    const issue: ParlayIssue = {
      type,
      claimed,
      actual: Number(actual.toFixed(2)),
      relativeError: Number(err.toFixed(3)),
      severity: err > 0.5 ? 'severe' as const : 'minor' as const,
      excerpt: excerpt.slice(0, 160),
    };
    issues.push(issue);
    return issue;
  };

  // The report is markdown, so figures are routinely wrapped in ** or *.
  // Every pattern below has to survive "≈ **+150 to +250**".
  const MD = '[\\s*_]*';
  // Results are written with thousands separators ("= ~6,500", "+446,040").
  // Without this the parser reads "6,500" as 6 and reports a nonsense error.
  const NUM = '\\d[\\d,]*(?:\\.\\d+)?';
  const num = (s: string) => Number(String(s).replace(/,/g, ''));

  // ── product chains: 2.5 × 2.1 × 2.18 × 2.05 = 51.4 ────────────────────────
  const productRe = new RegExp(
    `(\\d+(?:\\.\\d+)?)${MD}(?:[×x]${MD}(\\d+(?:\\.\\d+)?)${MD}){2,}(?:[=≈]|→)${MD}~?(${NUM})`,
    'g',
  );
  for (const m of [...report.matchAll(productRe)]) {
    // Parse factors and the claimed result separately: factors never carry
    // separators, the result routinely does.
    const claimed = num(m[3]);
    const nums = [...m[0].slice(0, m[0].lastIndexOf(m[3])).matchAll(/(\d+\.\d+|\d+)/g)]
      .map((x) => Number(x[1]));
    // Only treat it as odds if every factor looks like a decimal price. Real
    // legs sit between 1.01 and ~25 (a +2400 long shot); anything larger is
    // some other number run, like win-loss records.
    if (nums.length < 2 || !nums.every((n) => n > 1 && n <= 25)) continue;
    const actual = combineDecimal(nums);
    const issue = record('product', claimed, actual, m[0]);
    if (issue) {
      corrected = corrected.replace(
        m[0],
        `${m[0]} [auto-corrected: ${actual.toFixed(2)}]`,
      );
    }
  }

  // ── powers: 1.55^12 ≈ 250x ────────────────────────────────────────────────
  const powerRe = new RegExp(
    `(\\d+(?:\\.\\d+)?)${MD}\\^${MD}(\\d+)${MD}(?:[=≈]|→)${MD}~?(${NUM})`,
    'g',
  );
  for (const m of [...report.matchAll(powerRe)]) {
    const base = Number(m[1]);
    const exp = Number(m[2]);
    const claimed = num(m[3]);
    if (!(base > 1 && base < 100) || exp < 2 || exp > 30) continue;
    const actual = Math.pow(base, exp);
    const issue = record('power', claimed, actual, m[0]);
    if (issue) {
      corrected = corrected.replace(
        m[0],
        `${m[0]} [auto-corrected: ${actual.toFixed(2)}x = ${formatAmerican(decimalToAmerican(actual))}]`,
      );
    }
  }

  // ── "~1.23 each ×12 ≈ +150 to +250" ───────────────────────────────────────
  // The published defect used this phrasing rather than a "^" power, and often
  // states the result as a range. Take the top of the range as the claim, since
  // that is the most favourable reading of what was published.
  const eachRe = new RegExp(
    `~?(\\d+\\.\\d+)${MD}(?:each|avg|average)?${MD}[×x]${MD}(\\d+)${MD}\\)?${MD}(?:legs?)?${MD}` +
      `[≈=→]{1,2}${MD}([+-]?${NUM})(?:${MD}(?:to|–|-)${MD}([+-]?${NUM}))?${MD}(x)?`,
    'gi',
  );
  for (const m of [...report.matchAll(eachRe)]) {
    const base = Number(m[1]);
    const exp = Number(m[2]);
    if (!(base > 1 && base <= 25) || exp < 2 || exp > 30) continue;
    const isMultiplier = Boolean(m[5]);
    const claimedRaw = num(m[4] ?? m[3]); // top of range when given
    const actualDecimal = Math.pow(base, exp);
    const actual = isMultiplier ? actualDecimal : decimalToAmerican(actualDecimal);
    const issue = record('each-times-n', claimedRaw, actual, m[0]);
    if (issue) {
      corrected = corrected.replace(
        m[0],
        `${m[0]} [auto-corrected: ${actualDecimal.toFixed(2)}x = ${formatAmerican(decimalToAmerican(actualDecimal))}]`,
      );
    }
  }

  // ── decimal → American: "6.32 dec = +532" ─────────────────────────────────
  const convertRe = new RegExp(
    `(\\d+(?:\\.\\d+)?)${MD}(?:dec(?:imal)?)\\b[^+\\-\\d]{0,20}([+-]${NUM})`,
    'gi',
  );
  for (const m of [...report.matchAll(convertRe)]) {
    const dec = Number(m[1]);
    const claimed = num(m[2]);
    if (!(dec > 1 && dec < 100000)) continue;
    const actual = decimalToAmerican(dec);
    const issue = record('conversion', claimed, actual, m[0]);
    if (issue) {
      corrected = corrected.replace(
        m[0],
        `${m[0]} [auto-corrected: ${formatAmerican(actual)}]`,
      );
    }
  }

  return { issues, corrected };
}
