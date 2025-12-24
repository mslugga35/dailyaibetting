# DailyAI Betting - Setup Instructions

Follow these steps in order to get the site fully operational.

---

## Step 1: Publish Google Sheet to Web (REQUIRED)

Your Google Sheet needs to be publicly accessible for the website to fetch data.

### Steps:
1. **Open your Google Sheet**:
   https://docs.google.com/spreadsheets/d/1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI

2. **Click**: File → Share → Publish to web

3. **Settings**:
   - Link: Entire Document
   - Format: Web page
   - Check "Automatically republish when changes are made"

4. **Click** "Publish"

5. **Verify it works**: Open this URL in browser (should show JSON, not an error):
   ```
   https://docs.google.com/spreadsheets/d/1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI/gviz/tq?tqx=out:json&sheet=BetFirm
   ```

### Create "AllPicks" Tab:
1. In the Google Sheet, click the **+** button to add a new tab
2. Name it **AllPicks**
3. Add these headers in row 1:
   `Site | League | Date | Matchup | Service | Pick | RunDate`

---

## Step 2: Import n8n Workflow

### Steps:
1. **Open n8n Cloud**: https://mslugga35.app.n8n.cloud

2. **Import Workflow**:
   - Click **"Add workflow"** (+)
   - Click **"Import from File"**
   - Select: `n8n/SIMPLE-PICKS-WORKFLOW.json`
   - Click **"Import"**

3. **Configure Google Sheets**:
   - Click the **"Save to Google Sheets"** node
   - Click **"Credential to connect with"**
   - Select your Google Sheets OAuth OR create new
   - Make sure it has access to the target sheet

4. **Test**:
   - Click **"Test workflow"**
   - Check if picks appear in Google Sheets

5. **Activate**:
   - Toggle **"Active"** switch ON
   - Workflow runs at 8am, 12pm, 4pm, 8pm

---

## Step 3: Set Environment Variables

1. **Copy the example file**:
   ```bash
   cd C:\Users\mpmmo\DirectoryWebsites\Sites\dailyaibetting
   copy .env.example .env.local
   ```

2. **Edit `.env.local`**:
   ```env
   # Required - your Google Sheet ID
   GOOGLE_SHEET_ID=1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI

   # Optional - Google Doc with picks
   GOOGLE_DOC_ID=1QAUgTvFZq3PlA25vznkly8CHb4uNsIRYEZ0oXCitKxo

   # Optional - n8n webhook URL
   N8N_WEBHOOK_URL=https://mslugga35.app.n8n.cloud/webhook/dailyaibetting
   ```

---

## Step 4: Test the Website

1. **Start dev server**:
   ```bash
   cd C:\Users\mpmmo\DirectoryWebsites\Sites\dailyaibetting
   npm run dev
   ```

2. **Test API endpoints** (in browser):
   - http://localhost:3000/api/picks
   - http://localhost:3000/api/consensus

3. **View the site**:
   - http://localhost:3000

---

## Step 5: Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   cd C:\Users\mpmmo\DirectoryWebsites\Sites\dailyaibetting
   vercel
   ```

3. **Set environment variables** in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add `GOOGLE_SHEET_ID`
   - Add `GOOGLE_DOC_ID` (optional)

4. **Connect domain**:
   - Add custom domain: dailyaibetting.com

---

## Troubleshooting

### "401 Unauthorized" from Google Sheets
- Sheet is not published to web
- Follow Step 1 again

### "No picks found"
- n8n workflow hasn't run yet
- Run the workflow manually in n8n
- Check if "AllPicks" tab has data

### API returns empty array
- Check browser console for errors
- Verify Google Sheet URL is correct
- Make sure headers match: Site, League, Date, Matchup, Service, Pick, RunDate

### Site shows mock data
- Frontend is using mock data
- Need to update components to use real API hooks
- Check `useConsensus()` and `usePicks()` hooks

---

## Quick Commands

```bash
# Start development
cd C:\Users\mpmmo\DirectoryWebsites\Sites\dailyaibetting
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel

# Check if Google Sheet is accessible (in PowerShell)
Invoke-WebRequest "https://docs.google.com/spreadsheets/d/1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI/gviz/tq?tqx=out:json&sheet=BetFirm"
```

---

*Last Updated: December 2024*
