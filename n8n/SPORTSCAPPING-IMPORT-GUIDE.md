# SportsCapping.com Scraper - Import & Setup Guide

## Overview

This workflow scrapes free picks from **sportscapping.com** and saves them to your Google Sheets. It extracts:
- Handicapper names (Sal Michaels, Black Widow, Joe Duffy, etc.)
- Sport/league (NBA, NFL, NCAA-B, NHL, MLB)
- Matchups (Oakland vs Wright State)
- Picks with odds (Oakland +3 -110 at Ace, OVER 176 -115)
- Game dates and times
- Analysis text

## Files Created

```
n8n/
├── sportscapping-scraper.json           ← Main workflow (import this to n8n)
├── test-sportscapping-parser-v2.js      ← Local testing script
├── debug-html-structure.js              ← HTML structure analyzer
└── SPORTSCAPPING-IMPORT-GUIDE.md        ← This file
```

## Quick Start

### 1. Import to n8n

1. Log in to your n8n instance: https://mslugga35.app.n8n.cloud
2. Click **"Workflows"** in the left sidebar
3. Click **"Import from File"** (or click "+" → "Import from File")
4. Select `sportscapping-scraper.json`
5. Click **"Import"**

### 2. Configure Google Sheets

**Option A: Create New Sheet Tab**
1. Open your Google Sheet: `1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI`
2. Create a new tab called **"SportsCapping"**
3. Add headers in row 1: `Site | League | Date | Matchup | Service | Pick | RunDate`

**Option B: Use Existing AllPicks Tab**
1. In the workflow, find the **"Save to Google Sheets"** node
2. Change `sheetName` from `"SportsCapping"` to `"AllPicks"`

### 3. Add Google Sheets Credentials

1. In the workflow, click the **"Save to Google Sheets"** node
2. Click on the **Credential** dropdown
3. Select your existing Google Sheets OAuth2 credential
4. If you don't have one:
   - Click **"Create New Credential"**
   - Select **"Google Sheets OAuth2 API"**
   - Follow the authentication flow
   - Make sure to grant access to Google Sheets

### 4. Activate the Workflow

1. Click the **"Inactive"** toggle at the top → Change to **"Active"**
2. The workflow will now run automatically **3x daily** at:
   - 8:00 AM
   - 2:00 PM
   - 8:00 PM

### 5. Test It Now (Manual Trigger)

1. Click the **"Manual Trigger"** node
2. Click **"Execute Workflow"** button at the bottom
3. Watch the execution flow (should take 5-10 seconds)
4. Check your Google Sheet for new picks!

## Expected Results

### First Page (25 picks typical)
- **Handicappers**: ~15-25 different experts per run
- **Sports**: NBA, NCAA-B, NFL, NHL, MLB
- **Picks**: Spreads, totals, moneylines with odds
- **Data Quality**: Clean, structured, ready for consensus analysis

### Sample Output
```
Site: SportsCapping
League: NCAA-B
Date: Dec 29, 2025
Matchup: Oakland vs Wright State
Service: Sal Michaels
Pick: Oakland +3 -110 at Ace
RunDate: 2025-12-29
```

## Pagination

The workflow currently scrapes **2 pages** (50 picks total). To add more pages:

1. Click the **"SportsCapping Pages"** node
2. Find the `jsonOutput` parameter
3. Add more page objects:
```json
{
  "pages": [
    {"url": "https://www.sportscapping.com/free-picks.html", "pageNum": 1},
    {"url": "https://www.sportscapping.com/free-picks.html?limitstart=25", "pageNum": 2},
    {"url": "https://www.sportscapping.com/free-picks.html?limitstart=50", "pageNum": 3}
  ]
}
```

## Troubleshooting

### ❌ No Picks Found

**Symptoms**: Workflow runs but 0 picks extracted

**Fix**:
1. Run the test script locally:
   ```bash
   cd C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/n8n
   node test-sportscapping-parser-v2.js
   ```
2. If local test works but n8n doesn't:
   - Check if site structure changed
   - Verify HTTP Request node timeout (should be 30000ms)
   - Check if site is blocking n8n's IP

### ❌ Google Sheets Error

**Symptoms**: "Invalid credentials" or "Permission denied"

**Fix**:
1. Re-authenticate Google Sheets credential
2. Make sure the Sheet ID is correct: `1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI`
3. Verify the tab name matches exactly (case-sensitive)
4. Check that your Google account has edit access

### ❌ Parser Extracting Wrong Data

**Symptoms**: Picks show UI elements instead of actual picks

