# DailyAI Betting

AI-powered sports betting consensus platform with real-time capper tracking.

## Project Overview

- **URL**: https://dailyaibetting.com
- **Type**: Directory-style sports betting analytics site
- **Tech Stack**: Next.js 14, Supabase, Tailwind CSS, shadcn/ui
- **Automation**: n8n Cloud (mslugga35.app.n8n.cloud)

## Key Features

1. **Daily AI Consensus** - Identifies picks where 3+ cappers agree (🔥 fire tag)
2. **Capper Leaderboards** - Track and rank 10 cappers by performance
3. **Historical Data** - Browse past picks with results
4. **Real-time Updates** - Data refreshes every 5 minutes from Google Sheets
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

## Data Flow

```
Google Doc ──────────────┐
                         ├──► Google Sheets ──► API Routes ──► Consensus Builder ──► Frontend
Local Scraper (PM2) ─────┘
        ↓
   ESPN Validation (filters stale picks)
```

### Primary Data Sources

1. **Google Doc** (ID: `<GOOGLE_DOC_ID - see .env.local>`)
   - Contains latest picks from multiple cappers

2. **Google Sheets** (ID: `<GOOGLE_SHEET_ID - see .env.local>`)
   - Populated by **local scraper** (replaced n8n to save executions)
   - Tabs: BetFirm, BoydsBets, Dimers, Covers, SportsLine, AllPicks
   - Columns: Site, League, Date, Matchup, Service, Pick, RunDate

3. **Local Scraper** (`C:\Users\mpmmo\dailyai-picks-local\`)
   - Node.js script running via PM2
   - Scrapes BetFirm + Google Doc
   - **ESPN Validation**: Filters out stale picks (teams not playing today)
   - Start: `pm2 start ecosystem.config.js`

## Related Projects

| Project | Location | Purpose |
|---------|----------|---------|
| **dailyai-picks-local** | `C:\Users\mpmmo\dailyai-picks-local\` | **LOCAL SCRAPER** - replaces n8n |
| ConsensusProject | `C:\Users\mpmmo\ConsensusProject\` | Python consensus builder + rules |
| n8n-unified-sports-picks | `C:\Users\mpmmo\n8n-unified-sports-picks\` | OLD n8n workflow (deprecated) |
| capperbetsautomation | `C:\Users\mpmmo\capperbetsautomation\` | Picks aggregator specification |
| ConsensusAutomation | `C:\Users\mpmmo\ConsensusAutomation\` | Python consensus analysis |
| SportsBettingAutomation | `C:\Users\mpmmo\SportsBettingAutomation\` | Web scrapers |

## n8n Automation

- **Instance**: https://mslugga35.app.n8n.cloud
- **Workflow**: Unified Sports Picks Scraper
- **Schedule**: Daily at 3 PM ET
- **Output**: Google Sheets with picks

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
# Required
GOOGLE_SHEET_ID=<GOOGLE_SHEET_ID - see .env.local>
GOOGLE_DOC_ID=<GOOGLE_DOC_ID - see .env.local>

# Optional
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
N8N_WEBHOOK_URL=<N8N_WEBHOOK_URL - see .env.local>
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

10 cappers with max picks (not all picks):
1. Dave Price (BetFirm)
2. Jack Jones (BetFirm)
3. Dimers
4. Chris Vasile (Covers)
5. Pure Lock (BetFirm)
6. Matt Fargo (BetFirm)
7. Quinn Allen (Covers)
8. SportsLine
9. Ballpark Pal
10. Consensus Leans

## Design System

- **Primary**: Emerald green (wins, positive, 🔥 fire picks)
- **Destructive**: Red (losses, negative)
- **Accent**: Blue (neutral, info)
- **Dark Mode**: Default enabled
