import Link from 'next/link';
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
          <div className="flex items-center gap-6">
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
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} DailyAI Betting
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          For entertainment purposes only. Please gamble responsibly.
        </p>
      </div>
    </footer>
  );
}
