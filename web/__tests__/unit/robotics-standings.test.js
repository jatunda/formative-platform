import { describe, it, expect } from 'vitest';
import { computeStandings } from '../../robotics/standings.js';

const teams = [
  { id: 't1', name: 'Alpha' },
  { id: 't2', name: 'Bravo' },
  { id: 't3', name: 'Charlie' },
  { id: 't4', name: 'Delta' },
];

function match({ allianceA, allianceB, scoreA, scoreB, completed = true, noShow = {} }) {
  return { allianceA, allianceB, scoreA, scoreB, completed, noShow };
}

describe('computeStandings', () => {
  it('ranks teams by wins first', () => {
    const matches = [
      match({ allianceA: ['t1', 't2'], allianceB: ['t3', 't4'], scoreA: 50, scoreB: 20 }),
    ];
    const standings = computeStandings(teams, matches);
    const byId = Object.fromEntries(standings.map((s) => [s.teamId, s]));
    expect(byId.t1.wins).toBe(1);
    expect(byId.t1.losses).toBe(0);
    expect(byId.t3.wins).toBe(0);
    expect(byId.t3.losses).toBe(1);
  });

  it('breaks ties by cumulative points', () => {
    const matches = [
      match({ allianceA: ['t1', 't2'], allianceB: ['t3', 't4'], scoreA: 50, scoreB: 20 }),
      match({ allianceA: ['t1', 't3'], allianceB: ['t2', 't4'], scoreA: 10, scoreB: 100 }),
    ];
    // t1: 1 win (50 pts) + 1 loss (10 pts) = 1-1, 60 pts
    // t2: 1 loss (20 pts) + 1 win (100 pts) = 1-1, 120 pts -> ranks above t1
    const standings = computeStandings(teams, matches);
    const t1Index = standings.findIndex((s) => s.teamId === 't1');
    const t2Index = standings.findIndex((s) => s.teamId === 't2');
    expect(t2Index).toBeLessThan(t1Index);
  });

  it('ignores incomplete matches', () => {
    const matches = [
      match({ allianceA: ['t1', 't2'], allianceB: ['t3', 't4'], scoreA: 50, scoreB: 20, completed: false }),
    ];
    const standings = computeStandings(teams, matches);
    const byId = Object.fromEntries(standings.map((s) => [s.teamId, s]));
    expect(byId.t1.wins).toBe(0);
    expect(byId.t1.losses).toBe(0);
    expect(byId.t1.points).toBe(0);
  });

  it('a No-Show counts as a loss for just that team, partner can still win', () => {
    const matches = [
      match({
        allianceA: ['t1', 't2'],
        allianceB: ['t3', 't4'],
        scoreA: 50,
        scoreB: 0,
        noShow: { t2: true },
      }),
    ];
    const standings = computeStandings(teams, matches);
    const byId = Object.fromEntries(standings.map((s) => [s.teamId, s]));
    expect(byId.t1.wins).toBe(1);
    expect(byId.t1.losses).toBe(0);
    expect(byId.t2.wins).toBe(0);
    expect(byId.t2.losses).toBe(1);
  });

  it('includes every team even with zero matches played', () => {
    const standings = computeStandings(teams, []);
    expect(standings).toHaveLength(4);
    expect(standings.every((s) => s.wins === 0 && s.losses === 0 && s.points === 0)).toBe(true);
  });

  it('a tied score counts as neither a win nor a loss for either side', () => {
    const matches = [
      match({ allianceA: ['t1', 't2'], allianceB: ['t3', 't4'], scoreA: 30, scoreB: 30 }),
    ];
    const standings = computeStandings(teams, matches);
    const byId = Object.fromEntries(standings.map((s) => [s.teamId, s]));
    expect(byId.t1.wins).toBe(0);
    expect(byId.t1.losses).toBe(0);
    expect(byId.t1.points).toBe(30);
  });

  it('tracks matchesPlayed per team and stays in "raw" mode when counts are equal', () => {
    const matches = [
      match({ allianceA: ['t1', 't2'], allianceB: ['t3', 't4'], scoreA: 50, scoreB: 20 }),
      match({ allianceA: ['t1', 't3'], allianceB: ['t2', 't4'], scoreA: 10, scoreB: 100 }),
    ];
    const standings = computeStandings(teams, matches);
    const byId = Object.fromEntries(standings.map((s) => [s.teamId, s]));
    expect(byId.t1.matchesPlayed).toBe(2);
    expect(byId.t4.matchesPlayed).toBe(2);
    expect(standings.every((s) => s.rankingMode === 'raw')).toBe(true);
  });

  it('a team with zero matches played does not force "rate" mode', () => {
    const matches = [
      match({ allianceA: ['t1', 't2'], allianceB: ['t3', 't4'], scoreA: 50, scoreB: 20 }),
      match({ allianceA: ['t1', 't2'], allianceB: ['t3', 't4'], scoreA: 40, scoreB: 10 }),
    ];
    // t1/t2/t3/t4 all play the same two matches; a 5th team exists but never plays.
    const teamsWithBench = [...teams, { id: 't5', name: 'Echo' }];
    const standings = computeStandings(teamsWithBench, matches);
    expect(standings.every((s) => s.rankingMode === 'raw')).toBe(true);
    const bench = standings.find((s) => s.teamId === 't5');
    expect(bench.matchesPlayed).toBe(0);
    expect(bench.winRate).toBe(0);
  });

  it('ranks by win percentage over raw wins when match counts are uneven', () => {
    // 6 teams so different matches can feature different subsets - with only 4
    // teams, every 2v2 match necessarily includes all of them every time.
    const sixTeams = [...teams, { id: 't5', name: 'Echo' }, { id: 't6', name: 'Foxtrot' }];
    const matches = [
      match({ allianceA: ['t1', 't2'], allianceB: ['t3', 't4'], scoreA: 50, scoreB: 20 }),
      match({ allianceA: ['t1', 't2'], allianceB: ['t5', 't6'], scoreA: 10, scoreB: 100 }),
      match({ allianceA: ['t1', 't2'], allianceB: ['t3', 't4'], scoreA: 60, scoreB: 0 }),
    ];
    const standings = computeStandings(sixTeams, matches);
    const byId = Object.fromEntries(standings.map((s) => [s.teamId, s]));
    // t1/t2 played all 3 (2W-1L); t3/t4 played 2 (0W-2L); t5/t6 played 1 (1W-0L) - uneven.
    expect(byId.t1.matchesPlayed).toBe(3);
    expect(byId.t3.matchesPlayed).toBe(2);
    expect(byId.t5.matchesPlayed).toBe(1);
    expect(standings.every((s) => s.rankingMode === 'rate')).toBe(true);

    // t5/t6 win rate = 1/1 = 1.0 beats t1/t2's 2/3 ≈ 0.667, even though t1/t2 have
    // more raw wins (2 vs 1) - this is exactly what raw-wins ranking would get wrong.
    const t5Index = standings.findIndex((s) => s.teamId === 't5');
    const t1Index = standings.findIndex((s) => s.teamId === 't1');
    expect(t5Index).toBeLessThan(t1Index);
    expect(byId.t5.winRate).toBeCloseTo(1);
    expect(byId.t1.winRate).toBeCloseTo(2 / 3);
  });

  it('breaks rate-mode win-percentage ties by average points per match', () => {
    const sixTeams = [...teams, { id: 't5', name: 'Echo' }, { id: 't6', name: 'Foxtrot' }];
    const matches = [
      // t1 and t3 both go 1-0 (win rate 1.0), but t1 wins by a lot more.
      match({ allianceA: ['t1', 't3'], allianceB: ['t4', 't5'], scoreA: 90, scoreB: 0 }),
      match({ allianceA: ['t2', 't3'], allianceB: ['t4', 't6'], scoreA: 50, scoreB: 0 }),
    ];
    const standings = computeStandings(sixTeams, matches);
    const byId = Object.fromEntries(standings.map((s) => [s.teamId, s]));
    // t4 played twice (0W-2L) while t1/t2/t5/t6 played once each - uneven match counts.
    expect(byId.t4.matchesPlayed).toBe(2);
    expect(byId.t1.matchesPlayed).toBe(1);
    expect(standings.every((s) => s.rankingMode === 'rate')).toBe(true);

    // t1 (1-0, 90 pts) and t3 (2-0, 140 pts over 2 matches = 70 avg) and t2 (1-0, 50 pts)
    // all have a 1.0 win rate; ranked by avg points per match: t1 (90) > t3 (70) > t2 (50).
    expect(byId.t1.winRate).toBeCloseTo(1);
    expect(byId.t3.winRate).toBeCloseTo(1);
    expect(byId.t2.winRate).toBeCloseTo(1);
    expect(byId.t1.avgPoints).toBeCloseTo(90);
    expect(byId.t3.avgPoints).toBeCloseTo(70);
    expect(byId.t2.avgPoints).toBeCloseTo(50);
    const t1Index = standings.findIndex((s) => s.teamId === 't1');
    const t3Index = standings.findIndex((s) => s.teamId === 't3');
    const t2Index = standings.findIndex((s) => s.teamId === 't2');
    expect(t1Index).toBeLessThan(t3Index);
    expect(t3Index).toBeLessThan(t2Index);
  });
});
