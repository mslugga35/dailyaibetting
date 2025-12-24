# Research Notes - DailyAI Betting Rebuild

**Date**: December 23, 2024
**Project**: Rebuild dailyaibetting.com as directory-style AI consensus site

---

## 1. Current Site Analysis

### Original dailyaibetting.com
- **Style**: Terminal/hacker aesthetic with green text on black
- **Features**:
  - Capper tracking
  - Consensus intelligence
  - Google Apps Script backend
- **Problem**: Difficult to track cappers with so many picks daily

### User Requirements
- Only track **10 cappers** with max picks (not all picks)
- Use existing Google Doc (updated every 5 minutes) as primary data source
- Integrate with existing n8n workflow for scraping
- Follow existing consensus rules from ConsensusProject

---

## 2. Existing Infrastructure Discovered

### ConsensusProject
**Location**: `C:\Users\mpmmo\ConsensusProject\`

**Key Files**:
- `instructions/MASTER_CONSENSUS_RULES.txt` - Definitive consensus rules
- `scripts/consensus_builder.py` - Python consensus engine
- `RUN_CONSENSUS.bat` - Quick runner

**Rules Summary**:
1. **Date Filtering**: Only today's games
2. **One Vote Per Capper**: Each capper = 1 vote per unique bet
3. **Bet Types NEVER Combined**: ML, Spread, Totals are separate
4. **3+ Cappers = 🔥 Fire Tag**
5. **Team Standardization**: NYY → Yankees, etc.
6. **Parlay Legs**: Count individually

### n8n-unified-sports-picks
**Location**: `C:\Users\mpmmo\n8n-unified-sports-picks\`

**Workflow**: `IMPORT-ME-unified-sports-picks.json`

**Data Flow**:
```
Schedule (3 PM ET) → Fetch Pages → Parse HTML → Filter Today → Dedupe → Google Sheets
```

**Output Format** (Google Sheets columns):
- Site
- League
- Date
- Matchup
- Service (Capper name)
- Pick
- RunDate

**Google Sheet ID**: `1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI`
**Tabs**: BetFirm, BoydsBets, Dimers, Covers, SportsLine

### capperbetsautomation
**Location**: `C:\Users\mpmmo\capperbetsautomation\`

**Specification** (SPECIFICATION.md):
- Daily Free Picks Aggregator
- Sources: SportsLine, BetFirm, BoydsBets, SportsCapping, SportsMemo, BallparkPal, Reddit, Action Network
- 09:30 AM schedule, 3-minute runtime
- 95% reliability target
- SHA-256 hash deduplication
- Discord alerts for failures

**Key Entities**:
- NormalizedPick: sport, event, selection, odds, capper, source, timestamp, hash
- SourceConfiguration: URL, selectors, schedule, timeout, retry
- ScraperRun: timing, sources attempted/succeeded, picks found, errors

### Google Doc (Primary Data Source)
**ID**: `1QAUgTvFZq3PlA25vznkly8CHb4uNsIRYEZ0oXCitKxo`
**Update Frequency**: Every 5 minutes
**Access**: Requires authentication (401 on direct fetch)

### Other Related Projects

| Project | Location | Status |
|---------|----------|--------|
| ConsensusAutomation | `C:\Users\mpmmo\ConsensusAutomation\` | Python consensus analysis |
| SportsBettingAutomation | `C:\Users\mpmmo\SportsBettingAutomation\` | Web scrapers |
| n8n-workflows | `C:\Users\mpmmo\n8n-workflows\` | 2,057+ workflow templates |

---

## 3. Consensus Rules Deep Dive

### From MASTER_CONSENSUS_RULES.txt

#### Section 1: Date Filtering
```
INCLUDE ONLY:
✓ Picks explicitly for current date
✓ Games happening "today"

EXCLUDE IMMEDIATELY:
✗ Future dates ("tomorrow", "Tuesday")
✗ Past dates
✗ Off-season sports (NFL in June-August, etc.)
```

#### Section 2: Capper Identification
```
UNIQUE CAPPER RULES:
• Each name = 1 capper, 1 vote per bet maximum
• Name variations = same person (remove spaces/punctuation)

SPECIAL ENTITIES (count as single):
• "Dimers" = 1 entity
• "Consensus Leans" = 1 entity
• "Ballpark Pal" = 1 entity
• "Lightning Bolt" = 1 entity
```

#### Section 3: Bet Type Standardization
```
MONEYLINE (ML):
• "Team ML" = "Team -150" = "Team Moneyline"

SPREAD/RUNLINE:
• "Team -1.5" ≠ "Team ML" (completely different!)
• Must match exact spread number

TOTALS:
• "Over 12" ≠ "Over 11.5" (different lines!)
• Must match exact total

