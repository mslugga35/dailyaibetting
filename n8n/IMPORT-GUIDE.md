# n8n Workflow Import Guide

## Quick Import Steps

### 1. Open n8n Cloud
Go to: https://mslugga35.app.n8n.cloud

### 2. Import the Workflow
1. Click **"Add workflow"** (+ button)
2. Click **"Import from File"**
3. Select: `SIMPLE-PICKS-WORKFLOW.json` from this folder
4. Click **"Import"**

### 3. Configure Google Sheets Credential
1. Click the **"Save to Google Sheets"** node
2. Click **"Credential to connect with"**
3. Select your Google Sheets OAuth credential OR create new:
   - Click **"Create new credential"**
   - Select **"Google Sheets OAuth2 API"**
   - Follow the OAuth flow to connect your Google account
4. Click **"Save"**

### 4. Test the Workflow
1. Click **"Test workflow"** or **"Execute workflow"**
2. Check the **"Save to Google Sheets"** node output
3. Verify data appears in your Google Sheet

### 5. Activate the Workflow
1. Toggle the **"Active"** switch to ON
2. Workflow will now run automatically at:
   - 8:00 AM
   - 12:00 PM
   - 4:00 PM
   - 8:00 PM

---

## What This Workflow Does

```
Schedule (4x daily) → Fetch BetFirm, BoydsBets, Covers, Pickswise
                    → Parse HTML for picks
                    → Deduplicate
                    → Save to Google Sheets "AllPicks" tab
```

### Sites Scraped
| Site | URL | Parser |
|------|-----|--------|
| BetFirm | betfirm.com/free-sports-picks/ | Table format |
| BoydsBets | boydsbets.com/free-sports-picks/ | Table format |
| Covers | covers.com/picks | Article format |
| Pickswise | pickswise.com/picks/ | Pick cards |

### Output Format (Google Sheets)
| Column | Description |
|--------|-------------|
| Site | Source website name |
| League | Sport (MLB, NFL, etc.) |
| Date | "TODAY" or game date |
| Matchup | Teams involved |
| Service | Capper/Expert name |
| Pick | The actual pick |
| RunDate | When scraped (YYYY-MM-DD) |

---

## Google Sheet Setup

### Option A: Use Existing Sheet
Sheet ID: `1dZe1s-yLHYvrLQEAlP0gGCVAFNbH433lV82iHzp-_BI`

1. Open the sheet
2. Create a tab named **"AllPicks"** if it doesn't exist
3. Add headers: `Site | League | Date | Matchup | Service | Pick | RunDate`

### Option B: Create New Sheet
1. Create new Google Sheet
2. Name it "DailyAI Betting Picks"
3. Create tab named **"AllPicks"**
4. Add headers: `Site | League | Date | Matchup | Service | Pick | RunDate`
5. Copy the Sheet ID from the URL and update workflow

---

## Troubleshooting

### "Failed to fetch" errors
- Site might be blocking requests
- Check if site is accessible in browser
- Some sites need cookies (not supported in this simple version)

### No picks found
- Parsers may need updating if site changed layout
- Check console logs in Code node
- Verify HTML structure matches parser expectations

### Google Sheets auth error
- Re-authenticate Google Sheets credential
- Make sure you have edit access to the sheet
- Check credential scopes include Google Sheets

### Workflow not triggering
- Make sure workflow is **Active**
- Check scheduled times are in your timezone
- Manual trigger always works for testing

---

## Advanced: Adding More Sites

To add a new site:

1. Add to the "Working Sites Only" node JSON:
```json
{"name": "NewSite", "url": "https://...", "parser": "newsite"}
```

2. Add parser in "Parse Picks" Code node:
```javascript
if (parser === 'newsite') {
  // Your parsing logic here
}
```

---

*Last Updated: December 2024*
