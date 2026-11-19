import Link from 'next/link';
import { policiesPublished, HELPLINE } from '@/lib/legal/policies';
import { Brain } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">DailyAI Betting</span>
          </Link>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link
              href="/daily-bets"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Daily Bets
            </Link>
            <Link
              href="/consensus"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Consensus
            </Link>
            <Link
              href="/picks"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              All Picks
            </Link>
            <Link
              href="/sportsbooks"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sportsbooks
            </Link>
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Blog
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            &copy; {new Date().getFullYear()} DailyAI Betting
          </p>
        </div>

        <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4 text-xs">
          {policiesPublished() && (
            <>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link href="/refund-policy" className="text-muted-foreground hover:text-foreground">Refunds &amp; Cancellation</Link>
            </>
          )}
          <Link href="/responsible-gambling" className="text-muted-foreground hover:text-foreground">Responsible Gambling</Link>
        </nav>
        <p className="text-xs text-muted-foreground text-center mt-2" data-testid="footer-disclaimer">
          21+ only. Picks are analysis, not betting advice or a guarantee; you can lose money.
          Gambling problem? Call or text {HELPLINE}.
        </p>
      </div>
    </footer>
  );
}
