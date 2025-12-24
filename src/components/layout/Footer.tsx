import Link from 'next/link';
import { Brain } from 'lucide-react';

const footerLinks = {
  picks: [
    { name: 'MLB Picks', href: '/picks/mlb' },
    { name: 'NFL Picks', href: '/picks/nfl' },
    { name: 'NBA Picks', href: '/picks/nba' },
    { name: 'All Picks', href: '/picks' },
  ],
  features: [
    { name: 'Consensus Picks', href: '/consensus' },
    { name: 'Capper Rankings', href: '/cappers' },
    { name: 'Best Bets', href: '/best-bets' },
    { name: 'Trends', href: '/trends' },
  ],
  resources: [
    { name: 'How It Works', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' },
    { name: 'Privacy', href: '/privacy' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">DailyAI Betting</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              AI-powered sports betting picks with consensus analysis from top cappers.
              Updated daily with real-time tracking.
            </p>
          </div>

          {/* Picks */}
          <div className="space-y-4">
            <h3 className="font-semibold">Picks</h3>
            <ul className="space-y-2">
              {footerLinks.picks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="font-semibold">Features</h3>
            <ul className="space-y-2">
              {footerLinks.features.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-semibold">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} DailyAI Betting. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            For entertainment purposes only. Please gamble responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
}
