# DailyAI Betting - Visual File Structure

## Simplified View (What Actually Matters)

```
src/app/                     ← Everything here becomes a route
├── layout.tsx              ← Root layout (wraps all pages)
├── page.tsx                ← Home page (/)
├── globals.css             ← Global styles
│
├── consensus/              ← /consensus
│   ├── page.tsx            ← /consensus (list)
│   ├── [sport]/
│   │   └── page.tsx        ← /consensus/nba (dynamic)
│   ├── layout.tsx
│   └── ConsensusContent.tsx ← Client component
│
├── blog/                   ← /blog
│   ├── page.tsx            ← /blog (list)
│   ├── [slug]/
│   │   └── page.tsx        ← /blog/my-article (dynamic)
│   └── layout.tsx
│
├── daily-bets/             ← /daily-bets
│   ├── page.tsx
│   └── DailyBetsContent.tsx
│
├── cappers/                ← /cappers
│   ├── page.tsx            ← /cappers (leaderboard)
│   └── [slug]/
│       └── page.tsx        ← /cappers/dave-price (dynamic)
│
├── [sport]-picks-today/    ← /nfl-picks-today, /nba-picks-today, etc.
│   ├── nfl-picks-today/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── opengraph-image.tsx
│   ├── nba-picks-today/
│   ├── mlb-picks-today/
│   ├── nhl-picks-today/
│   ├── cfb-picks-today/
│   ├── cbb-picks-today/
│   └── ... (more sports)
│
├── api/                    ← /api routes (backend endpoints)
│   ├── consensus/
│   │   └── route.ts        ← GET /api/consensus
│   ├── picks/
│   │   └── route.ts        ← GET /api/picks
│   ├── cappers/
│   │   └── route.ts        ← GET /api/cappers
│   ├── blog/
│   │   └── route.ts        ← GET /api/blog
│   ├── daily-bets/
│   │   └── route.ts        ← GET /api/daily-bets
│   ├── results/
│   │   └── route.ts        ← POST /api/results
│   └── cron/
│       └── grade-picks/
│           └── route.ts    ← POST /api/cron/grade-picks
│
├── picks/                  ← /picks
│   ├── page.tsx
│   └── layout.tsx
│
├── best-bets/              ← /best-bets
├── trends/                 ← /trends
├── history/                ← /history
├── results/                ← /results
├── matchups/               ← /matchups
├── stats/                  ← /stats
├── sportsbooks/            ← /sportsbooks
├── games/                  ← /games
├── advertise/              ← /advertise
├── admin/                  ← /admin
│   └── grading/            ← /admin/grading
├── parlay-picks/           ← /parlay-picks
├── expert-picks/           ← /expert-picks
├── free-sports-picks/      ← /free-sports-picks
├── soccer-picks-today/     ← /soccer-picks-today
└── mma-picks-today/        ← /mma-picks-today

src/components/            ← Reusable UI components
├── layout/
│   ├── Header.tsx          ← Navigation
│   └── Footer.tsx
├── picks/
│   ├── ConsensusCard.tsx
│   ├── PicksTable.tsx
│   └── ...
├── cappers/
│   ├── CapperLeaderboard.tsx
│   └── ...
├── ui/                     ← shadcn/ui components
│   ├── card.tsx
│   ├── button.tsx
│   ├── badge.tsx
│   ├── tabs.tsx
│   ├── breadcrumbs.tsx
│   └── ... (15+ more)
├── seo/
│   └── JsonLd.tsx          ← Structured data
├── analytics/
│   └── GoogleAnalytics.tsx
└── monetization/
    ├── ProPopup.tsx
    └── EmailCapture.tsx

src/lib/                   ← Utility functions & logic
├── supabase/
│   ├── client.ts           ← Browser client
│   ├── server.ts           ← Server client
│   └── admin.ts
├── data/                   ← Data fetching
│   ├── google-sheets.ts    ← Parse picks
│   ├── supabase-picks.ts   ← Fetch from DB
│   ├── server-fetch.ts     ← Server-side fetching
│   └── espn-scores.ts      ← Sports scores & schedule
├── consensus/              ← Core business logic
│   ├── consensus-builder.ts ← Algorithm (281 NCAAB teams!)
│   ├── team-mappings.ts     ← Team aliases
│   ├── game-schedule.ts     ← ESPN filter
│   └── sports-normalize.ts
├── hooks/                  ← React hooks
│   ├── use-consensus.ts
│   └── use-picks.ts
├── utils/
│   ├── date.ts
│   ├── logger.ts
│   ├── odds.ts
│   └── utils.ts
└── daily-bets/
    └── daily-bets-builder.ts

src/types/                 ← TypeScript types
├── picks.ts
├── consensus.ts
├── blog.ts
└── ...

public/                    ← Static files (never change)
├── opengraph-image.png
├── robots.txt
├── sitemap.xml
└── ...

package.json               ← Dependencies
tsconfig.json              ← TypeScript config
tailwind.config.ts         ← Tailwind config
next.config.ts             ← Next.js config
.env.example               ← Secrets template
.env.local                 ← Your secrets (don't commit!)

CLAUDE.md                  ← Project instructions
SITE-STRUCTURE.md          ← Full documentation (this repo)
QUICK-START-NEW-PAGE.md    ← How to add pages (this repo)
```

---

