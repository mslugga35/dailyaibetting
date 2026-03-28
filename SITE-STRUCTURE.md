# DailyAI Betting - Complete Site Structure & Architecture

**Last Updated:** 2026-03-27
**Framework:** Next.js 16.1.1 (App Router)
**Package:** `/c/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting`

---

## 1. FRAMEWORK & TECH STACK

- **Next.js 16.1.1** with App Router (`src/app/`)
- **React 19.2.3** (Server & Client Components)
- **TypeScript 5** (full type safety)
- **Supabase** (PostgreSQL backend + authentication)
- **Tailwind CSS 4** + shadcn/ui (Radix UI components)
- **Recharts** (data visualization)
- **Vercel Deployment**

---

## 2. PROJECT STRUCTURE

```
dailyaibetting/
├── src/
│   ├── app/                          # Next.js App Router (file-based routing)
│   │   ├── layout.tsx                # Root layout (Header, Footer, global meta)
│   │   ├── page.tsx                  # Homepage (/)
│   │   ├── globals.css               # Tailwind + custom global styles
│   │   ├── robots.ts                 # SEO robots.txt
│   │   ├── sitemap.ts                # Dynamic sitemap generation
│   │   │
│   │   ├── api/                      # API routes (Next.js route handlers)
│   │   │   ├── consensus/route.ts    # GET /api/consensus (main API)
│   │   │   ├── picks/route.ts        # GET /api/picks (all picks)
│   │   │   ├── cappers/route.ts      # GET /api/cappers (capper list)
│   │   │   ├── blog/route.ts         # GET /api/blog (blog posts)
│   │   │   ├── daily-bets/route.ts   # GET /api/daily-bets
│   │   │   ├── consensus-sql/route.ts# SQL consensus builder
│   │   │   ├── results/route.ts      # GET /api/results (grading)
│   │   │   ├── cron/grade-picks/     # Scheduled job: grade yesterday's picks
│   │   │   ├── notifications/route.ts# Notification system
│   │   │   └── debug-schedule/       # Debug sports schedule
│   │   │
│   │   ├── consensus/                # Consensus picks pages
│   │   │   ├── page.tsx              # All consensus (/consensus)
│   │   │   ├── [sport]/page.tsx      # By sport (/consensus/[sport])
│   │   │   ├── layout.tsx            # Page layout + metadata
│   │   │   └── ConsensusContent.tsx  # Client component (data + charts)
│   │   │
│   │   ├── blog/                     # Blog system
│   │   │   ├── page.tsx              # Blog home (/blog)
│   │   │   ├── [slug]/page.tsx       # Individual post (/blog/[slug])
│   │   │   └── layout.tsx            # Blog layout
│   │   │
│   │   ├── daily-bets/               # AI curated best bets
│   │   │   ├── page.tsx              # (/daily-bets)
│   │   │   ├── layout.tsx
│   │   │   └── DailyBetsContent.tsx
│   │   │
│   │   ├── best-bets/                # Best bets page
│   │   │   ├── page.tsx              # (/best-bets)
│   │   │   ├── layout.tsx
│   │   │   └── opengraph-image.tsx   # OG image generation
│   │   │
│   │   ├── cappers/                  # Capper profiles
│   │   │   ├── page.tsx              # Leaderboard (/cappers)
│   │   │   └── [slug]/page.tsx       # Individual capper (/cappers/[slug])
│   │   │
│   │   ├── picks/                    # All picks browser
│   │   │   ├── page.tsx              # (/picks)
│   │   │   └── layout.tsx
│   │   │
│   │   ├── sport-picks-today/        # Sport-specific pages (dynamic)
│   │   │   ├── nfl-picks-today/      # (/nfl-picks-today)
│   │   │   ├── nba-picks-today/      # (/nba-picks-today)
│   │   │   ├── mlb-picks-today/      # (/mlb-picks-today)
│   │   │   ├── nhl-picks-today/      # (/nhl-picks-today)
│   │   │   ├── cfb-picks-today/      # (/cfb-picks-today)
│   │   │   ├── cbb-picks-today/      # (/cbb-picks-today)
│   │   │   ├── mma-picks-today/      # (/mma-picks-today)
│   │   │   ├── soccer-picks-today/   # (/soccer-picks-today)
│   │   │   └── [each has: page.tsx, layout.tsx, opengraph-image.tsx]
│   │   │
│   │   ├── parlay-picks/             # Parlay picks
│   │   ├── expert-picks/             # Expert consensus
│   │   ├── trends/                   # Trends & insights
│   │   ├── history/                  # Pick history
│   │   ├── results/                  # Result tracking
│   │   ├── matchups/                 # Game matchup details
│   │   ├── stats/                    # Stats dashboard
│   │   ├── sportsbooks/              # Sportsbook ratings
│   │   ├── games/                    # Game schedule
│   │   ├── advertise/                # Advertise page
│   │   ├── admin/                    # Admin panel
│   │   │   └── grading/              # Manual grading interface
│   │   ├── free-sports-picks/        # Free picks landing
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── opengraph-image.tsx
│   │   │   └── FreeSportsPicksContent.tsx
│   │   │
│   │   └── favicon.ico               # Site favicon
│   │
│   ├── components/                   # Reusable React components
│   │   ├── layout/
│   │   │   ├── Header.tsx            # Navigation + sports dropdown
│   │   │   └── Footer.tsx            # Footer links & info
│   │   ├── picks/                    # Pick-related components
│   │   │   ├── ConsensusCard.tsx
│   │   │   ├── StatsOverview.tsx
│   │   │   ├── PicksTable.tsx
│   │   │   └── FirePicksBanner.tsx
│   │   ├── cappers/                  # Capper components
│   │   │   ├── CapperLeaderboard.tsx
│   │   │   ├── CapperCard.tsx
│   │   │   └── CapperStats.tsx
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── breadcrumbs.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── sheet.tsx             # Mobile menu
│   │   │   └── [15+ more]
│   │   ├── seo/
│   │   │   └── JsonLd.tsx            # Structured data (schema.org)
│   │   ├── analytics/
│   │   │   └── GoogleAnalytics.tsx   # GA4 tracking
│   │   └── monetization/
│   │       ├── ProPopup.tsx          # Upgrade to Pro CTA
│   │       └── EmailCapture.tsx      # Email collection
│   │
│   ├── lib/                          # Utility functions & hooks
│   │   ├── supabase/
│   │   │   ├── client.ts             # Supabase client (browser)
│   │   │   ├── server.ts             # Supabase client (server)
│   │   │   └── admin.ts              # Admin Supabase client
│   │   │
│   │   ├── data/                     # Data fetching
│   │   │   ├── google-sheets.ts      # Parse picks from Google Sheets (legacy)
│   │   │   ├── supabase-picks.ts     # Fetch from Supabase hb_picks
│   │   │   ├── server-fetch.ts       # Server-side data fetching
│   │   │   ├── espn-scores.ts        # ESPN schedule & scores
│   │   │   └── [other data sources]
│   │   │
│   │   ├── consensus/                # Consensus logic
│   │   │   ├── consensus-builder.ts  # Main consensus algorithm
│   │   │   ├── team-mappings.ts      # 281 NCAAB teams + aliases
│   │   │   ├── game-schedule.ts      # ESPN game filter
│   │   │   └── sports-normalize.ts   # Sport classification
│   │   │
│   │   ├── hooks/                    # React hooks
│   │   │   ├── use-consensus.ts      # Consensus data hook
│   │   │   └── use-picks.ts          # Picks data hook
│   │   │
│   │   ├── utils/
│   │   │   ├── date.ts               # Date utilities
│   │   │   ├── logger.ts             # Request logging
│   │   │   ├── odds.ts               # Odds math
│   │   │   └── utils.ts              # General utilities
│   │   │
│   │   └── daily-bets/               # Daily bets logic
│   │       ├── daily-bets-builder.ts
│   │       └── [scoring functions]
│   │
│   └── types/                        # TypeScript types
│       ├── picks.ts                  # Pick types
│       ├── consensus.ts              # Consensus types
│       ├── blog.ts                   # Blog post types
│       └── [sport-specific types]
│
├── public/                           # Static assets
│   ├── opengraph-image.png
│   ├── robots.txt
│   ├── sitemap.xml
│   └── [favicons, logos, etc.]
│
├── supabase/                         # Database schema
│   └── schema.sql                    # PostgreSQL tables + RLS policies
│
├── newpage/                          # FEATURE: New page templates/specs
│   └── dailyaibets.txt              # Detailed requirements for new pages
│
├── docs/                             # Documentation
├── scripts/                          # Utility scripts
├── bots/                             # Bot automation
├── n8n-workflows/                    # n8n workflow backups
│
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── tailwind.config.ts                # Tailwind configuration
├── next.config.ts                    # Next.js config
├── .env.example                      # Environment variables template
├── .env.local                        # Local env (secrets)
└── CLAUDE.md                         # Project instructions
```

