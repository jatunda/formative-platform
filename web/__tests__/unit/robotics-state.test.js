import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  addTeam,
  updateTeam,
  removeTeam,
  setMatchesPerTeam,
  canRegenerateMatchups,
  regenerateMatchups,
  hasEvenMatchCounts,
  suggestEvenMatchesPerTeam,
  recordQualificationResult,
  setQualificationNoShow,
  setQualificationDraftScore,
  canMoveQualificationMatch,
  reorderQualificationMatch,
  setTimelineConfig,
  formPlayoffAlliance,
  removePlayoffAlliance,
  setBracketConfig,
  setSeed,
  generateBracket,
  recordEliminationResult,
  setEliminationNoShow,
  setEliminationDraftScore,
  resetResults,
  newTournament,
  getRevealedCount,
  getNextPlaceToReveal,
  getRevealedPlaces,
  revealNextPlacement,
  replayReveal,
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

describe('hasEvenMatchCounts', () => {
  it('is true when teamCount * matchesPerTeam divides evenly by 4', () => {
    expect(hasEvenMatchCounts(4, 3)).toBe(true);
    expect(hasEvenMatchCounts(6, 2)).toBe(true);
  });

  it('is false when it does not divide evenly', () => {
    expect(hasEvenMatchCounts(5, 3)).toBe(false);
    expect(hasEvenMatchCounts(6, 3)).toBe(false);
  });
});

describe('suggestEvenMatchesPerTeam', () => {
  it('suggests the nearest values (both directions) that would divide evenly', () => {
    expect(suggestEvenMatchesPerTeam(6, 3)).toEqual([2, 4]);
    expect(suggestEvenMatchesPerTeam(5, 3)).toEqual([4, 8]);
  });

  it('never suggests a value <= 0', () => {
    const suggestions = suggestEvenMatchesPerTeam(5, 1);
    expect(suggestions.every((n) => n > 0)).toBe(true);
  });

  it('respects the limit parameter', () => {
    expect(suggestEvenMatchesPerTeam(5, 3, 1)).toEqual([4]);
  });
});

describe('qualification match reordering', () => {
  it('swaps a not-yet-complete match with the next one down', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 3);
    state = regenerateMatchups(state);
    const [first, second] = state.qualification.matches;
    state = reorderQualificationMatch(state, 0, 1);
    expect(state.qualification.matches[0]).toBe(second);
    expect(state.qualification.matches[1]).toBe(first);
  });

  it('swaps a not-yet-complete match with the previous one up', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 3);
    state = regenerateMatchups(state);
    const [first, second] = state.qualification.matches;
    state = reorderQualificationMatch(state, 1, -1);
    expect(state.qualification.matches[0]).toBe(second);
    expect(state.qualification.matches[1]).toBe(first);
  });

  it('is a no-op at the start of the list moving up', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 3);
    state = regenerateMatchups(state);
    const matches = state.qualification.matches;
    state = reorderQualificationMatch(state, 0, -1);
    expect(state.qualification.matches).toEqual(matches);
  });

  it('is a no-op at the end of the list moving down', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 3);
    state = regenerateMatchups(state);
    const lastIndex = state.qualification.matches.length - 1;
    const matches = state.qualification.matches;
    state = reorderQualificationMatch(state, lastIndex, 1);
    expect(state.qualification.matches).toEqual(matches);
  });

  it('is a no-op when the match itself is already complete', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 3);
    state = regenerateMatchups(state);
    state = recordQualificationResult(state, 0, { scoreA: 10, scoreB: 5 });
    const matches = state.qualification.matches;
    state = reorderQualificationMatch(state, 0, 1);
    expect(state.qualification.matches).toEqual(matches);
  });

  it('is a no-op when the neighbor is already complete', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 3);
    state = regenerateMatchups(state);
    state = recordQualificationResult(state, 1, { scoreA: 10, scoreB: 5 });
    const matches = state.qualification.matches;
    state = reorderQualificationMatch(state, 0, 1);
    expect(state.qualification.matches).toEqual(matches);
  });

  it('canMoveQualificationMatch is false out of bounds', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 3);
    state = regenerateMatchups(state);
    expect(canMoveQualificationMatch(state.qualification.matches, 0, -1)).toBe(false);
    const lastIndex = state.qualification.matches.length - 1;
    expect(canMoveQualificationMatch(state.qualification.matches, lastIndex, 1)).toBe(false);
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