## File Count Summary

| Category | Count | Example |
|----------|-------|---------|
| Route pages (`.tsx`) | 30+ | `/nfl-picks-today`, `/blog/[slug]` |
| API routes (`.ts`) | 10+ | `/api/consensus`, `/api/picks` |
| Components | 30+ | Header, PicksTable, CapperCard |
| Utilities | 20+ | consensus-builder, espn-scores, date utils |
| **Total App Files** | **~90** | — |

---

## Key Entry Points

### Browsing the Site
1. **Homepage** → `src/app/page.tsx`
2. **Header** → `src/components/layout/Header.tsx` (navigation)
3. **Consensus page** → `src/app/consensus/page.tsx` (server) + `ConsensusContent.tsx` (client)
4. **Blog list** → `src/app/blog/page.tsx`
5. **Blog post** → `src/app/blog/[slug]/page.tsx` (dynamic route)

### Data Flow
1. **API endpoint** → `src/app/api/consensus/route.ts`
2. **Consensus logic** → `src/lib/consensus/consensus-builder.ts`
3. **Data sources** → `src/lib/data/google-sheets.ts` + `supabase-picks.ts`
4. **Sports classification** → `src/lib/consensus/team-mappings.ts` (281 NCAAB teams!)

### Backend Services
1. **Supabase setup** → `src/lib/supabase/server.ts` + `client.ts`
2. **Environment vars** → `.env.local` (not in repo)
3. **Database schema** → `supabase/schema.sql`

---

## How Routes Map to Files

| What You Visit | File That Renders |
|----------------|-------------------|
| `/` | `src/app/page.tsx` |
| `/consensus` | `src/app/consensus/page.tsx` |
| `/consensus/nba` | `src/app/consensus/[sport]/page.tsx` with `sport=nba` |
| `/blog` | `src/app/blog/page.tsx` |
| `/blog/my-article-slug` | `src/app/blog/[slug]/page.tsx` with `slug=my-article-slug` |
| `/nfl-picks-today` | `src/app/nfl-picks-today/page.tsx` |
| `/cappers` | `src/app/cappers/page.tsx` |
| `/cappers/dave-price` | `src/app/cappers/[slug]/page.tsx` with `slug=dave-price` |
| `/api/consensus` | `src/app/api/consensus/route.ts` |
| `/api/picks?sport=NFL` | `src/app/api/picks/route.ts` |

---

## Adding a New Page

### Simple static page (2 minutes)
```bash
mkdir -p src/app/my-page
cat > src/app/my-page/page.tsx << 'EOF'
export default function Page() {
  return <h1>My Page</h1>;
}
EOF
```
**Result:** Route is now available at `/my-page`

### Dynamic page (like blog)
```bash
mkdir -p src/app/guides/\[slug\]
# Create src/app/guides/page.tsx (list)
# Create src/app/guides/[slug]/page.tsx (detail)
```
**Result:** `/guides` (list) and `/guides/anything` (detail)

### API endpoint
```bash
mkdir -p src/app/api/my-endpoint
cat > src/app/api/my-endpoint/route.ts << 'EOF'
export async function GET() {
  return Response.json({ data: [] });
}
EOF
```
**Result:** Endpoint at `GET /api/my-endpoint`

---

## Important Files for Maintenance

| File | What It Controls |
|------|------------------|
| `src/components/layout/Header.tsx` | Navigation menu + sports dropdown |
| `src/lib/consensus/team-mappings.ts` | Sport classification (281 NCAAB teams) |
| `src/lib/consensus/consensus-builder.ts` | Fire tag algorithm (3+ cappers) |
| `src/lib/data/espn-scores.ts` | Game schedule & grading |
| `.env.local` | Supabase credentials |
| `next.config.ts` | Build configuration |
| `tailwind.config.ts` | Design tokens (colors, spacing) |

---

## Deployment

All code in `src/app/` and `src/lib/` is deployed to **Vercel** when you push to `main` branch.

```bash
git push origin main
# → Vercel automatically builds & deploys
# → Check https://dailyaibetting.com in 30 seconds
```

---

## What's in `newpage/`?

The `newpage/` directory contains a specification file (`dailyaibets.txt`) for implementing a **Daily Best Bets page** with:
- Top 5 highest confidence picks
- Top 5 most mentioned bets
- Parlay recommendations
- Sport-specific picks
- MLB strikeout props

This is a **reference template** — not code. To implement:
1. Create `src/app/daily-best-bets/page.tsx`
2. Implement the scoring algorithm
3. Fetch picks via API
4. Render per the spec

---

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `hb_picks` | All picks (source of truth) |
| `blog_posts` | Blog articles |
| `hb_cappers` | Capper metadata |
| `hb_pick_type` | Pick type enum |
| `hb_consensus` | Pre-computed consensus (optional cache) |

Access via: `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts`

---

## Performance & Caching

- **Pages:** Server-rendered (SSR) with `force-dynamic` flag for real-time data
- **API routes:** `no-cache` headers (always fresh)
- **Images:** OG images generated on-demand (`opengraph-image.tsx`)
- **Database:** Supabase with RLS policies (row-level security)

---

## Version Info

- **Next.js:** 16.1.1
- **React:** 19.2.3
- **TypeScript:** 5
- **Tailwind:** 4
- **Node:** 18+ (required)
