# Daily AI Betting - Session Notes
**Date:** 2025-12-30
**Session:** FireCrawl MCP Installation & New Scraper Planning

---

## 🎯 Session Accomplishments

### ✅ Completed Tasks

1. **Master Picks Workflow Testing**
   - Tested workflow ID: MInpXFItYWBsrlFz
   - Fixed WagerTalk parser bug (data access issue)
   - Successfully integrated 4 sources: Google Doc (294), BetFirm (28), SportsCapping (19), WagerTalk (22)
   - Total: 363 picks/day → 24 new picks saved in test run

2. **Data Source Configuration**
   - Confirmed consensus reads from multiple Google Sheets tabs
   - Updated `google-sheets.ts` SHEET_TABS array to include:
     - AllPicks (main consolidated)
     - BoydBets, SportsLine, Pickswise, Dimers, Covers (new sources)
     - WagerTalk, SportsMemo, SportsCapping (existing sources)

3. **New Scraper Research**
   - Identified 5 missing scrapers from Google Sheets tabs
   - Found correct working URLs for all sites:
     - BoydBets: boydsbets.com/free-sports-picks/ ✅
     - SportsLine: cbssports.com/picks/ ✅
     - Pickswise: pickswise.com/picks/ (JavaScript-rendered)
     - Dimers: dimers.com/best-bets ✅
     - Covers: covers.com/picks ✅

4. **FireCrawl MCP Installation**
   - ✅ Installed FireCrawl MCP with API key: <FIRECRAWL_API_KEY - see .env.local>
   - Modified config: C:\Users\mpmmo\.claude.json
   - Command used: `claude mcp add firecrawl -s user -- env FIRECRAWL_API_KEY=<FIRECRAWL_API_KEY - see .env.local> npx -y firecrawl-mcp`

5. **Documentation Created**
   - [SCRAPING_STRATEGY.md](C:\Users\mpmmo\DirectoryWebsites\Sites\dailyaibetting\SCRAPING_STRATEGY.md) - Comprehensive implementation plan
   - [.claude/skills/firecrawl-expert/skill.md](C:\Users\mpmmo\.claude\skills\firecrawl-expert\skill.md) - Complete FireCrawl usage guide

---

## 🚧 Current Status

### Where We Left Off

**FireCrawl MCP installed but requires restart** - Claude Code needs to be restarted for the new MCP tools to become available in the next session.

### Next Immediate Steps

1. **Test FireCrawl** (NEXT TASK)
   - Start with Pickswise (JavaScript site requiring FireCrawl)
   - Use `firecrawl_extract` with schema for sports picks
   - Validate data structure matches our needs

2. **Build 5 New Scrapers**
   - Create individual n8n workflows for each site
   - Test standalone before integrating
   - Save to respective Google Sheets tabs

3. **Integrate to Master Picks**
   - Add new sources to Master Picks workflow
   - Test full integration with all 9 sources
   - Monitor for failures

---

## 📋 Key Files Modified

### 1. google-sheets.ts
**Location:** `C:\Users\mpmmo\DirectoryWebsites\Sites\dailyaibetting\src\lib\data\google-sheets.ts`

**Changes:**
- Updated SHEET_TABS array to include all 9 source tabs:
```typescript
const SHEET_TABS = [
  'AllPicks',      // Main consolidated tab
  'BoydBets',      // Boyd's Bets source
  'SportsLine',    // SportsLine source
  'Pickswise',     // Pickswise source
  'Dimers',        // Dimers source
  'Covers',        // Covers source
  'WagerTalk',     // WagerTalk source
  'SportsMemo',    // SportsMemo source
  'SportsCapping', // SportsCapping source
];
```

### 2. Master Picks Workflow (n8n)
**Workflow ID:** MInpXFItYWBsrlFz
**Instance:** https://mslugga35.app.n8n.cloud

