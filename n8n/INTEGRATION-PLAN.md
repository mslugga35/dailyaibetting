# SportsCapping Integration Plan
## ✅ COMPATIBILITY CHECK - EVERYTHING WORKS TOGETHER!

### Current System Overview

```
┌──────────────┐
│   n8n Cloud  │ (Scrapes sites)
│  Workflows   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  Google Sheets                               │
│  ID: <GOOGLE_SHEET_ID - see .env.local> │
│                                              │
│  Current Tabs:                               │
│  - Daily_Capper_Picks (website reads this)   │
│  - BetFirm                                   │
│  - BoydsBets                                 │
│  - Dimers                                    │
│  - Covers                                    │
│  - SportsLine                                │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│  Website API │ (Reads every 5 min)
│  google-      │
│  sheets.ts    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Consensus   │ (Finds 3+ capper agreement)
│  Builder     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Frontend    │ (Shows 🔥 fire picks)
│  UI          │
└──────────────┘
```

### Data Format (RawPick Interface)

Your website expects this exact format:
```typescript
{
  site: string;      // "SportsCapping"
  league: string;    // "NBA", "NCAA-B", "NFL", etc.
  date: string;      // "Dec 29, 2025" or "TODAY"
  matchup: string;   // "Oakland vs Wright State"
  service: string;   // Capper name: "Sal Michaels"
  pick: string;      // "Oakland +3 -110 at Ace"
  runDate?: string;  // "2025-12-29"
}
```

### ✅ SportsCapping Scraper Output

**PERFECT MATCH!** The scraper outputs:
```javascript
{
  Site: 'SportsCapping',           ✅ Matches 'site'
  League: 'NBA',                   ✅ Matches 'league'
  Date: 'Dec 29, 2025',           ✅ Matches 'date'
  Matchup: 'Oakland vs Wright State', ✅ Matches 'matchup'
  Service: 'Sal Michaels',        ✅ Matches 'service'
  Pick: 'Oakland +3 -110 at Ace', ✅ Matches 'pick'
  RunDate: '2025-12-29'           ✅ Matches 'runDate'
}
```

## Integration Options

### Option 1: Separate Tab (RECOMMENDED for testing)

**Pros:**
- Keep SportsCapping isolated while testing
- Easy to debug without affecting live site
- Can compare quality vs other scrapers
- Clean separation of data sources

**Setup:**
1. Create new tab in Google Sheet: **"SportsCapping"**
2. Import workflow as-is (already configured for "SportsCapping" tab)
3. Run manually to test
4. Verify data quality
5. Later merge into main tab

**Configuration:**
```json
// In n8n workflow - Save to Google Sheets node
"sheetName": {
  "value": "SportsCapping",  // ✅ Already set!
  "mode": "name"
}
```

### Option 2: Daily_Capper_Picks Tab (IMMEDIATE INTEGRATION)

**Pros:**
- Website already reads from this tab
- Picks show up immediately on site
- Consensus builder will include them
- No code changes needed

**Setup:**
1. Import workflow
2. Change "SportsCapping" tab to "Daily_Capper_Picks"
3. Activate workflow
4. Picks show on website within 5 minutes

**Configuration:**
```json
// In n8n workflow - Save to Google Sheets node
"sheetName": {
  "value": "Daily_Capper_Picks",  // Change this
  "mode": "name"
}
```

### Option 3: AllPicks Tab (LEGACY COMPATIBILITY)

If you have an AllPicks tab that aggregates everything:

**Configuration:**
```json
"sheetName": {
  "value": "AllPicks",
  "mode": "name"
}
```

## Step-by-Step Integration Guide

### Phase 1: Testing (Separate Tab) - 1-2 days

1. **Create SportsCapping Tab**
   ```
   Open Google Sheets: <GOOGLE_SHEET_ID - see .env.local>
   Create new tab: "SportsCapping"
   Add headers: Site | League | Date | Matchup | Service | Pick | RunDate
   ```