describe('qualification draft score', () => {
  it('writes a single score field without marking the match complete', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 2);
    state = regenerateMatchups(state);
    state = setQualificationDraftScore(state, 0, 'scoreA', 42);
    expect(state.qualification.matches[0].scoreA).toBe(42);
    expect(state.qualification.matches[0].completed).toBe(false);
  });

  it('survives a no-show toggle (on/off/on) on the same match', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 2);
    state = regenerateMatchups(state);
    const teamId = state.qualification.matches[0].allianceA[0];
    state = setQualificationDraftScore(state, 0, 'scoreA', 42);
    state = setQualificationDraftScore(state, 0, 'scoreB', 7);
    state = setQualificationNoShow(state, 0, teamId, true);
    expect(state.qualification.matches[0].scoreA).toBe(42);
    expect(state.qualification.matches[0].scoreB).toBe(7);
    state = setQualificationNoShow(state, 0, teamId, false);
    expect(state.qualification.matches[0].scoreA).toBe(42);
    state = setQualificationNoShow(state, 0, teamId, true);
    expect(state.qualification.matches[0].scoreA).toBe(42);
    expect(state.qualification.matches[0].scoreB).toBe(7);
  });
});

describe('timeline config', () => {
  it('merges a partial patch into the existing timeline config', () => {
    let state = createInitialState();
    state = setTimelineConfig(state, { matchDurationMin: 5 });
    expect(state.timeline.matchDurationMin).toBe(5);
    expect(state.timeline.gapMin).toBe(createInitialState().timeline.gapMin);
  });

  it('defaults estimatedThirdPlace to false', () => {
    expect(createInitialState().timeline.estimatedThirdPlace).toBe(false);
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

  it('forms a single-team playoff alliance when the same team id is passed twice', () => {
    let state = withFourTeams(createInitialState());
    const [t1] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t1.id);
    expect(state.elimination.alliances).toHaveLength(1);
    expect(state.elimination.alliances[0].teamIds).toEqual([t1.id]);
  });

  it('throws forming a single-team alliance for a team already in a playoff alliance', () => {
    let state = withFourTeams(createInitialState());
    const [t1, t2] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t2.id);
    expect(() => formPlayoffAlliance(state, t1.id, t1.id)).toThrow();
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

  it('persists an elimination draft score across a no-show toggle (on/off/on), on either side', () => {
    let state = withFourTeams(createInitialState());
    const [t1, t2, t3, t4] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t2.id);
    state = formPlayoffAlliance(state, t3.id, t4.id);
    const [a1, a2] = state.elimination.alliances;
    state = setBracketConfig(state, { bracketSize: 2, includeThirdPlace: false });
    state = setSeed(state, 1, a1.id);
    state = setSeed(state, 2, a2.id);
    state = generateBracket(state);
    const matchId = state.elimination.bracket.matches.find((m) => !m.isBye).id;

    state = setEliminationDraftScore(state, matchId, 'scoreA', 80);
    state = setEliminationDraftScore(state, matchId, 'scoreB', 20);
    let match = state.elimination.bracket.matches.find((m) => m.id === matchId);
    expect(match.completed).toBe(false);

    state = setEliminationNoShow(state, matchId, t4.id, true);
    match = state.elimination.bracket.matches.find((m) => m.id === matchId);
    expect(match.scoreA).toBe(80);
    expect(match.scoreB).toBe(20);

    state = setEliminationNoShow(state, matchId, t4.id, false);
    state = setEliminationNoShow(state, matchId, t4.id, true);
    match = state.elimination.bracket.matches.find((m) => m.id === matchId);
    expect(match.scoreA).toBe(80);
    expect(match.scoreB).toBe(20);
    expect(match.completed).toBe(false);
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

describe('Podium reveal', () => {
  /** Two (or four, with a Third-Place Match) single-Team Playoff Alliances in a generated bracket. */
  function withBracket({ size = 2, includeThirdPlace = false } = {}) {
    let s = createInitialState();
    for (let i = 0; i < size; i++) s = addTeam(s, { name: `T${i}`, members: [] });
    s.teams.forEach((t) => { s = formPlayoffAlliance(s, t.id, t.id); });
    s = setBracketConfig(s, { bracketSize: size, includeThirdPlace });
    s.elimination.alliances.forEach((a, i) => { s = setSeed(s, i + 1, a.id); });
    return generateBracket(s);
  }

  function completeAll(state) {
    let s = state;
    for (const m of s.elimination.bracket.matches) s = recordEliminationResult(s, m.id, { scoreA: 9, scoreB: 1 });
    return s;
  }

  it('starts with nothing revealed, including for a state saved before reveal progress existed', () => {
    expect(getRevealedCount(createInitialState())).toBe(0);
    const { podium, ...legacy } = createInitialState();
    expect(getRevealedCount(legacy)).toBe(0);
  });

  it('does nothing while the bracket is not complete', () => {
    const s = withBracket();
    expect(revealNextPlacement(s)).toBe(s);
    expect(revealNextPlacement(createInitialState())).toEqual(createInitialState());
  });

  it('reveals 3rd, then 2nd, then 1st, and stops there', () => {
    let s = completeAll(withBracket({ size: 4, includeThirdPlace: true }));
    expect([...getRevealedPlaces(s)]).toEqual([]);
    s = revealNextPlacement(s);
    expect([...getRevealedPlaces(s)]).toEqual([3]);
    s = revealNextPlacement(s);
    expect([...getRevealedPlaces(s)]).toEqual([3, 2]);
    s = revealNextPlacement(s);
    expect([...getRevealedPlaces(s)]).toEqual([3, 2, 1]);
    s = revealNextPlacement(s);
    expect(getRevealedCount(s)).toBe(3);
  });

  it('skips 3rd when there is no Third-Place Match', () => {
    let s = completeAll(withBracket());
    s = revealNextPlacement(s);
    expect([...getRevealedPlaces(s)]).toEqual([2]);
    s = revealNextPlacement(revealNextPlacement(s));
    expect([...getRevealedPlaces(s)]).toEqual([2, 1]);
  });

  it('reveals nothing on the Podium while the bracket is not complete, whatever the stored step', () => {
    // An undecided bracket has no Placements, so its key is '' - only the completeness check stops this.
    const s = { ...withBracket(), podium: { revealedCount: 2, revealedFor: '' } };
    expect([...getRevealedPlaces(s)]).toEqual([]);
  });

  it('replayReveal re-covers every block', () => {
    let s = revealNextPlacement(revealNextPlacement(completeAll(withBracket())));
    s = replayReveal(s);
    expect(getRevealedCount(s)).toBe(0);
    expect([...getRevealedPlaces(s)]).toEqual([]);
  });

  it('names the next place to reveal, or null once all are revealed or while undecided', () => {
    expect(getNextPlaceToReveal(withBracket())).toBeNull();
    let s = completeAll(withBracket({ size: 4, includeThirdPlace: true }));
    expect(getNextPlaceToReveal(s)).toBe(3);
    s = revealNextPlacement(revealNextPlacement(s));
    expect(getNextPlaceToReveal(s)).toBe(1);
    expect(getNextPlaceToReveal(revealNextPlacement(s))).toBeNull();
  });

  it('re-covers the Podium when an edited result changes the Placements', () => {
    let s = revealNextPlacement(revealNextPlacement(completeAll(withBracket())));
    const finalId = s.elimination.bracket.matches.find((m) => m.round === 'final').id;
    s = recordEliminationResult(s, finalId, { scoreA: 1, scoreB: 9 });
    expect(getRevealedCount(s)).toBe(0);
    expect([...getRevealedPlaces(s)]).toEqual([]);
  });

  it('keeps the reveal when an edit leaves the Placements unchanged', () => {
    let s = revealNextPlacement(completeAll(withBracket()));
    const finalId = s.elimination.bracket.matches.find((m) => m.round === 'final').id;
    s = recordEliminationResult(s, finalId, { scoreA: 7, scoreB: 2 });
    expect([...getRevealedPlaces(s)]).toEqual([2]);
  });

  it('regenerating the bracket clears reveal progress', () => {
    const s = revealNextPlacement(completeAll(withBracket()));
    expect(generateBracket(s).podium.revealedCount).toBe(0);
  });

  it('Reset Results and New Tournament clear reveal progress', () => {
    const s = revealNextPlacement(completeAll(withBracket()));
    expect(getRevealedCount(resetResults(s))).toBe(0);
    expect(getRevealedCount(newTournament(s))).toBe(0);
  });
});
