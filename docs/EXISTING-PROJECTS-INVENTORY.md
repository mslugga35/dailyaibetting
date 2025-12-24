# Existing Projects Inventory

**Complete list of all betting/consensus-related projects discovered**

---

## 1. ConsensusProject
**Location**: `C:\Users\mpmmo\ConsensusProject\`
**Status**: Active, Production-ready
**Purpose**: Python-based consensus builder with comprehensive rules

### Files:
```
ConsensusProject/
├── instructions/
│   └── MASTER_CONSENSUS_RULES.txt    # 200+ lines of rules
├── scripts/
│   ├── consensus_builder.py          # Main consensus engine
│   ├── consensus_builder_v2.py       # Version 2
│   ├── consensus_builder_final.py    # Final version
│   ├── consensus_colab_version.py    # Google Colab version
│   ├── data_fetcher.py               # Data fetching utility
│   └── fade_public_builder.py        # Fade the public logic
├── input_files/                      # Put capper files here
├── daily_output/                     # Results appear here
├── notes/
│   └── PROJECT_OVERVIEW.md
├── README.md
├── RUN_CONSENSUS.bat                 # Quick runner
└── QUICK_START.txt
```

### Key Features:
- Team name standardization (MLB, NBA, NFL, NHL, WNBA)
- Bet type parsing (ML, Spread, Totals, F5, Props)
- 🔥 Fire tags for 3+ capper consensus
- One vote per capper per unique bet
- Parlay leg counting
- Fade the public (70%+ threshold)

### Output Format:
1. TOP 5 OVERALL CONSENSUS
2. TOP 5 PARLAY COMBOS
3. TOP 3 PLAYER PROPS
4. TOP 3 BY SPORT
5. FADE THE PUBLIC

---

## 2. n8n-unified-sports-picks
**Location**: `C:\Users\mpmmo\n8n-unified-sports-picks\`
**Status**: Active, Ready to import
**Purpose**: n8n workflow for automated scraping to Google Sheets

### Files:
```
n8n-unified-sports-picks/
├── IMPORT-ME-unified-sports-picks.json    # Main workflow
├── READY-TO-IMPORT-WITH-COOKIES.json      # With authentication
├── code/
│   ├── n8n-unified-workflow-code.js       # HTML parser
│   ├── n8n-today-filter-code.js           # Today's games only
│   ├── n8n-dedupe-code.js                 # Deduplication
│   ├── n8n-pagination-support.js          # Multi-page support
│   ├── n8n-router-parser-code.js          # Route by site
│   ├── n8n-COMPLETE-WORKING-PARSER.js     # Complete parser
│   ├── n8n-FIXED-PARSER-V2.js
│   └── n8n-AUTO-DETECT-PARSER.js
├── config/
│   ├── SITE-LIST-CONFIGURATION.txt
│   ├── SITE-PARSER-CONFIG.json
│   ├── COMPLETE-SITE-LIST-COPY-PASTE.json
│   ├── AUTHENTICATION-SETUP.md
│   ├── DIMERS-COOKIE-STRING.txt
│   └── STEP-BY-STEP-ADD-COOKIES.md
├── documentation/
│   ├── QUICK-IMPORT-GUIDE.md
│   ├── UNIFIED-SPORTS-PICKS-SETUP.md
│   ├── N8N-LEARNING-GUIDE.md
│   ├── README-N8N-UNIFIED-WORKFLOW.md
│   ├── UNIFIED-WORKFLOW-SUMMARY.md
│   ├── WORKFLOW-ANALYSIS-RECOMMENDATIONS.md
│   ├── N8N-WORKFLOWS-SETUP-COMPLETE.md
│   └── N8N-WORKFLOW-BROWSER-GUIDE.md
├── backups/
│   └── n8n-workflows-backup/
├── PHASE-1-IMPLEMENTATION.md
├── SOLUTION-FOR-DIFFICULT-SITES.md
├── SOLUTION-COOKIE-AUTHENTICATION.md
├── COMPLETE-IMPLEMENTATION-GUIDE.md
├── AUTOMATED-SETUP-GUIDE.md
└── README.md
```

### Workflow Output (Google Sheets):
| Column | Description |
|--------|-------------|
| Site | Source website |
| League | MLB, NFL, NBA, etc. |
| Date | Game date |
| Matchup | Team vs Team |
| Service | Capper name |
| Pick | The actual pick |
| RunDate | When scraped |

### Google Sheet ID:
`1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI`

### Sheet Tabs:
- BetFirm
- BoydsBets
- Dimers
- Covers
- SportsLine

---

## 3. capperbetsautomation
**Location**: `C:\Users\mpmmo\capperbetsautomation\`
**Status**: Planned, Detailed specification
**Purpose**: Full picks aggregator with API and dashboard

### Files:
```
capperbetsautomation/
├── SPECIFICATION.md    # Detailed feature spec
├── PLAN.md            # Implementation plan
└── specs/
    └── 001-picks-aggregator/
