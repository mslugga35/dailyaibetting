# DAI-07: real-phone menu check (Matt, about 2 minutes)

Automated checks already pass (146/146 at 375–1280 px, twice). This is the one thing only a real phone can show: the ☰ menu feels right to a thumb. Use your normal phone browser; any build from 2265871 onward counts (today 413a3b5).

## Steps
1. Open https://dailyaibetting.com signed **out**. Tap ☰ (top right).
   - [ ] The menu opens over the page, and the page behind does not scroll while it's open.
   - [ ] You see: AI Picks, Daily Bets, Consensus, Stats, All Picks, Blog, Cappers, History, Pricing, Responsible Gambling, plus **Sign in** and the Pro button.
   - [ ] Every item is easy to tap without hitting its neighbour.
2. Tap **Consensus**. [ ] The menu closes and Consensus loads. Repeat with **Pricing**.
3. Open ☰ again and close it with ☰/✕ (and, if offered, by tapping outside). [ ] It closes every time.
4. Turn the phone sideways, open ☰. [ ] The menu still fits and scrolls if it's long; nothing is cut off.
5. Sign in, open ☰. [ ] **Account** appears in the list, and tapping it opens /account.
6. On /pricing (signed in): [ ] the Founding button and price text fit on the screen without sideways scrolling. **Do not start Checkout.**

## Report
Reply "DAI-07 pass", or the step number that failed with a screenshot, plus your phone model and browser (e.g. iPhone 15, Safari).