---

## 3. ROUTING STRUCTURE (Next.js App Router)

### File-Based Routing
All routes are defined by directory structure in `src/app/`:

| Route | File | Type |
|-------|------|------|
| `/` | `app/page.tsx` | Home |
| `/blog` | `app/blog/page.tsx` | Blog list |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | Blog post (dynamic) |
| `/consensus` | `app/consensus/page.tsx` | All consensus |
| `/consensus/[sport]` | `app/consensus/[sport]/page.tsx` | Sport consensus |
| `/cappers` | `app/cappers/page.tsx` | Capper leaderboard |
| `/cappers/[slug]` | `app/cappers/[slug]/page.tsx` | Individual capper |
| `/nfl-picks-today` | `app/nfl-picks-today/page.tsx` | NFL picks |
| `/nba-picks-today` | `app/nba-picks-today/page.tsx` | NBA picks |
| `/api/consensus` | `app/api/consensus/route.ts` | API endpoint |
| `/api/picks` | `app/api/picks/route.ts` | API endpoint |

### Dynamic Routes
- **`[slug]`** — URL parameter matching
- **Catch-all routes** — Not currently used
- **Optional parameters** — Not currently used

---

## 4. LAYOUT SYSTEM

### Root Layout (`src/app/layout.tsx`)
Wraps entire site with:
- **Header** (sticky navigation)
- **Main content** (`{children}`)
- **Footer**
- **Global metadata** (SEO, OG tags, robots)
- **Global styles** (`globals.css`)
- **Scripts** (GA4, AdSense, HarborSEO)

