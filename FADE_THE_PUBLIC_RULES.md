# Top 5 Fade the Public Picks - Daily Instructions

## Goal
Each day, generate a list of the Top 5 games where the betting public is heavily favoring one side (public bet % ≥ 70%), and flag those games as "Fade the Public" opportunities — i.e., recommending a bet on the opposite side.

## Data Sources (EXTERNAL - Need API/Scraping)
- Action Network Public Betting Data
- Vegas Insider Consensus
- Covers Public Betting Trends
- Sportsbook Review (SBR) Consensus
- Any other reputable source that provides public % of bets

## Selection Criteria

1️⃣ Collect public bet % for all scheduled games that day across relevant sports (MLB, WNBA, NBA, NFL, etc.)

2️⃣ Identify games where:
- One side/team has **70% or more** of total public bets placed on it (not money %, just bet count %)

3️⃣ Rank these games by highest public percentage (descending order)

4️⃣ Select the **Top 5** games with the highest public % on one side

5️⃣ For each selected game, present:
- The team receiving 70%+ of public bets
- The fade recommendation (bet on the opposite team or side)
- Public % figure for reference

## Formatting Example

```
🔥 Top 5 Fade the Public Picks 🔥

1️⃣ Yankees @ Red Sox
   Public: 82% bets on Yankees
   👉 Fade = Red Sox

2️⃣ Dodgers @ Giants
   Public: 80% bets on Dodgers
   👉 Fade = Giants

3️⃣ Liberty @ Aces
   Public: 78% bets on Liberty
   👉 Fade = Aces

4️⃣ Braves @ Mets
   Public: 75% bets on Braves
   👉 Fade = Mets

5️⃣ Cubs @ Cardinals
   Public: 72% bets on Cubs
   👉 Fade = Cardinals
```

## Output Requirements
- Provide exactly 5 picks (or fewer if fewer than 5 games meet 70%+ threshold)
- Ensure dates are current (same-day games)
- Label each entry clearly with public % and clear fade recommendation

## Tie-Breaking Rule
If two sides have identical public % (tie), prioritize:
1. MLB games first
2. Then WNBA
3. NBA
4. NFL
5. etc.

## Summary Prompt
> "Collect today's public bet percentages from Action Network, Vegas Insider, Covers, and SBR. Identify all games where 70% or more of public bets are on one side. Rank by highest % and select the top 5. Present them as a list labeled 'Top 5 Fade the Public Picks' showing the game, team receiving public support, % public bets, and recommended fade (opposing team). Format cleanly and consistently for daily posting alongside consensus picks."

---

## Implementation Notes

### Current Status: ❌ Not Implemented

### Required to Implement:
1. **API Access** to Action Network, Vegas Insider, or Covers (most require paid subscriptions)
2. **OR Web Scraping** of public % data (fragile, may violate ToS)
3. **OR Manual Data Entry** (Matt enters public % data daily)

### Alternative "Fake Fade" (Current):
Based on INTERNAL consensus data only:
- If 4+ cappers on same side = flag as potential public play
- Recommend opposite side as contrarian

This is NOT real "Fade the Public" but approximates it without external data.
