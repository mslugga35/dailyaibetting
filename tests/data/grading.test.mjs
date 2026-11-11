/**
 * Pick grading — gradeConsensus() in src/lib/data/espn-scores.ts.
 * Pure function: no network, no DB. Scores are hand-built fixtures.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { gradeConsensus } = await import('../../src/lib/data/espn-scores.ts');

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

test('M2: an F5 (first five innings) moneyline must not be graded on the FULL-GAME score',
  { todo: 'OPEN M2 — P0-DATA-1 grade F5 on 5-inning linescore, or return null when it is unavailable' }, () => {
    // Yankees led 3-0 after five innings, lost 3-5 overall. ESPN full-game data only.
    const r = gradeConsensus({ bet: 'Yankees F5 ML', betType: 'F5_ML', sport: 'MLB' }, MLB);
    assert.equal(r, null, `full-game-only data must leave an F5 pick ungraded, got ${r}`);
  });

test('M2: with a five-inning linescore, an F5 moneyline is graded on the first five innings',
  { todo: 'OPEN M2 — P0-DATA-1 contract: GameResult gains homeScoreF5/awayScoreF5' }, () => {
    const g = { ...MLB[0], homeScoreF5: 3, awayScoreF5: 0 }; // Yankees (home) led 3-0 after 5, lost 3-5
    assert.equal(gradeConsensus({ bet: 'Yankees F5 ML', betType: 'F5_ML', sport: 'MLB' }, [g]), 'W');
    assert.equal(gradeConsensus({ bet: 'Red Sox F5 ML', betType: 'F5_ML', sport: 'MLB' }, [g]), 'L');
    assert.equal(gradeConsensus({ bet: 'Yankees ML', betType: 'ML', sport: 'MLB' }, [g]), 'L', 'full-game ML unchanged');
  });