### Nested Layouts
Sub-directories can have their own `layout.tsx`:
- `/blog/layout.tsx` — Blog-specific layout (sidebar, categories)
- `/consensus/layout.tsx` — Consensus page layout
- Sport pages (`/nfl-picks-today/layout.tsx`) — Sport-specific UI

**Layout Inheritance:**
```
Root Layout
├── /blog/layout.tsx
│   ├── /blog/page.tsx (Blog list)
│   └── /blog/[slug]/page.tsx (Blog post)
├── /consensus/layout.tsx
│   ├── /consensus/page.tsx
│   └── /consensus/[sport]/page.tsx
└── /nfl-picks-today/layout.tsx
    └── /nfl-picks-today/page.tsx
```

---

## 5. NAVIGATION & HEADER

### Header Component (`src/components/layout/Header.tsx`)
**Desktop Navigation:**
- Logo (links to home)
- Sports dropdown (NFL, NBA, MLB, NHL, CFB, CBB)
- Main nav items (Daily Bets, Consensus, Stats, All Picks, Blog)
- Upgrade to Pro button
- Live indicator badge

**Mobile Navigation:**
- Hamburger menu (Sheet/Drawer)
- Collapsible sports section
- Stacked nav items

### Main Navigation Items (Hard-coded)
```tsx
const navItems = [
  { name: 'Daily Bets', href: '/daily-bets' },
  { name: 'Consensus', href: '/consensus' },
  { name: 'Stats', href: '/stats' },
  { name: 'All Picks', href: '/picks' },
  { name: 'Blog', href: '/blog' },
];
```