FIRST 5 INNINGS (F5):
• "Team F5 ML" ≠ "Team ML" (different bet types)
```

#### Section 4: Team Standardization
Full mappings in `consensus_builder.py`:
- MLB: 30 teams
- NBA: 30 teams
- NFL: 32 teams
- NHL: 32 teams
- WNBA: 12 teams

#### Section 6: Fire Tag Rules
```
AUTOMATIC APPLICATION:
• 3+ cappers on same exact bet = 🔥
• Check EVERY bet for qualification
• No manual override
```

#### Section 7: Output Format
```
1. TOP 5 OVERALL CONSENSUS
2. TOP 5 PARLAY COMBOS (2+ cappers identical)
3. TOP 3 PLAYER PROPS (2+ cappers)
4. TOP 3 BY SPORT
5. FADE THE PUBLIC (Optional - highest consensus)
```

#### Historical Patterns
- **10+ cappers agree**: Consider fade opportunity
- **7-9 cappers**: Strong consensus
- **3-6 cappers**: Moderate agreement
- **2 cappers**: Minimum for listing

---

## 4. Architecture Decisions

### Tech Stack Chosen
- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL) - optional, can use Google Sheets directly
- **Automation**: n8n Cloud (mslugga35.app.n8n.cloud)
- **AI**: OpenAI/Gemini for analysis (optional)

### Data Flow Design
```
┌─────────────────────────────────────────────────────────┐
│                    DATA SOURCES                          │
├─────────────────────────────────────────────────────────┤
│  Google Doc        │  Google Sheets    │  n8n Webhook   │
│  (5 min updates)   │  (n8n output)     │  (on-demand)   │
└────────┬───────────┴────────┬──────────┴───────┬────────┘
         │                    │                   │
         └────────────────────┼───────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │      API Routes (Next.js)     │
              │  /api/consensus  /api/picks   │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     Consensus Builder         │
              │  - Normalize picks            │
              │  - Standardize teams          │
              │  - Parse bet types            │
              │  - Count cappers              │
              │  - Apply 🔥 fire tags         │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │         Frontend              │
              │  - Consensus Dashboard        │
              │  - Capper Leaderboards        │
              │  - Picks Browser              │
              │  - Best Bets                  │
              │  - Trends                     │
              └───────────────────────────────┘
```

### URL Structure
```
/                     # Homepage with today's consensus
/consensus            # Full consensus picks list
/consensus/[sport]    # Sport-specific consensus
/picks                # All picks browser
/picks/[date]         # Historical picks
/cappers              # Capper leaderboard
/cappers/[slug]       # Individual capper profile
/best-bets            # AI-curated top picks
/trends               # Hot/cold trends
```

---

## 5. Cappers to Track (10 Max)

Based on existing systems:

1. **Dave Price** (BetFirm) - MLB, NFL specialist
2. **Jack Jones** (BetFirm) - MLB, NBA specialist
3. **Dimers** - Multi-sport AI picks
4. **Chris Vasile** (Covers) - NFL, NCAAF specialist
5. **Pure Lock** (BetFirm) - MLB specialist
6. **Matt Fargo** (BetFirm) - MLB, NFL
7. **Quinn Allen** (Covers) - NFL, NBA
8. **SportsLine** - Multi-sport
9. **Ballpark Pal** - MLB specialist (requires 2FA)
10. **Consensus Leans** - Aggregated consensus

---

## 6. Implementation Status

### Completed ✅
- [x] Next.js project setup
- [x] shadcn/ui components installed
- [x] Homepage with consensus dashboard
- [x] Consensus page
- [x] Cappers leaderboard page
- [x] Individual capper profile page
- [x] Picks browser page
- [x] Best bets page
- [x] Trends page
- [x] Team mappings (MLB, NBA, NFL, NHL, WNBA)
- [x] Consensus builder logic
- [x] Google Sheets data fetching
- [x] API routes (/api/consensus, /api/picks)
- [x] React hooks (useConsensus, usePicks)
- [x] Types matching data format

### Pending 📋
- [ ] Publish Google Sheets for public access
- [ ] Connect frontend to live API (currently using mock data)
- [ ] Set up environment variables
- [ ] Configure n8n webhook for real-time updates
- [ ] Add AI analysis integration (OpenAI/Gemini)
- [ ] Implement result tracking
- [ ] Add Discord notifications
- [ ] Performance tracking for cappers
- [ ] Mobile responsiveness testing
- [ ] Deploy to Vercel

---

## 7. Environment Setup Required

```bash
# Create .env.local from .env.example
cp .env.example .env.local

# Required variables:
GOOGLE_SHEET_ID=1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI
GOOGLE_DOC_ID=1QAUgTvFZq3PlA25vznkly8CHb4uNsIRYEZ0oXCitKxo

# Optional:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
N8N_WEBHOOK_URL=https://mslugga35.app.n8n.cloud/webhook/dailyaibetting
DISCORD_WEBHOOK_URL=
```

---

## 8. Google Sheets Setup

For the API to fetch data, the Google Sheet needs to be published:

1. Open Sheet: `https://docs.google.com/spreadsheets/d/1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI`
2. File → Share → Publish to web
3. Select "Entire Document" or specific tabs
4. Format: Web page (or CSV for direct access)
5. Click Publish

Alternative: Use Google Sheets API with service account credentials.

---

## 9. Future Enhancements

### Short-term
- Real-time updates via WebSocket/SSE
- Email notifications for consensus picks
- Mobile app (React Native or PWA)

### Medium-term
- Historical performance tracking
- ROI calculations
- Capper comparison tools
- Parlay builder

### Long-term
- AI model for pick analysis
- Odds comparison across sportsbooks
- Bankroll management tools
- Community features (user picks, leaderboards)

---

## 10. Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/consensus/team-mappings.ts` | Team name standardization |
| `src/lib/consensus/consensus-builder.ts` | Core consensus logic |
| `src/lib/data/google-sheets.ts` | Data fetching from Sheets/Doc |
| `src/lib/hooks/use-consensus.ts` | React hook for consensus |
| `src/lib/hooks/use-picks.ts` | React hook for picks |
| `src/app/api/consensus/route.ts` | Consensus API endpoint |
| `src/app/api/picks/route.ts` | Picks API endpoint |
| `src/types/index.ts` | TypeScript type definitions |
| `CLAUDE.md` | Project documentation |
| `.env.example` | Environment template |

---

*Last Updated: December 23, 2024*
