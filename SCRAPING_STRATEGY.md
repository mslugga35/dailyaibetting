# Daily AI Betting - Scraping Strategy & Implementation Plan
**Created:** 2025-12-30
**Status:** Ready for Implementation

## 🎯 Executive Summary

We need to add 5 new sports picks scrapers to match your Google Sheets tabs. Current status:

### ✅ Working Scrapers (4/9)
- **WagerTalk** - 22 picks/run ✅
- **SportsCapping** - 19 picks/run ✅
- **SportsMemo** - Active ✅
- **BetFirm** - 28 picks/run ✅

### ❌ Missing Scrapers (5/9)
1. **BoydBets** - Site returns 404
2. **SportsLine** - Site returns 404
3. **Pickswise** - JavaScript-rendered (needs FireCrawl)
4. **Dimers** - Site returns 404
5. **Covers** - Only shows schedules, not picks

---

## 🔍 Research Findings

### Site Analysis Results

| Site | URL Tested | Status | Issue | Solution |
|------|-----------|--------|-------|----------|
| BoydBets | boydsbets.com/free-picks/ | ❌ 404 | Dead link | Find correct URL |
| SportsLine | sportsline.com/picks/ | ❌ 404 | Dead link | Try CBS Sports path |
| Pickswise | pickswise.com/picks/ | ⚠️ Dynamic | JavaScript SPA | Use FireCrawl MCP |
| Dimers | dimers.com/bet-hub/todays-best-bets | ❌ 404 | Dead link | Find correct URL |
| Covers | covers.com/picks | ⚠️ Schedules Only | No actual picks shown | Find picks page |

---

## 🛠️ Implementation Strategy

### Option 1: Simple HTTP Scraping (Like WagerTalk)
**Best for:** Sites with server-rendered HTML
**Works with:** SportsCapping, BetFirm, WagerTalk
**Process:**
1. Fetch HTML with httpRequest node
2. Parse with regex/string matching
3. Extract picks directly
4. Save to Google Sheets

**Pros:** Fast, reliable, no external dependencies
**Cons:** Only works with static HTML

### Option 2: FireCrawl MCP (Recommended for Dynamic Sites)
**Best for:** JavaScript-rendered content
**Works with:** Pickswise, modern SPA sites
**Process:**
1. Install FireCrawl MCP: `npx mcp-install @mendableai/firecrawl-mcp`
2. Use `firecrawl_scrape` or `firecrawl_extract` tools
3. FireCrawl renders JavaScript → returns clean data
4. Parse and save to sheets

**Pros:** Handles JavaScript, screenshots, structured extraction
**Cons:** Requires API key (500 free requests/month)

### Option 3: Find API Endpoints
**Best for:** Sites that load data via JSON APIs
**Works with:** Most modern betting sites
**Process:**
1. Open browser DevTools → Network tab
2. Find the API endpoint they use internally
3. Call that endpoint directly in n8n
4. Parse JSON response

**Pros:** Fastest, most reliable
**Cons:** Requires reverse engineering

---

## 📋 Immediate Action Plan

### Phase 1: Fix URLs & Test (TODAY)
```markdown
1. BoydBets
   - Search for: "boyds bets free picks" on Google
   - Test alternative URLs:
     - www.boydsbets.com/picks
     - www.boydsbets.com/nfl-picks
     - www.boydsbets.com/free-betting-picks

2. SportsLine (CBS Sports)
   - Try: www.sportsline.com/nfl/expert-picks/
   - Try: www.cbssports.com/picks/
   - Try: www.cbssports.com/nfl/picks/

3. Dimers
   - Try: www.dimers.com/best-bets
   - Try: www.dimers.com/nfl/best-bets
   - Try: www.dimers.com/free-picks

4. Covers
   - Try: www.covers.com/nfl/picks
   - Try: www.covers.com/free-picks
   - Search their site for actual expert picks page
```

### Phase 2: Build Scrapers (After URLs Found)

#### For Static HTML Sites:
```javascript
// Follow WagerTalk pattern:
1. Create fetch-{site}.js to test locally
2. Build parser with regex extraction
3. Create standalone n8n workflow
4. Test thoroughly
5. Integrate into Master Picks
```