**Sports Dropdown:**
```tsx
const sports = [
  { name: 'NFL', href: '/nfl-picks-today' },
  { name: 'NBA', href: '/nba-picks-today' },
  { name: 'MLB', href: '/mlb-picks-today' },
  { name: 'NHL', href: '/nhl-picks-today' },
  { name: 'CFB', href: '/cfb-picks-today' },
  { name: 'CBB', href: '/cbb-picks-today' },
];
```

---

## 6. API ROUTES & ENDPOINTS

### Main Consensus API
**Route:** `GET /api/consensus`

**Query Parameters:**
- `sport=NBA` — Filter by sport
- `minCappers=2` — Minimum agreement threshold (default: 2)
- `date=yesterday` — Yesterday's consensus with W/L results

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-03-27T...",
  "date": "2026-03-27",
  "totalPicks": 42,
  "capperCount": 8,
  "consensusCount": 15,
  "consensus": [{
    "team": "Lakers",
    "pickType": "spread",
    "line": "-6.5",
    "sport": "NBA",
    "capperCount": 3,
    "cappers": ["Dave Price", "Jack Jones", "Pure Lock"],
    "fireTag": true,
    "odds": "-110"
  }],
  "topOverall": [...],
  "bySport": {...},
  "fadeThePublic": [...],
  "insights": {...},
  "picksByCapper": {...},
  "allPicks": [...]
}
```

### Other API Endpoints
| Endpoint | Purpose | Method |
|----------|---------|--------|
| `/api/picks` | All picks (paginated) | GET |
| `/api/cappers` | Capper list + stats | GET |
| `/api/blog` | Blog posts | GET |
| `/api/daily-bets` | AI curated picks | GET |
| `/api/results` | Grading results | POST |
| `/api/cron/grade-picks` | Scheduled grading job | POST |
| `/api/consensus-sql` | SQL-based consensus | GET |
| `/api/notifications` | Notification system | POST |
| `/api/debug-schedule` | ESPN schedule debug | GET |

---

## 7. CONTENT PAGES & RENDERING

### Blog System (Dynamic Content)

**Blog List Page** (`/blog/page.tsx`):
- Fetches all `blog_posts` from Supabase (status='published')
- Renders as grid or list
- Shows title, excerpt, category, publish date, author

**Blog Post Page** (`/blog/[slug]/page.tsx`):
- Dynamic route matching slug parameter
- Fetches single post from Supabase by `slug`
- Generates metadata (SEO title, description) from post data
- Renders:
  - Header (title, category, date, view count)
  - Content (HTML from `content` field, sanitized)
  - Tags
  - AI attribution
  - Email capture banner
  - Related links

**Rendering Pattern:**
```tsx
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  return { title: post.seo_title || post.title, ... };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  return <div>{post.content}</div>;
}
```

### Consensus Pages (Data-Driven)

**Consensus List** (`/consensus/page.tsx`):
- Server component
- Fetches data via `/api/consensus`
- Passes to client component `ConsensusContent.tsx`
- Client renders interactive UI (filters, sorting, charts)

**Sport-Specific Consensus** (`/consensus/[sport]/page.tsx`):
- Similar to list page
- Filters by sport parameter (`[sport]`)
- Shows only that sport's picks

### Sport-Specific Pages (Static Templates)

**Pattern:** `/nfl-picks-today/page.tsx`, `/nba-picks-today/page.tsx`, etc.

Each page:
- Fetches consensus data for that sport
- Renders sport-specific UI
- Has layout & OG image generator (`opengraph-image.tsx`)
- Metadata template: `"Free {SPORT} Picks Today | DailyAI Betting"`

---

## 8. SUPABASE CONNECTION

### Database Tables
1. **`hb_picks`** — All picks (source of truth)
   - Columns: `id`, `capper`, `team`, `league`, `pick_type`, `line`, `odds`, `source`, `created_at`, `published_at`, `sport`
   - Written by: Discord bot, web scrapers
   - Read by: Website API routes

2. **`blog_posts`** — Blog content
   - Columns: `id`, `slug`, `title`, `excerpt`, `content`, `category`, `tags`, `featured_image`, `seo_title`, `seo_description`, `published_at`, `view_count`, `ai_model`, `author`, `status`
   - Written by: Admin panel or CI pipeline
   - Read by: Blog pages

3. **`hb_cappers`** — Capper metadata
   - Columns: `id`, `name`, `discord_id`, `record`, `roi`, `win_rate`, etc.

### Client/Server Access

**Server Functions** (`lib/supabase/server.ts`):
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
const { data } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('status', 'published');
```

