import { describe, it, expect } from 'vitest';
import {
  getAllianceCaptain,
  getSelectionRowStatus,
  getAllianceSelectionBlockReason,
} from '../../robotics/alliance-selection.js';
import {
  createInitialState,
  addTeam,
  setMatchesPerTeam,
  regenerateMatchups,
  recordQualificationResult,
  formPlayoffAlliance,
  removePlayoffAlliance,
} from '../../robotics/state.js';
import { computeStandings } from '../../robotics/standings.js';

function withTeams(names) {
  let s = createInitialState();
  for (const name of names) s = addTeam(s, { name, members: [] });
  return s;
}

const idOf = (state, name) => state.teams.find((t) => t.name === name).id;

/** Four Teams with a played Qualification Round, so Standings have a definite order. */
function withPlayedQualification() {
  let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']);
  s = setMatchesPerTeam(s, 2);
  s = regenerateMatchups(s, { random: () => 0.5 });
  s.qualification.matches.forEach((_, i) => {
    s = recordQualificationResult(s, i, { scoreA: 10 + i, scoreB: 3 * i });
  });
  return s;
}

const rankedTeamIds = (s) => computeStandings(s.teams, s.qualification.matches).map((e) => e.teamId);

describe('getAllianceCaptain', () => {
  it('is null with no Teams', () => {
    expect(getAllianceCaptain(createInitialState())).toBeNull();
  });

  it('is the top-ranked Team in Standings while no alliances exist', () => {
    const s = withPlayedQualification();
    expect(getAllianceCaptain(s)).toBe(rankedTeamIds(s)[0]);
  });

  it('skips Teams already in a Playoff Alliance', () => {
    let s = withPlayedQualification();
    const [first, , third] = rankedTeamIds(s);
    s = formPlayoffAlliance(s, first, third);
    expect(getAllianceCaptain(s)).toBe(rankedTeamIds(s)[1]);
  });

  it('is recomputed when an alliance is removed', () => {
    let s = withPlayedQualification();
    const [first, second] = rankedTeamIds(s);
    s = formPlayoffAlliance(s, first, second);
    s = removePlayoffAlliance(s, s.elimination.alliances[0].id);
    expect(getAllianceCaptain(s)).toBe(first);
  });

  it('is null once every Team is in a Playoff Alliance', () => {
    let s = withTeams(['Alpha', 'Bravo']);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    expect(getAllianceCaptain(s)).toBeNull();
  });
});

describe('getSelectionRowStatus', () => {
  it('marks the Captain, Teams in alliances with their alliance number, and everyone else available', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
    // No matches played, so Standings keep roster order.
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Delta'));
    s = formPlayoffAlliance(s, idOf(s, 'Bravo'), idOf(s, 'Bravo'));
    expect(getSelectionRowStatus(s, idOf(s, 'Alpha'))).toEqual({ status: 'in-alliance', allianceNumber: 1 });
    expect(getSelectionRowStatus(s, idOf(s, 'Delta'))).toEqual({ status: 'in-alliance', allianceNumber: 1 });
    expect(getSelectionRowStatus(s, idOf(s, 'Bravo'))).toEqual({ status: 'in-alliance', allianceNumber: 2 });
    expect(getSelectionRowStatus(s, idOf(s, 'Charlie'))).toEqual({ status: 'captain' });
    expect(getSelectionRowStatus(s, idOf(s, 'Echo'))).toEqual({ status: 'available' });
  });

  it('numbers alliances by their position in the list (their Seed)', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    s = formPlayoffAlliance(s, idOf(s, 'Charlie'), idOf(s, 'Delta'));
    s = removePlayoffAlliance(s, s.elimination.alliances[0].id);
    expect(getSelectionRowStatus(s, idOf(s, 'Charlie'))).toEqual({ status: 'in-alliance', allianceNumber: 1 });
  });
});

describe('getAllianceSelectionBlockReason', () => {
  const START_FINALS_MESSAGE = 'Form at least 2 alliances before starting the Finals.';

  it('blocks Start Finals with fewer than 2 alliances', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    expect(getAllianceSelectionBlockReason(s, 'start-finals')).toBe(START_FINALS_MESSAGE);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    expect(getAllianceSelectionBlockReason(s, 'start-finals')).toBe(START_FINALS_MESSAGE);
  });

  it('allows Start Finals with 2 or more alliances', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    s = formPlayoffAlliance(s, idOf(s, 'Charlie'), idOf(s, 'Delta'));
    expect(getAllianceSelectionBlockReason(s, 'start-finals')).toBeNull();
  });

  it('allows every other action for now', () => {
    const s = createInitialState();
    for (const action of ['pick', 'move', 'remove']) {
      expect(getAllianceSelectionBlockReason(s, action)).toBeNull();
    }
  });
});
