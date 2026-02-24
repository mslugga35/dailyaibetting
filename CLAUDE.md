# DailyAI Betting

AI-powered sports betting consensus platform with real-time capper tracking.

## Project Overview

- **URL**: https://dailyaibetting.com
- **Type**: Directory-style sports betting analytics site
- **Tech Stack**: Next.js 14, Supabase, Tailwind CSS, shadcn/ui
- **Automation**: Local PM2 scraper (`dailyai-picks-local`)

## Key Features

1. **Daily AI Consensus** - Identifies picks where 3+ cappers agree (🔥 fire tag)
2. **Capper Leaderboards** - Track and rank cappers by performance
3. **Historical Data** - Browse past picks with results
4. **Real-time Updates** - Data fetched from Supabase `hb_picks` (single source of truth)
5. **AI Analysis** - GPT-powered insights and trend detection

## Consensus Rules (from MASTER_CONSENSUS_RULES)

Based on `C:\Users\mpmmo\ConsensusProject\instructions\MASTER_CONSENSUS_RULES.txt`:

- **3+ cappers** = 🔥 fire tag (strong consensus)
- **7-9 cappers** = Very strong consensus
- **10+ cappers** = Consider fade opportunity (public bet)
- **Bet types NEVER combined**: ML, Spread, Totals are separate
- **One vote per capper per unique bet**
- **Parlay legs counted individually**
- **Team names standardized** (NYY → Yankees)

## Project Structure

```
dailyaibetting/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Homepage with consensus dashboard
│   │   ├── consensus/         # Consensus picks pages
│   │   ├── picks/             # All picks browser
│   │   ├── cappers/           # Capper profiles
│   │   ├── best-bets/         # AI-curated best bets
│   │   ├── trends/            # Trends & insights
│   │   └── api/               # API routes
│   │       ├── consensus/     # GET /api/consensus
│   │       └── picks/         # GET /api/picks
│   ├── components/
│   │   ├── layout/            # Header, Footer
│   │   ├── picks/             # ConsensusCard, StatsOverview
│   │   ├── cappers/           # CapperLeaderboard
│   │   └── ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/          # Supabase client/server
│   │   ├── consensus/         # Consensus builder logic
│   │   │   ├── consensus-builder.ts
│   │   │   └── team-mappings.ts
│   │   ├── data/              # Data fetching
│   │   │   └── google-sheets.ts
│   │   └── hooks/             # React hooks
│   │       ├── use-consensus.ts
│   │       └── use-picks.ts
│   └── types/                 # TypeScript types
├── supabase/
│   └── schema.sql             # Database schema
└── public/                    # Static assets
```

## Data Flow (updated 2026-02-20)

```
Discord cappers ──► bot ──► parse-worker ──► hb_picks (source='discord')
BetFirm ──────┐
BoydsBets ─────┤──► ESPN Validation ──► hb_picks (source='scrape')
SportsMemo ────┤
Covers ────────┘
                                            │
                                            ▼
                              Website API Routes ──► Consensus Builder ──► Frontend
```

**Single Source of Truth: Supabase `hb_picks`** (migrated 2026-02-20)

Google Sheets pipeline was retired. All data reads and writes go through Supabase.

### Data Sources (all write to hb_picks)

1. **Discord Cappers** (source='discord')
   - HiddenBag Discord → bot → parse-worker → hb_picks
   - Dynamic list (whoever posts picks in Discord)

2. **Website Scrapers** (source='scrape')
   - BetFirm, BoydsBets, SportsMemo, Covers
   - `dailyai-picks-local/index.js` runs via PM2 every 30 min
   - ESPN validation filters out teams not playing today
   - Writes directly to hb_picks (no Sheets intermediary)

### Website Data Reading
- `src/lib/data/supabase-picks.ts` — fetches from hb_picks, converts to RawPick
- `src/lib/data/google-sheets.ts` — splits parlays, fixes sport misclassification (no longer reads Sheets despite filename)

## Related Projects