2. **Import n8n Workflow**
   ```
   Go to: https://mslugga35.app.n8n.cloud
   Import: sportscapping-scraper.json
   Add Google Sheets credential (reuse existing)
   Click "Manual Trigger" → "Execute Workflow"
   ```

3. **Verify Data Quality**
   ```
   Check Google Sheet for 25 picks
   Verify handicapper names are correct
   Confirm picks have odds (e.g., "Oakland +3 -110")
   Check sports are properly tagged (NBA, NCAA-B, etc.)
   ```

4. **Test Website Integration (Optional)**
   ```
   Edit: src/lib/data/google-sheets.ts
   Change line 14: const SHEET_TABS = ['Daily_Capper_Picks', 'SportsCapping'];
   Save and deploy
   Check /api/picks endpoint for SportsCapping picks
   ```

### Phase 2: Production (Merge to Main Tab) - 1 hour

1. **Update Workflow Tab**
   ```
   In n8n, edit "Save to Google Sheets" node
   Change sheetName to "Daily_Capper_Picks"
   Save workflow
   ```

2. **Activate Workflow**
   ```
   Toggle "Inactive" → "Active"
   Schedule: 8am, 2pm, 8pm ET (as configured)
   ```

3. **Monitor First Run**
   ```
   Wait for next scheduled run
   Check Google Sheet for new picks
   Verify no duplicates
   Check website /api/consensus for SportsCapping picks
   ```

4. **Verify Consensus Builder**
   ```
   Go to: https://dailyaibetting.com/consensus
   Look for picks with "Sal Michaels", "Black Widow", etc.
   Check if SportsCapping picks appear in 🔥 fire picks
   ```

## What Will Happen After Integration

### Immediate Effects

1. **25+ New Cappers Added**
   - Sal Michaels, Black Widow, Joe Duffy, Dustin Hawkins, etc.
   - 25 handicappers per run (3x daily = 75 picks/day potential)

2. **More Consensus Picks**
   - SportsCapping cappers will contribute to consensus
   - If Sal Michaels picks "Lakers +3" AND your existing cappers also pick it → 🔥 FIRE PICK

3. **Better Sport Coverage**
   - Strong NBA coverage (11 picks per run)
   - Good NCAA-B coverage (8 picks per run)
   - NFL picks (5 per run)
   - NHL picks (1-2 per run)

4. **Data Flow**
   ```
   SportsCapping scraper (3x daily)
        ↓
   Google Sheets → Daily_Capper_Picks tab
        ↓
   Website API (every 5 min) → google-sheets.ts
        ↓
   Consensus Builder → finds overlapping picks
        ↓
   Frontend → shows 🔥 when 3+ cappers agree
   ```

### Expected Results

**Before SportsCapping:**
- ~50 picks/day from existing scrapers
- 10 cappers tracked

**After SportsCapping:**
- ~125 picks/day (50 existing + 75 new)
- 35+ cappers tracked (10 existing + 25 new)
- More consensus opportunities
- Better matchup coverage

## Potential Issues & Solutions

### Issue 1: Duplicate Picks

**Problem:** SportsCapping and BetFirm might have the same capper (unlikely but possible)

**Solution:** Consensus builder already handles this by capper name + pick text deduplication

### Issue 2: Different Sport Naming

**Problem:** SportsCapping uses "NCAA-B" but website expects "NCAAB"

**Solution:** Update the parser to normalize:
```javascript
// In sportscapping-scraper.json parser
const sportNormalize = {
  'NCAA-B': 'NCAAB',
  'NCAA-F': 'NCAAF'
};
sport = sportNormalize[sport] || sport;
```

**Action:** Update the workflow JSON now or after testing

### Issue 3: Too Many Picks Overwhelming UI

**Problem:** 125 picks/day might clutter the interface