```

### Specification Highlights:

**Sources (7-8 total):**
- SportsLine
- BetFirm
- BoydsBets
- SportsCapping
- SportsMemo
- BallparkPal (requires 2FA)
- Reddit Sportsbook
- Action Network

**Architecture (Planned):**
```
backend/
├── src/
│   ├── models/       # NormalizedPick, SourceStatus
│   ├── scrapers/     # One per source
│   ├── normalize/    # Teams, markets, dedupe
│   ├── api/          # FastAPI endpoints
│   ├── worker/       # Celery scheduling
│   └── notifications/ # Discord alerts
└── tests/

web/
├── templates/        # Jinja2
├── static/
└── app.py
```

**API Endpoints (Planned):**
```
GET  /api/v1/picks          # Get picks with filters
GET  /api/v1/sources        # Source health status
POST /api/v1/runs           # Trigger manual run
GET  /api/v1/runs/{id}      # Run status
POST /api/v1/sources/{name}/auth  # Submit 2FA
GET  /api/v1/stats          # Aggregated statistics
GET  /api/v1/export         # CSV/JSON export
```

**SLOs:**
- Total runtime < 3 minutes
- Success rate ≥ 95%
- Duplicate rate ≤ 2%
- Dashboard availability 99.9%

---

## 4. ConsensusAutomation
**Location**: `C:\Users\mpmmo\ConsensusAutomation\`
**Status**: In progress
**Purpose**: Python consensus with database and API

### Files:
```
ConsensusAutomation/
├── src/
│   ├── models/
│   │   ├── pick.py
│   │   └── run.py
│   ├── scrapers/
│   │   └── base.py
│   ├── normalization/
│   │   ├── teams.py
│   │   └── markets.py
│   ├── api/
│   │   └── routes/
│   └── monitoring/
├── data/
│   └── canonical/
│       ├── teams.json
│       └── markets.json
├── tests/
│   └── test_scrapers/
├── alembic/                  # DB migrations
│   └── versions/
│       └── 001_initial_schema.py
├── scripts/
│   └── seed_data.py
├── CONSTITUTION.md
├── SPECIFICATION.md
├── ARCHITECTURE.md
├── PROGRESS.md
├── IMPLEMENTATION_SUMMARY.md
├── requirements-dev.txt
├── alembic.ini
└── .env.example
```

### Database Schema (SQLite → PostgreSQL):
```sql
CREATE TABLE sources (id, name, url, config, last_success, failure_count)
CREATE TABLE picks (id, source_id, hash_key UNIQUE, sport, event, market)
CREATE TABLE runs (id, started_at, completed_at, sources_attempted)
CREATE TABLE team_aliases (canonical_name, alias, sport)
```

---

## 5. SportsBettingAutomation
**Location**: `C:\Users\mpmmo\SportsBettingAutomation\`
**Status**: Large collection, various states
**Purpose**: Scrapers, collectors, and automation scripts

### Major Subdirectories:

#### AutoCollector/freepicks/
```
apps/
├── crawler/crawl.py
├── parser/parse.py
├── normalizer/normalize.py
├── deduper/dedupe.py
├── enricher/enrich.py
├── exporter/export.py
└── monitor/monitor.py
ops/
├── run_all.py
└── login_sportsline.py
```

#### ConsensusBuilder/
```
scripts/
├── consensus_builder.py
├── consensus_builder_v2.py
├── consensus_builder_final.py
├── consensus_colab_version.py
├── data_fetcher.py
└── fade_public_builder.py
```

#### AutomatedPickCollector/
```
automated_daily_picks.py
master_collector.py
enhanced_collector.py
exact_collector.py
fully_automated_collector.py
ballpark_pdf_collector.py
dimers_*.py (multiple versions)
sportsline_helper.py
daily_scheduler.py
```

#### Integration/
```
auto_pipeline.py
daily_scheduler.py
```

### Individual Scrapers:
| File | Purpose |
|------|---------|
| `AI_PICK_EXTRACTOR.py` | AI-powered pick extraction |
| `ALL_SPORTS_SMART_SCRAPER.py` | Multi-sport smart scraper |
| `GRAB_EVERYTHING_SCRAPER.py` | Comprehensive scraper |
| `EXACT_URL_SCRAPER.py` | URL-specific scraper |
| `DIMERS_TODAY_SCRAPER.py` | Dimers daily scraper |
| `BETFIRM_FULL_SCRAPER.py` | BetFirm complete scraper |
| `CTRL_A_SCRAPER.py` | Select-all text scraper |
| `scraper_dimers.py` | Dimers module |
| `scraper_betfirm.py` | BetFirm module |
| `scraper_covers.py` | Covers module |
| `brightdata_*.py` | BrightData proxy scrapers |
| `enhanced_scrapers.py` | Enhanced scraping logic |
| `production_scraper.py` | Production-ready scraper |

### Test Files:
- `test_public_sites.py`
- `test_public_sites_fixed.py`
- `test_individual_sites.py`
- `test_automation_system.py`
- `test_quick_scraper.py`
- `test_sportsline_login.py`

### Dashboard:
- `picks_dashboard.py`

---

## 6. Google Doc (Primary Data Source)
**Document ID**: `1QAUgTvFZq3PlA25vznkly8CHb4uNsIRYEZ0oXCitKxo`
**URL**: `https://docs.google.com/document/d/1QAUgTvFZq3PlA25vznkly8CHb4uNsIRYEZ0oXCitKxo/edit`
**Update Frequency**: Every 5 minutes
**Access**: Requires authentication