#### For JavaScript Sites (Pickswise):
```bash
# Install FireCrawl MCP
npx mcp-install @mendableai/firecrawl-mcp

# Use in Claude Code or n8n HTTP node
{
  "url": "https://api.firecrawl.dev/v1/scrape",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer YOUR_API_KEY"
  },
  "body": {
    "url": "https://www.pickswise.com/picks/",
    "formats": ["extract"],
    "extract": {
      "schema": {
        "type": "object",
        "properties": {
          "picks": {
            "type": "array",
            "items": {
              "expert": "string",
              "sport": "string",
              "matchup": "string",
              "pick": "string",
              "date": "string"
            }
          }
        }
      }
    }
  }
}
```

### Phase 3: Prevent Failures

#### Current Workflow Health Check
```markdown
✅ Master Picks Workflow (ID: MInpXFItYWBsrlFz)
   - Status: Active
   - Sources: 4 (Google Doc, BetFirm, SportsCapping, WagerTalk)
   - Last run: Success (363 picks → 24 new)
   - Sheet: AllPicks

⚠️ Potential Failure Points:
1. SportsCapping uses httpRequest V1 (just fixed)
2. WagerTalk data format inconsistency (just fixed)
3. Google Sheets quota limits (10M cells max)
4. HTTP timeout on slow sites (set to 30s)
```

#### Monitoring & Alerts
```markdown
Add to each workflow:
1. Error handling nodes
2. Slack/Discord notification on failure
3. Fallback: If site fails, continue with other sources
4. Daily health check workflow
```

---

## 🚀 Quick Win Strategy (Get Data TODAY)

### Temporary Solution: Manual CSV Upload
While we build proper scrapers:

1. Visit each site manually
2. Copy picks to a structured format
3. Upload CSV to respective Google Sheets tab
4. Consensus will pick it up immediately

### OR Use FireCrawl Right Now

Since you have the scrape.txt guide:

```markdown
1. Install FireCrawl MCP:
   npx mcp-install @mendableai/firecrawl-mcp

2. In Claude Code:
   "Use firecrawl to extract all sports picks from
    www.pickswise.com/picks/
    Structure: expert name, sport, matchup, pick, date"

3. Save output to Google Sheets tab
4. Repeat for each site
```

---

## 📊 Expected Results

### Once All Scrapers Are Built:

| Source | Picks/Day | Status | Priority |
|--------|-----------|--------|----------|
| Google Doc | 294 | ✅ Working | High |
| BetFirm | 28 | ✅ Working | High |
| SportsCapping | 19 | ✅ Working | High |
| WagerTalk | 22 | ✅ Working | High |
| **BoydBets** | ~20 | 🔨 Build | Medium |
| **SportsLine** | ~30 | 🔨 Build | High |
| **Pickswise** | ~25 | 🔨 Build | High |
| **Dimers** | ~20 | 🔨 Build | Medium |
| **Covers** | ~15 | 🔨 Build | Low |

**Total Expected:** ~470 picks/day (currently: 363)

---

## ⚠️ Critical: Avoiding Failures

### Pre-Launch Checklist
- [ ] Test each scraper 3x independently
- [ ] Verify Google Sheets tabs exist
- [ ] Check date formats match consensus parser
- [ ] Confirm sport normalization (NFL, NBA, NCAAF, etc.)
- [ ] Test Master Picks with ALL sources
- [ ] Set timeout to 60s for slow sites
- [ ] Add error handling for each fetch
- [ ] Monitor first 24 hours closely

### Failure Prevention Rules
1. **Never delete working code** - Always create new versions
2. **Test standalone first** - Don't add to Master Picks until verified
3. **Use separate tabs** - Each source gets its own sheet for debugging
4. **Gradual rollout** - Add one scraper at a time to Master Picks
5. **Keep logs** - Use console.log for pick counts in parsers

---

## 🎬 Next Steps

1. **RIGHT NOW:** Find correct URLs for dead links
2. **Install FireCrawl:** Get API key from firecrawl.dev
3. **Build 1 scraper:** Start with easiest (likely SportsLine/CBS)
4. **Test thoroughly:** Run 5x, verify data quality
5. **Add to Master Picks:** Once stable
6. **Repeat** for remaining sites
7. **Monitor:** Watch for failures first 48 hours

---

## 📝 Notes

- FireCrawl free tier: 500 requests/month (enough for testing)
- Google Sheets: Currently 671 rows in AllPicks
- Consensus reads from: AllPicks tab (FIXED)
- Master Picks runs on webhook: https://mslugga35.app.n8n.cloud/webhook/dailyai-doc-update

**Last Updated:** 2025-12-30
**Next Review:** After first new scraper is deployed
