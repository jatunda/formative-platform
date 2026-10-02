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
});
