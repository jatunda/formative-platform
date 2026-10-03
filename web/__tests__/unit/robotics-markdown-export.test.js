import { describe, it, expect } from 'vitest';
import { exportStandingsMarkdown, exportMatchesMarkdown, exportRosterMarkdown, exportPlacementsMarkdown } from '../../robotics/markdown-export.js';

const teams = [
  { id: 't1', name: 'Alpha', members: ['Ann', 'Al'] },
  { id: 't2', name: 'Bravo', members: ['Bea'] },
];

describe('exportStandingsMarkdown', () => {
  it('renders a markdown table with rank, team, record, and points', () => {
    const standings = [
      { teamId: 't1', wins: 2, losses: 0, points: 120 },
      { teamId: 't2', wins: 0, losses: 2, points: 40 },
    ];
    const md = exportStandingsMarkdown(standings, teams);
    expect(md).toContain('| Rank | Team | W-L | Points |');
    expect(md).toContain('| 1 | Alpha | 2-0 | 120 |');
    expect(md).toContain('| 2 | Bravo | 0-2 | 40 |');
  });
});

describe('exportMatchesMarkdown', () => {
  it('renders one line per match with teams and score', () => {
    const matches = [
      { allianceA: ['t1'], allianceB: ['t2'], scoreA: 50, scoreB: 20, completed: true, scheduledTime: 0 },
    ];
    const md = exportMatchesMarkdown(matches, teams);
    expect(md).toContain('Alpha');
    expect(md).toContain('Bravo');
    expect(md).toContain('50');
    expect(md).toContain('20');
  });

  it('marks not-yet-played matches distinctly from completed ones', () => {
    const matches = [
      { allianceA: ['t1'], allianceB: ['t2'], scoreA: null, scoreB: null, completed: false, scheduledTime: 0 },
    ];
    const md = exportMatchesMarkdown(matches, teams);
    expect(md).not.toMatch(/null/);
  });
});

describe('exportRosterMarkdown', () => {
  it('renders one line per team with members comma-separated', () => {
    const md = exportRosterMarkdown(teams);
    expect(md).toContain('Alpha: Ann, Al');
    expect(md).toContain('Bravo: Bea');
  });

  it('handles a team with no members', () => {
    const md = exportRosterMarkdown([{ id: 't3', name: 'Charlie', members: [] }]);
    expect(md).toContain('Charlie:');
  });
});

describe('exportPlacementsMarkdown', () => {
  it('renders each decided place with every team\'s name and members listed underneath', () => {
    const placements = [
      { place: 1, teamIds: ['t1'] },
      { place: 2, teamIds: ['t2'] },
    ];
    const md = exportPlacementsMarkdown(placements, teams);
    expect(md).toContain('1st Place:');
    expect(md).toContain('Alpha');
    expect(md).toContain('Members: Ann, Al');
    expect(md).toContain('2nd Place:');
    expect(md).toContain('Bravo');
    expect(md).toContain('Members: Bea');
  });

  it('lists every team in a multi-team alliance placement', () => {
    const placements = [{ place: 3, teamIds: ['t1', 't2'] }];
    const md = exportPlacementsMarkdown(placements, teams);
    expect(md).toContain('3rd Place:');
    expect(md).toContain('Alpha');
    expect(md).toContain('Bravo');
  });

  it('returns an empty string when no placements are decided', () => {
    expect(exportPlacementsMarkdown([], teams)).toBe('');
  });
});