| Project | Location | Purpose |
|---------|----------|---------|
| **dailyai-picks-local** | `C:\Users\mpmmo\dailyai-picks-local\` | **LOCAL SCRAPER** - replaces n8n |
| ConsensusProject | `C:\Users\mpmmo\ConsensusProject\` | Python consensus builder + rules |
| n8n-unified-sports-picks | `C:\Users\mpmmo\n8n-unified-sports-picks\` | OLD n8n workflow (deprecated) |
| capperbetsautomation | `C:\Users\mpmmo\capperbetsautomation\` | Picks aggregator specification |
| ConsensusAutomation | `C:\Users\mpmmo\ConsensusAutomation\` | Python consensus analysis |
| SportsBettingAutomation | `C:\Users\mpmmo\SportsBettingAutomation\` | Web scrapers |

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
# Required
GOOGLE_SHEET_ID=<GOOGLE_SHEET_ID - see .env.local>

# Optional
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

## API Endpoints

### GET /api/consensus
Returns consensus picks with fire tags.

Query params:
- `sport` - Filter by sport (MLB, NFL, NBA, etc.)
- `minCappers` - Minimum capper count (default: 2)

### GET /api/picks
Returns all normalized picks.

Query params:
- `sport` - Filter by sport
- `capper` - Filter by capper name
- `date` - Filter by date (YYYY-MM-DD)
- `limit` - Results per page (default: 100)
- `offset` - Pagination offset

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Cappers Tracked

Cappers are **dynamic** — not a fixed list. Sources:
- **Discord DB**: Whatever HB cappers post picks (names from `hb_cappers` table)
- **BetFirm**: Expert names scraped from site (Dave Price, Jack Jones, Pure Lock, Matt Fargo, etc.)
- **BoydsBets**: Capper names or "BoydsBets" fallback
- **SportsMemo**: Expert names scraped from site
- **Covers** (optional): Expert names (Chris Vasile, Quinn Allen, etc.)

## Consensus System Overhaul (2026-02-21)

6-phase fix deployed. All commits pushed, Vercel live, PM2 restarted.

### What Changed

| Phase | What | File | Commit |
|-------|------|------|--------|
| 1 | Exact line matching (no rounding) | `consensus-builder.ts` | `91bb11e` |
| 2 | 281 NCAAB teams (was 68) | `team-mappings.ts` | `91bb11e` |
| 3 | Strict `identifySport()` (3-pass) | `team-mappings.ts` | `91bb11e` |
| 4a | `default_sport` column on channels | `20260220_channel_default_sport.sql` | `90b9641` |
| 4b | Parse-worker sport fallback | `parse-worker.mjs` | `90b9641` |
| 5 | Sport override for misclassified picks | `supabase-picks.ts` | `91bb11e` |
| cleanup | Stale comments, Memphis alias conflict | both | `9481ff5` |

### Key Design Decisions

- **`normalizeSpreadLine()`** replaces old `roundSpreadLineForGrouping()` — consistent `+/-` prefix only, NO rounding
- **`identifySport()` 3-pass matching:** (1) exact, (2) prefix match (4+ chars), (3) word match (skip generic mascots)
- **GENERIC_MASCOTS skip list:** tigers, eagles, bears, wildcats, bulldogs, panthers, cardinals, lions, hawks, rams, warriors, rockets, rebels, pirates, cougars, huskies, knights, falcons
- **Sport override (Phase 5):** `MISCLASSIFIABLE_SPORTS` = OTHER, TENNIS, MMA, GOLF, BOXING, SOCCER → auto-corrected to real team sport at display time
- **Memphis conflict:** bare 'Memphis' removed from NCAAB aliases (conflicts with NBA Grizzlies), kept 'Memphis Tigers' only

### DB Cleanup Applied (2026-02-21)
- 134 dirty team name rows cleaned (e.g., "Lakers -6½ -110 at PlayMGM" → "Lakers")
- 14 sport misclassifications fixed (NCAAB picks stored as OTHER/tennis/mlb)
- `hb_pick_type` enum: valid values are `spread`, `moneyline`, `over`, `under`, `prop` (NOT 'ml')

### Known Cross-Sport Alias Conflicts (pre-existing, not from this work)
- City abbreviations (ATL, CLE, HOU, MIN) exist in multiple pro sports
- `identifySport()` returns first match in object iteration order (MLB > NBA > NFL > NCAAB)
- Mitigated by DB sport column + Phase 5 override

### Scraper Fix (dailyai-picks-local)
- `cleanPick` pipeline in `parsePickFields()` now strips sportsbook names, ½→.5, trailing odds
- Commit: `e5efd26` in `dailyai-picks-local`

## Design System

- **Primary**: Emerald green (wins, positive, 🔥 fire picks)
- **Destructive**: Red (losses, negative)
- **Accent**: Blue (neutral, info)
- **Dark Mode**: Default enabled
