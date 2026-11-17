# Pro value review and feature recommendations

Grounded in code at branch `feat/cx-critical-fixes` (base ad8cd80). No marketing promises: every item says whether today's data supports it.

## 1. What Pro actually unlocks today (from code gating)

| Surface | Free | Pro | Code |
|---|---|---|---|
| Consensus picks | Overall top 5 of the day (cannot be widened via params) | All consensus picks | `src/app/api/consensus/route.ts` (`FREE_TIER_LIMIT = 5`, `freePickIds`) |
| Daily Bets | Free-tier slice | Full | `src/app/api/daily-bets/route.ts` (`limitDailyBetsToFreeTier`) |
| Capper pages `/cappers/[slug]` | Header and teaser | Recent form, per-sport breakdown, pick history | `ProGateSection` in `cappers/[slug]/page.tsx` |
| `/history` | Summary stat cards only | Filterable pick-by-pick list | `ProGateSection feature="full pick history"` |
| `/stats` | Overall stats | Tier breakdowns | `ProGateSection feature="detailed tier breakdowns"` |
| MEGA/NUCLEAR labels | Tier labels visible only on the top-5 slice | On all picks | consensus builder tiers (NUCLEAR is 5+ cappers in code) |

Public (not Pro): capper leaderboard, `/results` graded consensus record, `/trends` (Coming Soon placeholder), AI report on `/daily-ai-picks`, blog.

Not implemented anywhere in code, so removed from copy: real-time delivery or a free-tier 5-minute delay, early access before lines move, "200+ cappers" (the site tracks roughly 22), AI trend analysis, a Pro-only leaderboard, a 30-day archive limit (history gating is "summary vs list", not by days).

Honest summary: Pro today = "see everything we already compute" (all consensus, capper detail, pick list). It is breadth of access, not a distinct analytical product. The data below supports several features that are real differentiators.

## 2. Data the system really has

- `hb_picks`: capper_id, sport, team, opponent, pick_type (spread/moneyline/over/under/prop), line, odds, units, posted_at, game_time, matched_game_id, graded result fields (actual_score, graded_at, grading_source), confidence, analysis, is_parlay/parlay_legs, player_name.
- `hb_capper_stats`: per-capper wins/losses/pushes, win_rate, roi, units_won/wagered, avg_odds, current_streak, grade, `sport_records` (per-sport JSON).
- `hb_games`: teams, commence_time, scores (incl. 1H, period scores), `opening_spread`, `opening_total`, `closing_spread`, `closing_total`, `line_moved`, odds_api_id, ESPN id.
- Consensus builder output: capperCount, tier, per-pick contributing cappers.
- Caveat for all ROI/accuracy ideas: `/results` grading is being reworked by another workstream; sample-size caveats apply (see `MIN_SAMPLE`).

## 3. Recommended premium features

| # | Feature | Data source | Effort | Supported today? |
|---|---|---|---|---|
| 1 | **Capper-accuracy-weighted consensus** (weight each capper by shrunk historical ROI/win rate in that sport and market; show weighted score next to raw count) | `hb_capper_stats` (+`sport_records`), `hb_picks` history | M (2-4 days; needs shrinkage so tiny samples do not dominate, and backtest on graded history) | Yes for sport-level; market-level needs a query over graded `hb_picks` |
| 2 | **Per-pick "why" panel**: which cappers took it, each one's record in this sport and market, avg odds, streak | `hb_picks`, `hb_capper_stats.sport_records`, consensus contributors | S-M (1-3 days) | Yes (sport-level records exist; market-level via aggregate query) |
| 3 | **Line context: consensus line vs open/close/current** (did the market move toward or against the picked side; how much price did the group get) | `hb_games.opening_spread/total`, `closing_*`, `line_moved`; pick `line`/`odds` | M | Partial: opening/closing exist for games; no intraday snapshots, so "line movement alerts" are not supported. Closing-line value (CLV) per pick is supported after games close. |
| 4 | **ROI / record by market and sport** (spread vs ML vs totals vs props, per capper and for consensus tiers) | graded `hb_picks` | S (aggregate views) | Yes, subject to grading fixes in flight and sample thresholds |
| 5 | **Personal pick tracker / bankroll sheet**: user marks plays taken, units staked, running P/L vs consensus | new user table (shared Supabase, needs migration review) + `hb_picks` results | M-L | Data for results yes; needs new per-user storage |
| 6 | **Alerts** (email via Resend, already a dependency) when a pick crosses tier thresholds, or when a followed capper posts | consensus builder tiers, `hb_picks.created_at`, Resend | M | Tier-crossing: yes. Follow-capper: yes. Push/SMS: not present. Must read thresholds from one constant so copy stays accurate. |
| 7 | **Fade/public-heavy view with measured history**: when 5+ cappers agree, how did that tier actually perform (fade vs follow) | graded consensus history | S-M | Only once enough graded history; currently shown as a heuristic, so back it with data or label as unproven |
| 8 | **Capper comparison / filters**: sort cappers by ROI in a sport/market with minimum sample, exclude cold cappers from consensus | `hb_capper_stats`, `hb_picks` | S | Yes |
| 9 | **Games page enrichment**: per game, all picks with consensus side, opening vs closing line, final result | `hb_games` + `hb_picks` | S-M | Yes |
| 10 | **Exportable history (CSV)** of graded picks and personal results | `hb_picks` | S | Yes |

Suggested order (value per effort, data already supports it): 2, 4, 8, 1, then 3 (CLV), 6, 9. Hold 5, 7 until grading is trusted and a sample exists.

## 4. Guardrails for any Pro copy

- Describe only what is gated in code (table in section 1). Keep tier thresholds in one constant (TODO: the consensus workstream may change them) and reference it instead of typing numbers.
- Do not state a capper count; read it from `hb_cappers` or omit it.
- No profit, win-rate or "edge" claims; link to `/results` for the graded record and state past results do not guarantee future results.