**Env Variables** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
```

---

## 9. ADDING A NEW PAGE ROUTE

### Step 1: Create the Directory & Files

Create new route folder with standard files:

```bash
# For a new dedicated page like /my-new-page
mkdir -p src/app/my-new-page
touch src/app/my-new-page/page.tsx
touch src/app/my-new-page/layout.tsx  # Optional if inheriting root layout
```

### Step 2: Create `page.tsx` (Page Component)

**Simple static page:**
```typescript
// src/app/my-new-page/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My New Page | DailyAI Betting',
  description: 'Description for SEO',
};

export default function MyNewPage() {
  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">My New Page</h1>
      <p>Content here...</p>
    </div>
  );
}
```

**Dynamic data page (similar to blog post):**
```typescript
// src/app/my-new-page/page.tsx
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  // Fetch data for SEO
  return { title: '...', description: '...' };
}

export default async function MyNewPage() {
  const supabase = createClient(...);
  const { data } = await supabase.from('table').select('*');

  if (!data) notFound();

  return <div>{/* render data */}</div>;
}
```

### Step 3: Create `layout.tsx` (If Needed)

Only create if this page needs custom header/footer/sidebar:

```typescript
// src/app/my-new-page/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | DailyAI Betting',
    default: 'My New Page | DailyAI Betting',
  },
};

export default function MyNewPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <aside className="w-64 bg-muted">
        {/* Sidebar if needed */}
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

### Step 4: Add to Navigation (If Top-Level Page)

Update `src/components/layout/Header.tsx`:

```tsx
const navItems = [
  // ... existing items
  { name: 'My New Page', href: '/my-new-page', icon: MyIcon },
];
```

### Step 5: Create OG Image (Optional)

For social sharing, create dynamic OG image:

```typescript
// src/app/my-new-page/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'My New Page';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <div style={{ fontSize: 48, background: 'black', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      My New Page
    </div>,
    { ...size }
  );
}
```

### Step 6: Wire Up Data Fetching (If Needed)

**For Supabase data:**
```typescript
// src/lib/data/my-new-page.ts
import { createClient } from '@supabase/supabase-js';

export async function getMyData() {
  const supabase = createClient(...);
  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .eq('status', 'published');

  return data || [];
}
```

**For API-based data:**
```typescript
// In page.tsx
const response = await fetch(`${baseUrl}/api/my-endpoint`, { cache: 'no-store' });
const data = await response.json();
```

### Example: New Blog-Like Page

To add a new content page similar to blog posts:

