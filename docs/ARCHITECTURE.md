# Daily AI Betting - Architecture Guide

## Overview
Daily AI Betting aggregates sports picks from multiple capper sources, builds consensus analysis, and presents insights to users.

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── consensus/     # Main consensus endpoint
│   │   ├── daily-bets/    # Daily picks endpoint
│   │   └── picks/         # Individual picks endpoint
│   └── [sport]-picks-today/ # Sport-specific pages
├── components/            # React components
│   ├── layout/           # Header, footer, navigation
│   ├── picks/            # Pick cards, consensus displays
│   └── monetization/     # Email capture, ads
├── lib/                  # Core business logic
│   ├── consensus/        # Consensus building engine
│   ├── data/            # Data fetching (Google Sheets)
│   ├── hooks/           # React hooks
│   ├── supabase/        # Database client
│   └── utils/           # Shared utilities
└── types/               # TypeScript type definitions
```

## Data Flow

```
Google Sheet (n8n populated) → google-sheets.ts → consensus-builder.ts → API → Frontend
        ↓
  Google Doc (OCR picks)
```

## Key Modules

### `/lib/consensus/consensus-builder.ts`
Main consensus logic:
- `normalizePicks()` - Standardizes raw picks
- `buildConsensus()` - Groups picks, counts cappers
- `formatConsensusOutput()` - Structures output
- `buildInsights()` - Generates fire tiers, stacks, alerts

### `/lib/consensus/game-schedule.ts`
ESPN API integration for schedule validation:
- Caches game data (30 min TTL)
- Filters picks to only teams playing today
- Handles sport-specific validation

### `/lib/consensus/team-mappings.ts`
Team name standardization:
- Maps variations (NYY, Yankees, Bronx Bombers → Yankees)
- Supports MLB, NBA, NFL, NHL, NCAAF, NCAAB, WNBA

### `/lib/data/google-sheets.ts`
Data fetching from Google ecosystem:
- Fetches from 10 sheet tabs (Picks, AllPicks, SportsLine, etc.)
- Parses Google Doc (OCR-processed images)
- Filters to today's picks only

### `/lib/utils/`
Shared utilities:
- `date.ts` - Eastern timezone date handling
- `logger.ts` - Environment-aware logging

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Sheets
GOOGLE_SHEET_ID=
GOOGLE_DOC_ID=

# Site
NEXT_PUBLIC_SITE_URL=

# Optional
LOG_LEVEL=debug|info|warn|error
```

## Logging

Uses centralized logger (`@/lib/utils/logger`):
- `debug` - Development only (hidden in production)
- `info` - General information
- `warn` - Potential issues
- `error` - Always logged

Set `LOG_LEVEL` env var to control output.

## API Endpoints

### GET /api/consensus
Returns consensus picks with insights.

Query params:
- `sport` - Filter by sport (NBA, NFL, etc.)
- `minCappers` - Minimum capper count (default: 2)

### GET /api/daily-bets
Returns curated daily bet recommendations.

### GET /api/picks
Returns all normalized picks.

## Data Sources

| Tab | Source | Description |
|-----|--------|-------------|
| Picks | TG-FreeCapper | Telegram free cappers pipeline |
| AllPicks | Consolidated | All sources merged |
| BoydBets | BoydsBets.com | Premium picks |
| SportsLine | SportsLine.com | Expert analysis |
| Pickswise | Pickswise.com | Free expert picks |
| Dimers | Dimers.com | AI model picks |
| Covers | Covers.com | Expert consensus |
| WagerTalk | WagerTalk.com | Professional handicappers |
| SportsMemo | SportsMemo.com | Sports betting experts |
| SportsCapping | SportsCapping.com | Capper aggregation |

## Maintenance

### Build
```bash
npm run build
```

### Dev Server
```bash
npm run dev
```

### Type Check
```bash
npx tsc --noEmit
```
