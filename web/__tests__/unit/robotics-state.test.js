import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  addTeam,
  updateTeam,
  removeTeam,
  setMatchesPerTeam,
  canRegenerateMatchups,
  regenerateMatchups,
  recordQualificationResult,
  setQualificationNoShow,
  pinCurrentMatch,
  clearPinnedMatch,
  setTimelineConfig,
  formPlayoffAlliance,
  removePlayoffAlliance,
  setBracketConfig,
  setSeed,
  generateBracket,
  recordEliminationResult,
  resetResults,
  newTournament,
} from '../../robotics/state.js';

function withFourTeams(state) {
  let s = state;
  for (const name of ['Alpha', 'Bravo', 'Charlie', 'Delta']) {
    s = addTeam(s, { name, members: [] });
  }
  return s;
}

describe('team CRUD', () => {
  it('adds a team with a generated id', () => {
    const state = addTeam(createInitialState(), { name: 'Alpha', members: ['Ann'] });
    expect(state.teams).toHaveLength(1);
    expect(state.teams[0].name).toBe('Alpha');
    expect(state.teams[0].members).toEqual(['Ann']);
    expect(state.teams[0].id).toBeTruthy();
  });

  it('updates a team by id', () => {
    let state = addTeam(createInitialState(), { name: 'Alpha', members: [] });
    const id = state.teams[0].id;
    state = updateTeam(state, id, { name: 'Alpha Prime' });
    expect(state.teams[0].name).toBe('Alpha Prime');
  });

  it('removes a team by id', () => {
    let state = addTeam(createInitialState(), { name: 'Alpha', members: [] });
    const id = state.teams[0].id;
    state = removeTeam(state, id);
    expect(state.teams).toHaveLength(0);
  });

  it('does not mutate the original state object', () => {
    const original = createInitialState();
    addTeam(original, { name: 'Alpha', members: [] });
    expect(original.teams).toHaveLength(0);
  });
});

describe('regenerate matchups locking', () => {
  it('can regenerate when no qualification match is complete', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 2);
    expect(canRegenerateMatchups(state)).toBe(true);
    state = regenerateMatchups(state);
    expect(state.qualification.matches.length).toBeGreaterThan(0);
  });

  it('is locked once any qualification match is complete', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 2);
    state = regenerateMatchups(state);
    state = recordQualificationResult(state, 0, { scoreA: 10, scoreB: 5 });
    expect(canRegenerateMatchups(state)).toBe(false);
    expect(() => regenerateMatchups(state)).toThrow();
  });

  it('resetResults re-enables regeneration', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 2);
    state = regenerateMatchups(state);
    state = recordQualificationResult(state, 0, { scoreA: 10, scoreB: 5 });
    state = resetResults(state);
    expect(canRegenerateMatchups(state)).toBe(true);
    expect(state.teams).toHaveLength(4); // roster preserved
  });
});

describe('current match pinning', () => {
  it('pins a match index', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 3);
    state = regenerateMatchups(state);
    state = pinCurrentMatch(state, 1);
    expect(state.qualification.pinnedMatchIndex).toBe(1);
  });

  it('auto-clears the pin once the pinned match completes', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 3);
    state = regenerateMatchups(state);
    state = pinCurrentMatch(state, 1);
    state = recordQualificationResult(state, 1, { scoreA: 10, scoreB: 5 });
    expect(state.qualification.pinnedMatchIndex).toBeNull();
  });

  it('does not clear the pin when a different match completes', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 3);
    state = regenerateMatchups(state);
    state = pinCurrentMatch(state, 1);
    state = recordQualificationResult(state, 0, { scoreA: 10, scoreB: 5 });
    expect(state.qualification.pinnedMatchIndex).toBe(1);
  });

  it('clearPinnedMatch manually reverts to automatic mode', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 3);
    state = regenerateMatchups(state);
    state = pinCurrentMatch(state, 1);
    state = clearPinnedMatch(state);
    expect(state.qualification.pinnedMatchIndex).toBeNull();
  });
});