```typescript
// src/app/guides/page.tsx
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface Guide {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  published_at: string;
}

async function getGuides(): Promise<Guide[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data } = await supabase
    .from('guides')
    .select('id, slug, title, excerpt, category, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  return data || [];
}

export default async function GuidesPage() {
  const guides = await getGuides();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Betting Guides</h1>
      <div className="grid gap-4">
        {guides.map((guide) => (
          <Link key={guide.id} href={`/guides/${guide.slug}`}>
            <div className="border rounded-lg p-4 hover:bg-muted">
              <h2 className="font-bold">{guide.title}</h2>
              <p className="text-sm text-muted-foreground">{guide.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// src/app/guides/[slug]/page.tsx
interface GuidePage {
  params: Promise<{ slug: string }>;
}

async function getGuide(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data } = await supabase
    .from('guides')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  return data;
}

export async function generateMetadata({ params }: GuidePage) {
  const { slug } = await params;
  const guide = await getGuide(slug);

  return {
    title: guide?.seo_title || guide?.title,
    description: guide?.seo_description || guide?.excerpt,
  };
}

export default async function GuidePage({ params }: GuidePage) {
  const { slug } = await params;
  const guide = await getGuide(slug);

  if (!guide) return notFound();

  return (
    <div className="container max-w-3xl px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">{guide.title}</h1>
      <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: guide.content }} />
    </div>
  );
}
```

---

## 10. KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout (Header, Footer, global metadata) |
| `src/app/page.tsx` | Homepage |
| `src/app/api/consensus/route.ts` | Main consensus API |
| `src/lib/consensus/consensus-builder.ts` | Consensus algorithm (281 NCAAB teams, sport matching) |
| `src/lib/data/google-sheets.ts` | Pick parsing & normalization |
| `src/lib/data/supabase-picks.ts` | Supabase fetch + conversion |
| `src/lib/data/espn-scores.ts` | ESPN schedule & grading |
| `src/components/layout/Header.tsx` | Navigation + sports dropdown |
| `src/components/layout/Footer.tsx` | Footer |
| `src/app/blog/[slug]/page.tsx` | Dynamic blog post template |
| `src/app/consensus/page.tsx` | Consensus page (server) |
| `src/app/consensus/ConsensusContent.tsx` | Consensus UI (client) |
| `.env.local` | Secrets (Supabase keys, API keys) |
| `CLAUDE.md` | Project documentation |

---

## 11. DEVELOPMENT WORKFLOW

### Running Locally
```bash
cd C:\Users\mpmmo\DirectoryWebsites\Sites\dailyaibetting
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # Run ESLint
```

### Creating a New Feature
1. **Create route folder** → `src/app/my-feature/page.tsx`
2. **Add metadata** → SEO title, description, OG image
3. **Fetch data** → Supabase, API, or static
4. **Render component** → Use shadcn/ui components
5. **Update nav** → Add to Header if top-level
6. **Deploy** → Push to Vercel (auto-deploy on main branch)

### Testing Routes
- Homepage: `http://localhost:3000`
- Consensus: `http://localhost:3000/consensus`
- Blog: `http://localhost:3000/blog`
- Blog post: `http://localhost:3000/blog/my-article-slug`
- API: `http://localhost:3000/api/consensus`

---

## 12. NOTES ON `/newpage` DIRECTORY

The `newpage/` directory contains a detailed specification (`dailyaibets.txt`) for creating a "Daily Best Bets" content page. It includes requirements for:
- Top 5 highest confidence picks
- Most common/consensus bets
- Parlay recommendations
- Sport-specific picks
- MLB-specific props (strikeouts, YRFI, NRFI)

This is **a reference template** — not code. To implement:
1. Create `src/app/daily-best-bets/page.tsx` (or similar)
2. Implement scoring algorithm per the spec
3. Fetch picks via API
4. Render formatted results

---

## SUMMARY

**Framework:** Next.js 16 (App Router) + TypeScript
**Content Rendering:** Server components (SSR) + client components (hydration)
**Routing:** File-based (dynamic segments with `[slug]`)
**Data:** Supabase PostgreSQL + API routes
**Styling:** Tailwind CSS 4 + shadcn/ui
**Deployment:** Vercel (auto on main branch)

To add a new dedicated page route: Create `src/app/my-route/page.tsx` with metadata + component → Next.js auto-routes it → Add to nav if needed → Deploy.
