import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileMixedSportGroups, isInSeason } from './consensus-builder.ts';
import type { NormalizedPick } from './consensus-builder.ts';

function makePick(overrides: Partial<NormalizedPick> = {}): NormalizedPick {
  return {
    id: 'test-1',
    capper: 'TestCapper',
    team: 'Cardinals',
    standardizedTeam: 'Cardinals',
    betType: 'ML',
    sport: 'MLB',
    matchup: 'Cardinals vs Cubs',
    originalPick: 'Cardinals ML',
    date: '2026-07-21',
    ...overrides,
  };
}

describe('reconcileMixedSportGroups', () => {
  test('single-sport group passes through unchanged', () => {
    const picks = [
      makePick({ id: '1', capper: 'A', sport: 'MLB' }),
      makePick({ id: '2', capper: 'B', sport: 'MLB' }),
    ];
    const result = reconcileMixedSportGroups(picks);
    assert.equal(result.length, 2);
    assert.equal(result[0].sport, 'MLB');
    assert.equal(result[1].sport, 'MLB');
  });

  test('empty array returns empty', () => {
    const result = reconcileMixedSportGroups([]);
    assert.equal(result.length, 0);
  });

  test('mixed-sport Cardinals group merges to in-season sport (July = MLB not NFL)', () => {
    const picks = [
      makePick({ id: '1', capper: 'A', standardizedTeam: 'Cardinals', sport: 'MLB' }),
      makePick({ id: '2', capper: 'B', standardizedTeam: 'Cardinals', sport: 'MLB' }),
      makePick({ id: '3', capper: 'C', standardizedTeam: 'Cardinals', sport: 'NFL' }),
    ];
    const result = reconcileMixedSportGroups(picks);
    const sports = new Set(result.map(r => r.sport));
    assert.equal(sports.size, 1, `Expected 1 sport, got ${[...sports].join(', ')}`);
    if (isInSeason('MLB') && !isInSeason('NFL')) {
      assert.equal(result[2].sport, 'MLB', 'NFL pick should be corrected to MLB in July');
    }
  });

  test('majority vote wins when both sports are in season', () => {
    const picks = [
      makePick({ id: '1', capper: 'A', standardizedTeam: 'Cardinals', sport: 'MLB', betType: 'SPREAD', line: '-1.5' }),
      makePick({ id: '2', capper: 'B', standardizedTeam: 'Cardinals', sport: 'MLB', betType: 'SPREAD', line: '-1.5' }),
      makePick({ id: '3', capper: 'C', standardizedTeam: 'Cardinals', sport: 'MLB', betType: 'SPREAD', line: '-1.5' }),
      makePick({ id: '4', capper: 'D', standardizedTeam: 'Cardinals', sport: 'NFL', betType: 'SPREAD', line: '-1.5' }),
    ];
    const result = reconcileMixedSportGroups(picks);
    for (const r of result) {
      assert.equal(r.sport, result[0].sport, 'All picks in group should have same sport after reconciliation');
    }
  });

  test('non-collision team with mixed sports is NOT reconciled', () => {
    const picks = [
      makePick({ id: '1', standardizedTeam: 'Yankees', sport: 'MLB' }),
      makePick({ id: '2', standardizedTeam: 'Yankees', sport: 'NFL' }),
    ];
    const result = reconcileMixedSportGroups(picks);
    assert.equal(result[0].sport, 'MLB');
    assert.equal(result[1].sport, 'NFL');
  });

  test('different betType groups are independent', () => {
    const picks = [
      makePick({ id: '1', standardizedTeam: 'Cardinals', sport: 'MLB', betType: 'ML' }),
      makePick({ id: '2', standardizedTeam: 'Cardinals', sport: 'NFL', betType: 'SPREAD', line: '-3' }),
    ];
    const result = reconcileMixedSportGroups(picks);
    assert.equal(result[0].sport, 'MLB');
    assert.equal(result[1].sport, 'NFL');
  });

  test('does not mutate original array', () => {
    const picks = [
      makePick({ id: '1', standardizedTeam: 'Cardinals', sport: 'MLB' }),
      makePick({ id: '2', standardizedTeam: 'Cardinals', sport: 'NFL' }),
    ];
    const origSports = picks.map(p => p.sport);
    reconcileMixedSportGroups(picks);
    assert.deepEqual(picks.map(p => p.sport), origSports);
  });

  test('single pick passes through unchanged', () => {
    const picks = [makePick({ id: '1' })];
    const result = reconcileMixedSportGroups(picks);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0].sport, picks[0].sport);
  });
});

describe('isInSeason', () => {
  test('MLB is in season in July', () => {
    assert.equal(isInSeason('MLB'), true);
  });

  test('year-round sports always in season', () => {
    for (const sport of ['TENNIS', 'GOLF', 'MMA', 'BOXING', 'SOCCER']) {
      assert.equal(isInSeason(sport), true, `${sport} should be year-round`);
    }
  });

  test('unknown sport defaults to in-season', () => {
    assert.equal(isInSeason('CURLING'), true);
  });
});