**Fix**:
1. Run the HTML structure debugger:
   ```bash
   node debug-html-structure.js
   ```
2. Open `sportscapping-full.html` and search for a handicapper name
3. If the HTML structure changed, update the regex patterns in the Code node
4. Key patterns to check:
   - Container: `<div class="free-pick-col">`
   - Handicapper: `<h3>NAME</h3>`
   - Pick: `<div class="alert alert-success free-pick-green">...<b>PICK</b>`

### ❌ Duplicate Picks

**Symptoms**: Same pick appears multiple times

**Fix**:
- The workflow has built-in deduplication (Service + League + Pick)
- If duplicates persist, check the **Deduplicate** node
- Verify you're not running multiple workflows scraping the same site

## Testing Locally (Before n8n)

Always test the parser locally before deploying to n8n:

```bash
cd C:/Users/mpmmo/DirectoryWebsites/Sites/dailyaibetting/n8n

# Test the parser
node test-sportscapping-parser-v2.js

# Debug HTML structure
node debug-html-structure.js
```

The test script will:
- Fetch the live page
- Extract picks
- Show sample results
- Save full output to `sportscapping-picks-v2.json`
- Display statistics by handicapper and sport

## Workflow Architecture

```
┌─────────────────┐
│  Trigger Nodes  │
│  (Schedule or   │
│   Manual)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SportsCapping  │
│  Pages Config   │ (Page 1 & 2 URLs)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Split Pages   │ (Loop each page)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Fetch Page    │ (HTTP Request)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse Picks    │ (Custom JS Code)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Aggregate     │ (Combine all pages)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Deduplicate   │ (Remove duplicates)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Has Picks?    │ (Validation)
└────┬────────┬───┘
     │ Yes    │ No
     ▼        ▼
┌─────────┐ ┌──────────┐
│  Save   │ │  Alert   │
│ to      │ │  Parser  │
│ Sheets  │ │  Failed  │
└─────────┘ └──────────┘
```

## Schedule Recommendations

**Current**: 3x daily (8am, 2pm, 8pm)

**For more picks**: 4-6x daily
**For less API usage**: 1-2x daily
**Event-based**: Before big games (manually trigger)

To change schedule:
1. Click **"3x Daily Schedule"** node
2. Modify `triggerAtHour` array
3. Example for every 6 hours:
```json
{
  "interval": [
    {"triggerAtHour": 0},
    {"triggerAtHour": 6},
    {"triggerAtHour": 12},
    {"triggerAtHour": 18}
  ]
}
```

## Integration with DailyAI Betting

This scraper outputs the same format as your other scrapers:

```
Site | League | Date | Matchup | Service | Pick | RunDate
```

It integrates seamlessly with:
- Your consensus builder (`lib/consensus/consensus-builder.ts`)
- Google Doc data source (ID: `1QAUgTvFZq3PlA25vznkly8CHb4uNsIRYEZ0oXCitKxo`)
- API endpoints (`/api/consensus`, `/api/picks`)
- Frontend components (ConsensusCard, CapperLeaderboard)

## Adding More Sports Betting Sites

To scrape more sites (wagertalk.com, sportsmemo.com, etc.), follow this pattern:

1. **Analyze the site**:
   ```bash
   # Copy the debug script
   cp debug-html-structure.js debug-SITENAME.js
   # Modify URL and run
   node debug-SITENAME.js
   ```

2. **Build parser**:
   ```bash
   # Copy the test script
   cp test-sportscapping-parser-v2.js test-SITENAME-parser.js
   # Update HTML patterns
   # Test locally
   node test-SITENAME-parser.js
   ```

3. **Create workflow**:
   ```bash
   # Copy this workflow
   cp sportscapping-scraper.json SITENAME-scraper.json
   # Update URLs and parser code
   ```

4. **Import to n8n** and activate!

## Support

If you encounter issues:

1. Check n8n execution logs (click on workflow execution to see details)
2. Run local test scripts to isolate the problem
3. Verify Google Sheets permissions
4. Check if sportscapping.com changed their HTML structure
5. Review n8n node documentation: https://docs.n8n.io/

## Changelog

- **2025-12-29**: Initial version
  - Supports pages 1-2 (50 picks)
  - Extracts 25 handicappers
  - 4 sports (NBA, NCAA-B, NFL, NHL)
  - Runs 3x daily
  - Tested and verified working

---

**Next Steps**: Import the workflow, test with manual trigger, then activate for automatic daily scraping! 🚀
