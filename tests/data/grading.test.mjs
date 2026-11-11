/**
 * Pick grading — gradeConsensus() in src/lib/data/espn-scores.ts.
 * Pure function: no network, no DB. Scores are hand-built fixtures.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { gradeConsensus, getYesterdaysScores } = await import('../../src/lib/data/espn-scores.ts');
const { harness, quietly } = await import('../harness/helpers.mjs');

const game = (sport, homeTeam, homeScore, awayTeam, awayScore) => ({
  sport, homeTeam, awayTeam, homeScore, awayScore, totalScore: homeScore + awayScore,
  winner: homeScore > awayScore ? homeTeam : awayTeam, completed: true,
});

const NBA = [game('NBA', 'Lakers', 110, 'Celtics', 104)];
const MLB = [game('MLB', 'Yankees', 3, 'Red Sox', 5)];

test('moneyline: winner W, loser L (home and away)', () => {
  assert.equal(gradeConsensus({ bet: 'Lakers ML', betType: 'ML', sport: 'NBA' }, NBA), 'W');
  assert.equal(gradeConsensus({ bet: 'Celtics ML', betType: 'ML', sport: 'NBA' }, NBA), 'L');
});

test('moneyline tie → push', () => {
  assert.equal(gradeConsensus({ bet: 'Lakers ML', betType: 'ML', sport: 'NBA' }, [game('NBA', 'Lakers', 100, 'Celtics', 100)]), 'P');
});

test('spread: underdog +6.5 covers a 6-point loss; favourite -6.5 does not', () => {
  assert.equal(gradeConsensus({ bet: 'Celtics +6.5', betType: 'SPREAD', line: '+6.5', sport: 'NBA' }, NBA), 'W');
  assert.equal(gradeConsensus({ bet: 'Lakers -6.5', betType: 'SPREAD', line: '-6.5', sport: 'NBA' }, NBA), 'L');
});

test('spread: landing exactly on the number is a push', () => {
  assert.equal(gradeConsensus({ bet: 'Lakers -6', betType: 'SPREAD', line: '-6', sport: 'NBA' }, NBA), 'P');
  assert.equal(gradeConsensus({ bet: 'Celtics +6', betType: 'SPREAD', line: '+6', sport: 'NBA' }, NBA), 'P');
});

test('totals: over / under / push against the combined score (214)', () => {
  assert.equal(gradeConsensus({ bet: 'Lakers/Celtics Over 210.5', betType: 'OVER', sport: 'NBA' }, NBA), 'W');
  assert.equal(gradeConsensus({ bet: 'Lakers/Celtics Under 210.5', betType: 'UNDER', sport: 'NBA' }, NBA), 'L');
  assert.equal(gradeConsensus({ bet: 'Lakers/Celtics Over 214', betType: 'OVER', sport: 'NBA' }, NBA), 'P');
});

test('ungradeable picks return null (no game, wrong sport, unparseable total)', () => {
  assert.equal(gradeConsensus({ bet: 'Knicks ML', betType: 'ML', sport: 'NBA' }, NBA), null);
  assert.equal(gradeConsensus({ bet: 'Lakers ML', betType: 'ML', sport: 'NFL' }, NBA), null);
  assert.equal(gradeConsensus({ bet: 'Lakers Over lots', betType: 'OVER', sport: 'NBA' }, NBA), null);
});

test('team aliases resolve (NYY → Yankees)', () => {
  assert.equal(gradeConsensus({ bet: 'NYY ML', betType: 'ML', sport: 'MLB' }, MLB), 'L');
});

test('M2: an F5 (first five innings) moneyline must not be graded on the FULL-GAME score', () => {
    // Yankees led 3-0 after five innings, lost 3-5 overall. ESPN full-game data only.
    const r = gradeConsensus({ bet: 'Yankees F5 ML', betType: 'F5_ML', sport: 'MLB' }, MLB);
    assert.equal(r, null, `full-game-only data must leave an F5 pick ungraded, got ${r}`);
  });

test('M2: with a five-inning linescore, an F5 moneyline is graded on the first five innings', () => {
    const g = { ...MLB[0], homeScoreF5: 3, awayScoreF5: 0 }; // Yankees (home) led 3-0 after 5, lost 3-5
    assert.equal(gradeConsensus({ bet: 'Yankees F5 ML', betType: 'F5_ML', sport: 'MLB' }, [g]), 'W');
    assert.equal(gradeConsensus({ bet: 'Red Sox F5 ML', betType: 'F5_ML', sport: 'MLB' }, [g]), 'L');
    assert.equal(gradeConsensus({ bet: 'Yankees ML', betType: 'ML', sport: 'MLB' }, [g]), 'L', 'full-game ML unchanged');
  });

test('F5 moneyline tied after five innings → push (same convention as full-game ML)', () => {
  const g = { ...MLB[0], homeScoreF5: 2, awayScoreF5: 2 }; // tied 2-2 after 5, Red Sox won 5-3
  assert.equal(gradeConsensus({ bet: 'Yankees F5 ML', betType: 'F5_ML', sport: 'MLB' }, [g]), 'P');
  assert.equal(gradeConsensus({ bet: 'Red Sox F5 ML', betType: 'F5_ML', sport: 'MLB' }, [g]), 'P');
});

test('F5 moneyline with only ONE team F5 score is ungradeable (null), never full-game', () => {
  const homeOnly = { ...MLB[0], homeScoreF5: 3 };
  const awayOnly = { ...MLB[0], awayScoreF5: 0 };
  for (const g of [homeOnly, awayOnly]) {
    assert.equal(gradeConsensus({ bet: 'Yankees F5 ML', betType: 'F5_ML', sport: 'MLB' }, [g]), null);
    assert.equal(gradeConsensus({ bet: 'Red Sox F5 ML', betType: 'F5_ML', sport: 'MLB' }, [g]), null);
  }
});

// ESPN scoreboard parsing (offline: the harness answers the ESPN URL from a fixture).
// getYesterdaysScores() caches per process, so this is the only test in this file that calls it.
const innings = (...runs) => runs.map((value) => ({ value, displayValue: String(value) }));
const competitor = (homeAway, displayName, score, linescores) => ({
  homeAway, score: String(score), winner: false, team: { displayName }, linescores,
});
const MLB_SCOREBOARD = {
  events: [
    { competitions: [{ status: { type: { completed: true } }, competitors: [
      // Yankees 3-0 after five, lost 7-8: later innings must not leak into the F5 sum.
      competitor('home', 'New York Yankees', 7, innings(1, 0, 0, 2, 0, 3, 0, 1, 0)),
      competitor('away', 'Boston Red Sox', 8, innings(0, 0, 0, 0, 0, 4, 2, 0, 2)),
    ] }] },
    { competitions: [{ status: { type: { completed: true } }, competitors: [
      // Away side has only four innings of linescore → no F5 scores for either team.
      competitor('home', 'Los Angeles Dodgers', 4, innings(1, 1, 0, 0, 1, 0, 1, 0, 0)),
      competitor('away', 'San Francisco Giants', 2, innings(0, 2, 0, 0)),
    ] }] },
  ],
};

test('ESPN parsing: F5 = sum of innings 1-5 per team; < 5 innings for either team → F5 undefined', async () => {
  harness().fetchRoutes.set('https://site.api.espn.com/', async (url) => new Response(
    JSON.stringify(url.includes('/baseball/mlb/') ? MLB_SCOREBOARD : { events: [] }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  ));
  const scores = await quietly(() => getYesterdaysScores());
  const mlb = scores.filter((g) => g.sport === 'MLB');
  assert.equal(mlb.length, 2);

  const [full, short] = mlb;
  assert.equal(full.homeScore, 7);
  assert.equal(full.awayScore, 8);
  assert.equal(full.homeScoreF5, 3, 'home innings 1-5: 1+0+0+2+0');
  assert.equal(full.awayScoreF5, 0, 'away innings 1-5: 0+0+0+0+0');
  assert.equal(gradeConsensus({ bet: `${full.homeTeam} F5 ML`, betType: 'F5_ML', sport: 'MLB' }, [full]), 'W');
  assert.equal(gradeConsensus({ bet: `${full.homeTeam} ML`, betType: 'ML', sport: 'MLB' }, [full]), 'L');

  assert.equal(short.homeScore, 4);
  assert.equal(short.homeScoreF5, undefined);
  assert.equal(short.awayScoreF5, undefined);
  assert.equal('homeScoreF5' in short, false);
  assert.equal('awayScoreF5' in short, false);
  assert.equal(gradeConsensus({ bet: `${short.homeTeam} F5 ML`, betType: 'F5_ML', sport: 'MLB' }, [short]), null);
});