**Solution:** Already handled - website has filters:
- Filter by sport
- Filter by capper
- Filter by date
- Show only consensus picks (3+)

### Issue 4: Scraper Breaks When Site Updates

**Problem:** SportsCapping.com changes HTML structure

**Solution:**
1. Run `node debug-html-structure.js` to inspect new structure
2. Update parser regex patterns
3. Test with `node test-sportscapping-parser-v2.js`
4. Update workflow and redeploy

## Monitoring & Maintenance

### Daily Checks (First Week)
```bash
# Check if workflow ran successfully
https://mslugga35.app.n8n.cloud/workflows → SportsCapping Scraper → Executions

# Check Google Sheet for new picks
Open sheet → SportsCapping or Daily_Capper_Picks tab → Verify today's date

# Check website API
https://dailyaibetting.com/api/picks?capper=Sal+Michaels
```

### Weekly Checks (Ongoing)
- Verify pick counts are consistent (~75/day)
- Check for parsing errors in n8n logs
- Validate consensus picks include SportsCapping cappers
- Monitor for HTML structure changes

### Monthly Maintenance
- Review handicapper performance
- Adjust scraping schedule if needed
- Add more pages if needed (currently scrapes 2 pages)
- Consider adding more sites using same pattern

## Next Steps

### Immediate (Today)
- [ ] Create "SportsCapping" tab in Google Sheets
- [ ] Import sportscapping-scraper.json to n8n
- [ ] Add Google Sheets credential
- [ ] Run manual test
- [ ] Verify 25 picks appear in sheet

### Short Term (This Week)
- [ ] Fix sport naming (NCAA-B → NCAAB)
- [ ] Test with website integration (optional)
- [ ] Activate workflow for automatic runs
- [ ] Monitor for 3-5 days

### Long Term (This Month)
- [ ] Change to Daily_Capper_Picks tab (production)
- [ ] Build scrapers for other sites (WagerTalk, SportsMemo, etc.)
- [ ] Optimize scraping schedule based on traffic
- [ ] Add error notifications (Discord/email)

## Configuration Summary

### Current Workflow Settings

```json
{
  "schedule": "3x daily (8am, 2pm, 8pm ET)",
  "pages": 2,
  "picksPerPage": 25,
  "totalPicks": 50,
  "googleSheet": "<GOOGLE_SHEET_ID - see .env.local>",
  "sheetTab": "SportsCapping",  // Change to "Daily_Capper_Picks" for production
  "deduplication": true,
  "errorHandling": true
}
```

### Website Settings

```typescript
// src/lib/data/google-sheets.ts (line 14)
const SHEET_TABS = ['Daily_Capper_Picks'];

// To include SportsCapping tab:
const SHEET_TABS = ['Daily_Capper_Picks', 'SportsCapping'];

// Or just change workflow to use Daily_Capper_Picks
```

## Questions to Answer

1. **Which tab do you want to use?**
   - Separate "SportsCapping" tab for testing? (RECOMMENDED)
   - Direct to "Daily_Capper_Picks" for immediate integration?

2. **Should I fix the sport naming now?**
   - Update NCAA-B → NCAAB in the workflow JSON?

3. **Want to scrape more sites next?**
   - WagerTalk.com?
   - SportsMemo.com?
   - Covers.com (you have this but maybe different section)?

4. **Scraping frequency good?**
   - 3x daily okay or want more/less?

## Support Files

All files in: `C:\Users\mpmmo\DirectoryWebsites\Sites\dailyaibetting\n8n\`

- `sportscapping-scraper.json` - Production workflow
- `test-sportscapping-parser-v2.js` - Local testing
- `debug-html-structure.js` - HTML inspector
- `SPORTSCAPPING-IMPORT-GUIDE.md` - Detailed setup guide
- `INTEGRATION-PLAN.md` - This file

---

**Ready to import?** Start with Phase 1 (separate tab testing), then move to Phase 2 when confident! 🚀
