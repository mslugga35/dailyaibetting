'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface R3 { wins: number; losses: number; pushes: number; decided: number; winPct: number | null }
export interface Disclosure { kept: R3; excluded: R3 | null; withExcluded: R3 | null; byCapperCount: Array<{ label: string } & R3> }

const n = (x: number) => x.toLocaleString('en-US');
const rec = (r: R3) => `${n(r.wins)}-${n(r.losses)}-${n(r.pushes)}`;
const pct = (r: R3) => (r.winPct == null ? '—' : `${r.winPct.toFixed(1)}%`);

/** Pure text builder (tested): how the headline record is counted, in plain words from live counts. */
export function disclosureLines(d: Disclosure): string[] {
  const lines: string[] = [];
  if (d.excluded && d.withExcluded && d.excluded.wins + d.excluded.losses + d.excluded.pushes > 0) {
    lines.push(
      `When cappers backed both sides of one game, only the side with more cappers counts as a fire pick (a tie counts neither). ` +
      `That removed ${n(d.excluded.wins + d.excluded.losses + d.excluded.pushes)} graded picks, which went ${rec(d.excluded)} (${pct(d.excluded)}). ` +
      `Including them, the record would be ${rec(d.withExcluded)} (${pct(d.withExcluded)}).`,
    );
  }
  const buckets = d.byCapperCount.filter((b) => b.wins + b.losses + b.pushes > 0);
  if (buckets.length > 0) {
    lines.push(`Win rate by number of cappers: ${buckets.map((b) => `${b.label} ${pct(b)}`).join(', ')}.`);
  }
  lines.push('Wins and losses are graded from final scores. Odds were not recorded, so ROI and units are estimates at -110. Break-even at -110 is 52.4%.');
  return lines;
}

/** Shown wherever the headline record is shown (Muse review 2026-11-19). Aggregates only. */
/** Server pages pass `initial` so the note is in the HTML (no JS needed, no layout shift). */
export function RecordDisclosure({ className = '', initial = null }: { className?: string; initial?: Disclosure | null }) {
  const [d, setD] = useState<Disclosure | null>(initial);
  useEffect(() => {
    if (initial) return;
    let live = true;
    fetch('/api/results?view=disclosure')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j?.data) setD(j.data); })
      .catch(() => {});
    return () => { live = false; };
  }, [initial]);
  if (!d) return null;
  return (
    <div data-testid="record-disclosure" className={`rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1 ${className}`}>
      <p className="font-medium text-foreground">How this record is counted</p>
      {disclosureLines(d).map((l) => <p key={l.slice(0, 40)}>{l}</p>)}
      <p><Link href="/results" className="underline">Full method and every graded pick</Link></p>
    </div>
  );
}