### Purpose:
- Primary source of daily picks
- Updated frequently throughout the day
- Contains picks from multiple cappers

---

## 7. Google Sheets (n8n Output)
**Sheet ID**: `1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI`

### Tabs:
- BetFirm
- BoydsBets
- Dimers
- Covers
- SportsLine

### Columns:
- Site
- League
- Date
- Matchup
- Service (Capper)
- Pick
- RunDate

---

## 8. n8n Cloud Instance
**URL**: `https://mslugga35.app.n8n.cloud`
**Purpose**: Workflow automation
**Workflows**: Unified Sports Picks Scraper

---

## 9. Consensus Files Location
**Path**: `C:\Users\mpmmo\OneDrive\Documents\consensusfiles`
**Purpose**: Input files for ConsensusProject
**Output**: Daily consensus files

---

## Summary Table

| Project | Language | Status | Primary Use |
|---------|----------|--------|-------------|
| ConsensusProject | Python | Production | Consensus building |
| n8n-unified-sports-picks | n8n/JS | Ready | Automated scraping |
| capperbetsautomation | Python | Planned | Full aggregator |
| ConsensusAutomation | Python | In progress | API + DB consensus |
| SportsBettingAutomation | Python | Various | Scrapers collection |
| Google Doc | - | Active | Primary data source |
| Google Sheets | - | Active | n8n output storage |
| n8n Cloud | - | Active | Workflow automation |

---

## Cappers Already Tracked

Based on existing systems, these cappers appear most frequently:

1. **BetFirm Cappers**:
   - Dave Price
   - Jack Jones
   - Pure Lock
   - Matt Fargo

2. **Covers Cappers**:
   - Chris Vasile
   - Quinn Allen
   - Neil Parker

3. **Other Sources**:
   - Dimers (AI picks)
   - SportsLine
   - Ballpark Pal
   - Consensus Leans
   - Lightning Bolt

---

## What Can Be Reused

### Directly Usable:
1. Team mappings from `consensus_builder.py`
2. n8n workflow JSON (`IMPORT-ME-unified-sports-picks.json`)
3. MASTER_CONSENSUS_RULES.txt
4. Google Sheets as data source
5. Canonical data (`teams.json`, `markets.json`)

### Needs Adaptation:
1. Python scrapers → TypeScript for Next.js
2. Python consensus builder → TypeScript for Next.js
3. Celery scheduling → n8n/Vercel cron

### Already Integrated in New Website:
1. ✅ Team mappings (TypeScript port)
2. ✅ Consensus rules (TypeScript implementation)
3. ✅ Google Sheets fetching
4. ✅ API routes

---

*Last Updated: December 23, 2024*
