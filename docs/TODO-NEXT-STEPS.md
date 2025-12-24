# TODO & Next Steps

**DailyAI Betting - Implementation Roadmap**

---

## Phase 1: Connect to Live Data (Current Priority)

### 1.1 Google Sheets Setup
- [ ] **Publish Google Sheet to web** for public API access
  - Open: `https://docs.google.com/spreadsheets/d/1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI`
  - File → Share → Publish to web
  - Select tabs: BetFirm, BoydsBets, Dimers, Covers, SportsLine
  - Copy published URL

- [ ] **Alternative: Use Google Sheets API**
  - Create Google Cloud project
  - Enable Sheets API
  - Create service account
  - Download credentials JSON
  - Add to environment variables

### 1.2 Environment Setup
- [ ] Copy `.env.example` to `.env.local`
- [ ] Add Google Sheet ID: `GOOGLE_SHEET_ID=1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI`
- [ ] Add Google Doc ID: `GOOGLE_DOC_ID=1QAUgTvFZq3PlA25vznkly8CHb4uNsIRYEZ0oXCitKxo`

### 1.3 Test API Endpoints
```bash
# Start dev server
npm run dev

# Test consensus API
curl http://localhost:3001/api/consensus

# Test picks API
curl http://localhost:3001/api/picks
```

---

## Phase 2: Replace Mock Data with Live Data

### 2.1 Homepage
- [ ] Replace mock consensus data with `useConsensus()` hook
- [ ] Replace mock capper data with API call
- [ ] Add loading states
- [ ] Add error handling

### 2.2 Consensus Page
- [ ] Connect to `/api/consensus` endpoint
- [ ] Add sport filtering
- [ ] Add real-time refresh (5 min interval)

### 2.3 Picks Page
- [ ] Connect to `/api/picks` endpoint
- [ ] Implement pagination
- [ ] Add date filtering
- [ ] Add capper filtering

### 2.4 Cappers Page
- [ ] Build capper stats from picks data
- [ ] Calculate win rates from historical results
- [ ] Add streak tracking

---

## Phase 3: n8n Integration

### 3.1 Import Existing Workflow
- [ ] Go to `https://mslugga35.app.n8n.cloud`
- [ ] Import `n8n-unified-sports-picks/IMPORT-ME-unified-sports-picks.json`
- [ ] Configure Google Sheets credentials
- [ ] Test workflow execution

### 3.2 Add Website Webhook
- [ ] Create webhook endpoint in n8n
- [ ] Add webhook trigger to website
- [ ] Enable real-time updates when picks are scraped

### 3.3 Schedule Configuration
```
Current: Daily at 3 PM ET
Recommended:
- 6:00 AM - Morning scrape
- 12:00 PM - Midday update
- 5:00 PM - Evening update
```

---

## Phase 4: Result Tracking

### 4.1 Add Result Fields
- [ ] Add `result` column to Google Sheets
- [ ] Create result entry workflow in n8n
- [ ] Build result submission UI (admin)

### 4.2 Calculate Performance
- [ ] Win/Loss/Push tracking
- [ ] Units profit/loss calculation
- [ ] ROI calculation
- [ ] Streak tracking

### 4.3 Update Capper Stats
- [ ] Auto-update capper records after results
- [ ] Historical performance charts
- [ ] Monthly/weekly breakdowns

---

## Phase 5: AI Analysis (Optional)

### 5.1 OpenAI Integration
- [ ] Add `OPENAI_API_KEY` to environment
- [ ] Create AI analysis endpoint
- [ ] Generate pick analysis text

### 5.2 AI Features
- [ ] Trend detection
- [ ] Confidence scoring enhancement
- [ ] Natural language insights
- [ ] Best bet recommendations

---

## Phase 6: Notifications

### 6.1 Discord Integration
- [ ] Create Discord webhook
- [ ] Add `DISCORD_WEBHOOK_URL` to environment
- [ ] Send alerts for:
  - New consensus picks (3+ cappers)
  - High-confidence plays (5+ cappers)
  - Results updates

### 6.2 Email Notifications (Future)
- [ ] SendGrid or Resend integration
- [ ] Daily digest emails
- [ ] Alert preferences

---

## Phase 7: Deployment

### 7.1 Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### 7.2 Domain Setup
- [ ] Connect `dailyaibetting.com` domain
- [ ] Configure DNS
- [ ] Enable HTTPS

### 7.3 Production Checklist
- [ ] Environment variables set
- [ ] Error monitoring (Sentry)
- [ ] Analytics (Vercel Analytics or Google)
- [ ] Performance testing

---

## Phase 8: Future Enhancements

### Short-term
- [ ] Mobile responsiveness polish
- [ ] Dark/light mode toggle
- [ ] Export to CSV/PDF
- [ ] Share picks on social

### Medium-term
- [ ] User accounts
- [ ] Favorite cappers
- [ ] Custom alerts
- [ ] Parlay builder

### Long-term
- [ ] Mobile app (React Native)
- [ ] Odds comparison
- [ ] Bankroll tracking
- [ ] Community features

---

## Quick Start Commands

```bash
# Navigate to project
cd C:\Users\mpmmo\DirectoryWebsites\Sites\dailyaibetting

# Install dependencies (if not done)
npm install

# Create environment file
copy .env.example .env.local

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel
```

---

## Important Files Reference

| File | Purpose |
|------|---------|
| `docs/RESEARCH-NOTES.md` | All research findings |
| `docs/EXISTING-PROJECTS-INVENTORY.md` | Complete project inventory |
| `docs/TODO-NEXT-STEPS.md` | This file |
| `CLAUDE.md` | Project documentation |
| `.env.example` | Environment template |
| `src/lib/consensus/` | Consensus logic |
| `src/lib/data/google-sheets.ts` | Data fetching |
| `src/app/api/` | API routes |

---

## Questions to Answer

1. **Google Sheets Access**: How should we authenticate?
   - Option A: Publish sheet (simplest)
   - Option B: Service account (more secure)

2. **Result Entry**: How will results be entered?
   - Option A: Manual entry in Google Sheets
   - Option B: Admin UI on website
   - Option C: n8n workflow to scrape results

3. **Which 10 cappers** should we focus on?
   - Need final list from user

4. **Update Frequency**: How often should website refresh?
   - Current: 5 minutes
   - Options: Real-time via webhook, or polling

---

---

## ✅ COMPLETED (December 23, 2024)

### Frontend Connected to Live API
- [x] Updated homepage to use `useConsensus()` hook
- [x] Added loading states and error handling
- [x] Fallback to mock data when API unavailable
- [x] Refresh button connected to API refetch
- [x] Type adapter for API → Component conversion

### n8n Workflow Created
- [x] Created simplified workflow: `n8n/SIMPLE-PICKS-WORKFLOW.json`
- [x] Import guide: `n8n/IMPORT-GUIDE.md`
- [x] Sites: BetFirm, BoydsBets, Covers, Pickswise
- [x] Output: "AllPicks" tab in Google Sheets

### Documentation
- [x] Setup instructions: `docs/SETUP-INSTRUCTIONS.md`
- [x] Research notes: `docs/RESEARCH-NOTES.md`
- [x] Existing projects inventory: `docs/EXISTING-PROJECTS-INVENTORY.md`

---

*Last Updated: December 23, 2024*
