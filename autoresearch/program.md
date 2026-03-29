# autoresearch — Baseball Pick Optimization

Autonomous experiment loop for improving AI-generated sports picks.
Inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch).

## Setup

1. **Agree on a run tag**: propose a tag based on today's date (e.g. `mar29`).
2. **Read the in-scope files**:
   - `model.json` — the file you modify. All tunable parameters live here.
   - `backtest.mjs` — fixed evaluation. Runs model params against graded picks. Do not modify.
   - `program.md` — these instructions. Do not modify.
   - `../src/lib/ai-picks/engine.ts` — the pick engine that uses model.json at generation time.
3. **Verify data exists**: Run `node backtest.mjs --check` to confirm there are enough graded picks (need 30+ for meaningful results).
4. **Initialize results.tsv**: Create with header row if it doesn't exist.
5. **Confirm and go**.

## What You CAN Do

- Modify `model.json` — this is the ONLY file you edit. Everything is fair game:
  - `filters.*` — thresholds for which picks to include (K%, whiff%, edge%)
  - `confidence_weights.*` — how much each signal contributes to confidence score
  - `bet_type_weights.*` — relative weight for different bet types
  - `risk_controls.*` — how many picks, minimum confidence
  - `prompt_tuning.*` — Claude model, temperature, pick count targets

## What You CANNOT Do

- Modify `backtest.mjs`. It is read-only. It contains the fixed evaluation.
- Modify the graded picks data. The `ai_picks` table is ground truth.
- Install new packages or add dependencies.
- Modify the pick engine (`engine.ts`) — that consumes model.json at runtime.

## The Goal

**Get the highest win_pct on graded picks.** Since the backtest runs against historical data, you're optimizing the parameter set that would have produced the best results.

Secondary metrics (tracked but not the primary target):
- `roi` — return on investment (flat $10 per pick)
- `high_conf_pct` — win rate on confidence 7+ picks (the money picks)
- `sport_balance` — picks shouldn't cluster in one sport

## Simplicity Criterion

All else being equal, simpler is better. A small improvement that adds complexity to model.json is not worth it. Removing a filter and getting equal results? Keep — that's a simplification win.

## Output Format

`backtest.mjs` prints:

```
---
win_pct:        62.5
total_graded:   48
wins:           30
losses:         18
high_conf_pct:  71.4
roi:            +8.3
by_sport:       MLB:65.0 NBA:58.3 NHL:66.7
by_bet_type:    ML:60.0 K_OVER:72.7 SPREAD:55.6 OVER:58.3
by_confidence:  10:80.0 9:75.0 8:66.7 7:62.5 6:55.6 5:50.0
```

Extract the key metric: `grep "^win_pct:" backtest.log`

## Logging Results

Log every experiment to `results.tsv` (tab-separated):

```
timestamp	win_pct	high_conf_pct	status	description
```

1. ISO timestamp
2. win_pct achieved (e.g. 62.5) — use 0.0 for errors
3. high_conf_pct (win rate on 7+ confidence picks)
4. status: `keep`, `discard`, or `error`
5. short text description of what this experiment changed

Example:

```
timestamp	win_pct	high_conf_pct	status	description
2026-03-29T08:00:00Z	58.3	64.3	keep	baseline
2026-03-29T08:01:00Z	60.4	66.7	keep	lower min_whiff_pct from 25 to 22
2026-03-29T08:02:00Z	57.1	61.5	discard	raise min_consensus_cappers from 3 to 4
2026-03-29T08:03:00Z	61.2	71.4	keep	increase statcast_weight from 0.25 to 0.35
```

## The Experiment Loop

LOOP FOREVER:

1. Read current `model.json` parameters
2. Choose ONE parameter to tweak. Change it by a meaningful amount.
3. Run: `node backtest.mjs > backtest.log 2>&1`
4. Read results: `grep "^win_pct:\|^high_conf_pct:" backtest.log`
5. If grep is empty, something broke. Run `tail -n 30 backtest.log` and fix.
6. Record results in `results.tsv`
7. If win_pct improved → keep the change to model.json
8. If win_pct equal or worse → revert model.json to previous state
9. Go to step 1

## Strategy Ideas

When you run out of obvious tweaks, try these angles:

**Filter exploration:**
- What happens if you remove the chase% filter entirely?
- Does lowering min_edge_pct from 10 to 5 catch more winners?
- What if min_consensus_cappers is 2 instead of 3?

**Weight rebalancing:**
- Does Statcast data predict better than consensus? Try 0.45 statcast + 0.15 consensus
- Is BallparkPal sim data actually predictive? Try zeroing it out
- Do line value plays (closing line value) predict wins?

**Bet type focus:**
- Are K_OVER props the most predictive? Weight them higher
- Should NRFI/YRFI picks be excluded (hard to grade)?
- Do ML picks outperform spread picks?

**Confidence calibration:**
- Is confidence 8 actually better than confidence 6? Check by_confidence output
- Should the distribution shift toward fewer, higher-confidence picks?
- Does temperature 0.1 vs 0.5 change pick quality?

**NEVER STOP**: Once the loop begins, do NOT pause to ask if you should continue. Run indefinitely until manually stopped. If you run out of ideas, re-read the backtest output for patterns, try combining near-misses, or try more radical changes.
