/**
 * Muse review 2026-11-19: when the other side of the same game also has consensus, say so,
 * so both sides are never presented as clean agreement. Renders nothing when there is none.
 */
export function oppositeSideText(n: number | undefined): string {
  if (!n || n < 2) return '';
  return `Split: ${n} cappers took the other side`;
}

export function OppositeSideNote({ count, className = '' }: { count?: number; className?: string }) {
  const text = oppositeSideText(count);
  if (!text) return null;
  return (
    <span data-testid="opposite-side" className={`inline-flex items-center rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-500 ${className}`}>
      ⚖️ {text}
    </span>
  );
}