describe('no-show flag', () => {
  it('sets and clears a per-team no-show flag on a qualification match', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 2);
    state = regenerateMatchups(state);
    const teamId = state.qualification.matches[0].allianceA[0];
    state = setQualificationNoShow(state, 0, teamId, true);
    expect(state.qualification.matches[0].noShow[teamId]).toBe(true);
    state = setQualificationNoShow(state, 0, teamId, false);
    expect(state.qualification.matches[0].noShow[teamId]).toBeFalsy();
  });
});

describe('timeline config', () => {
  it('merges a partial patch into the existing timeline config', () => {
    let state = createInitialState();
    state = setTimelineConfig(state, { matchDurationMin: 5 });
    expect(state.timeline.matchDurationMin).toBe(5);
    expect(state.timeline.gapMin).toBe(createInitialState().timeline.gapMin);
  });
});

describe('playoff alliances and bracket generation', () => {
  it('forms a playoff alliance from two teams', () => {
    let state = withFourTeams(createInitialState());
    const [t1, t2] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t2.id);
    expect(state.elimination.alliances).toHaveLength(1);
    expect(state.elimination.alliances[0].teamIds).toEqual([t1.id, t2.id]);
  });

  it('throws when a team is already in a playoff alliance', () => {
    let state = withFourTeams(createInitialState());
    const [t1, t2, t3] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t2.id);
    expect(() => formPlayoffAlliance(state, t1.id, t3.id)).toThrow();
  });

  it('removes a playoff alliance, freeing its teams', () => {
    let state = withFourTeams(createInitialState());
    const [t1, t2, t3] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t2.id);
    const allianceId = state.elimination.alliances[0].id;
    state = removePlayoffAlliance(state, allianceId);
    state = formPlayoffAlliance(state, t1.id, t3.id); // t1 is free again
    expect(state.elimination.alliances).toHaveLength(1);
  });

  it('generates a bracket once bracketSize and all seeds are assigned', () => {
    let state = withFourTeams(createInitialState());
    const [t1, t2, t3, t4] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t2.id);
    state = formPlayoffAlliance(state, t3.id, t4.id);
    const [a1, a2] = state.elimination.alliances;
    state = setBracketConfig(state, { bracketSize: 2, includeThirdPlace: false });
    state = setSeed(state, 1, a1.id);
    state = setSeed(state, 2, a2.id);
    state = generateBracket(state);
    expect(state.elimination.bracket.matches.length).toBeGreaterThan(0);
  });

  it('throws when generating a bracket with unassigned seeds', () => {
    let state = withFourTeams(createInitialState());
    state = setBracketConfig(state, { bracketSize: 2, includeThirdPlace: false });
    expect(() => generateBracket(state)).toThrow();
  });

  it('throws when bracketSize is less than 2', () => {
    let state = withFourTeams(createInitialState());
    state = setBracketConfig(state, { bracketSize: 1, includeThirdPlace: false });
    expect(() => generateBracket(state)).toThrow();
  });

  it('throws when bracketSize is negative', () => {
    let state = withFourTeams(createInitialState());
    state = setBracketConfig(state, { bracketSize: -2, includeThirdPlace: false });
    expect(() => generateBracket(state)).toThrow();
  });

  it('records an elimination match result', () => {
    let state = withFourTeams(createInitialState());
    const [t1, t2, t3, t4] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t2.id);
    state = formPlayoffAlliance(state, t3.id, t4.id);
    const [a1, a2] = state.elimination.alliances;
    state = setBracketConfig(state, { bracketSize: 2, includeThirdPlace: false });
    state = setSeed(state, 1, a1.id);
    state = setSeed(state, 2, a2.id);
    state = generateBracket(state);
    const matchId = state.elimination.bracket.matches[0].id;
    state = recordEliminationResult(state, matchId, { scoreA: 80, scoreB: 20 });
    const match = state.elimination.bracket.matches.find((m) => m.id === matchId);
    expect(match.completed).toBe(true);
    expect(match.scoreA).toBe(80);
  });
});

describe('newTournament', () => {
  it('wipes everything, including the team roster', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 2);
    state = regenerateMatchups(state);
    state = newTournament(state);
    expect(state.teams).toHaveLength(0);
    expect(state.qualification.matches).toHaveLength(0);
  });
});