**Fix Applied:**
- Parse WagerTalk node: Fixed data access to handle both string and nested formats
```javascript
const html = (typeof $json === 'string') ? $json : ($json.data || '');
```

---

## 📊 Current Data Pipeline

### Sources (4/9 Working)
1. ✅ Google Doc - 294 picks/day
2. ✅ BetFirm - 28 picks/day
3. ✅ SportsCapping - 19 picks/day
4. ✅ WagerTalk - 22 picks/day
5. ❌ BoydBets - **Need to build**
6. ❌ SportsLine - **Need to build**
7. ❌ Pickswise - **Need to build** (requires FireCrawl)
8. ❌ Dimers - **Need to build**
9. ❌ Covers - **Need to build**

**Current:** 363 picks/day
**Target:** ~470 picks/day (with all 9 sources)

### Data Flow
1. Individual scrapers fetch picks → Save to source-specific tabs
2. Master Picks consolidates all → Saves to AllPicks tab
3. Consensus API reads from all tabs → Builds consensus picks
4. Frontend displays consensus + all picks grouped by capper

---

## 🛠️ Scraping Strategy

### Option 1: Simple HTTP (Static Sites)
**Use for:** BoydBets, SportsLine, Dimers, Covers
**Pattern:** Same as WagerTalk/SportsCapping
- httpRequest node → Parse with regex → Save to sheets

### Option 2: FireCrawl MCP (JavaScript Sites)
**Use for:** Pickswise
**Process:**
1. Use `firecrawl_extract` tool
2. Define schema for structured data:
```javascript
{
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
```
3. Convert to n8n HTTP Request node format
4. Save to Pickswise tab

---

## 🔑 Important Context

### Google Sheets
- **Sheet ID:** <GOOGLE_SHEET_ID - see .env.local>
- **Spreadsheet Name:** "Daily_Capper_Picks"
- **Tab Name (main):** "AllPicks"
- **Current Rows:** 671 in AllPicks

### FireCrawl
- **API Key:** <FIRECRAWL_API_KEY - see .env.local>
- **Free Tier:** 500 requests/month
- **Installed:** Yes (requires restart to load)
- **Skill Doc:** C:\Users\mpmmo\.claude\skills\firecrawl-expert\skill.md

### n8n Instance
- **URL:** https://mslugga35.app.n8n.cloud
- **Master Picks Webhook:** <N8N_DOC_UPDATE_WEBHOOK - see .env.local>

---

## ⚠️ Critical Reminders

### Before Building New Scrapers
1. Test FireCrawl with Pickswise first
2. Build each scraper as standalone workflow
3. Test 3-5 times independently
4. Verify Google Sheets tab exists
5. Confirm date/sport format matches consensus expectations

### Failure Prevention
1. **Never delete working code** - Create new versions
2. **Test standalone first** - Don't add to Master Picks until verified
3. **Gradual rollout** - Add one scraper at a time
4. **Error handling** - Each source fails gracefully
5. **Monitor closely** - Watch first 24 hours after deployment

---

## 📝 Todo List Status

- [x] Find correct URLs for dead link sites
- [x] Install FireCrawl MCP
- [x] Restart Claude Code to load FireCrawl tools
- [ ] **NEXT:** Test FireCrawl with one sports site (Pickswise)
- [ ] Build scrapers for all 5 new sites
- [ ] Integrate into Master Picks workflow
- [ ] Monitor for failures and validate data

---

## 🎯 Next Session Goals

1. **Test FireCrawl** - Verify Pickswise scraping works
2. **Build 1-2 scrapers** - Start with easiest sites (SportsLine/BoydBets)
3. **Test integration** - Add to Master Picks one at a time
4. **Validate data** - Ensure picks flow correctly to consensus

---

**Session End:** Ready to test FireCrawl and build new scrapers
**Next Action:** Restart Claude Code → Test FireCrawl with Pickswise
**Expected Outcome:** 5 new scrapers → 470 picks/day total
