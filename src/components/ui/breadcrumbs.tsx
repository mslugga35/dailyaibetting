'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

// Route to breadcrumb label mapping
const routeLabels: Record<string, string> = {
  '': 'Home',
  'nfl-picks-today': 'NFL Picks',
  'nba-picks-today': 'NBA Picks',
  'mlb-picks-today': 'MLB Picks',
  'nhl-picks-today': 'NHL Picks',
  'cfb-picks-today': 'College Football',
  'cbb-picks-today': 'College Basketball',
  'sportsbooks': 'Sportsbooks',
  'results': 'Results',
  'history': 'History',
  'consensus': 'Consensus',
  'picks': 'All Picks',
  'cappers': 'Cappers',
  'best-bets': 'Best Bets',
  'daily-bets': 'Daily Bets',
  'trends': 'Trends',
  'advertise': 'Advertise',
  'games': 'Games',
};

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if not provided
  const breadcrumbs: BreadcrumbItem[] = items || (() => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

    let path = '';
    for (const segment of segments) {
      path += `/${segment}`;
      const label = routeLabels[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      crumbs.push({ label, href: path });
    }

    return crumbs;
  })();

  // Don't show breadcrumbs on homepage
  if (pathname === '/') return null;

  return (
    <nav aria-label="Breadcrumb" className={`mb-4 ${className}`}>
      <ol
        className="flex items-center gap-1 text-sm text-muted-foreground"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li
              key={crumb.href}
              className="flex items-center gap-1"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              )}
              {isLast ? (
                <span
                  className="text-foreground font-medium"
                  itemProp="name"
                >
                  {index === 0 ? <Home className="h-4 w-4" /> : crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-primary transition-colors flex items-center"
                  itemProp="item"
                >
                  <span itemProp="name">
                    {index === 0 ? <Home className="h-4 w-4" /> : crumb.label}
                  </span>
                </Link>
              )}
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Related links component for internal linking
interface RelatedLink {
  href: string;
  label: string;
  description?: string;
}

interface RelatedLinksProps {
  links: RelatedLink[];
  title?: string;
  className?: string;
}

export function RelatedLinks({ links, title = 'Related Pages', className = '' }: RelatedLinksProps) {
  return (
    <div className={`border-t pt-8 mt-8 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group block p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
          >
            <div className="font-medium group-hover:text-primary transition-colors">
              {link.label}
            </div>
            {link.description && (
              <div className="text-sm text-muted-foreground mt-1">
                {link.description}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Quick navigation for sport pages
export function SportQuickNav({ currentSport }: { currentSport?: string }) {
  const sports = [
    { key: 'NFL', href: '/nfl-picks-today', emoji: '🏈' },
    { key: 'NBA', href: '/nba-picks-today', emoji: '🏀' },
    { key: 'MLB', href: '/mlb-picks-today', emoji: '⚾' },
    { key: 'NHL', href: '/nhl-picks-today', emoji: '🏒' },
    { key: 'CFB', href: '/cfb-picks-today', emoji: '🏈' },
    { key: 'CBB', href: '/cbb-picks-today', emoji: '🏀' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {sports.map((sport) => (
        <Link
          key={sport.key}
          href={sport.href}
          className={`
            inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium
            transition-colors border
            ${currentSport === sport.key
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card hover:border-primary/50'
            }
          `}
        >
          <span>{sport.emoji}</span>
          <span>{sport.key}</span>
        </Link>
      ))}
    </div>
  );
}
