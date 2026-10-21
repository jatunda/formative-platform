import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  addTeam,
  updateTeam,
  removeTeam,
  getRosterBlockReason,
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
  applyMatchTimeline,
  formPlayoffAlliance,
  removePlayoffAlliance,
  setBracketConfig,
  movePlayoffAlliance,
  declineTeam,
  undoDecline,
  startFinals,
  discardBracket,
  upgradeSavedTournament,
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
  playoffAllianceTeamIds,
  getAllMatchesInScheduleOrder,
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

describe('roster lock', () => {
  function withDrawnMatches() {
    return regenerateMatchups(setMatchesPerTeam(withFourTeams(createInitialState()), 2));
  }

  it('is unlocked before the Pairing Draw', () => {
    expect(getRosterBlockReason(withFourTeams(createInitialState()))).toBeNull();
  });

  it('locks once the Pairing Draw has produced Qualification Matches, pointing at Reset Results', () => {
    expect(getRosterBlockReason(withDrawnMatches())).toContain('Reset Results');
  });

  it('addTeam and removeTeam no-op while locked', () => {
    const state = withDrawnMatches();
    expect(addTeam(state, { name: 'Echo' })).toBe(state);
    expect(removeTeam(state, state.teams[0].id)).toBe(state);
  });

  it('still allows renaming a Team and editing its Members while locked', () => {
    let state = withDrawnMatches();
    const id = state.teams[0].id;
    state = updateTeam(state, id, { name: 'Alpha Prime', members: ['Ann'] });
    expect(state.teams[0]).toMatchObject({ name: 'Alpha Prime', members: ['Ann'] });
  });

  it('Reset Results and New Tournament unlock it', () => {
    const state = withDrawnMatches();
    expect(getRosterBlockReason(resetResults(state))).toBeNull();
    expect(getRosterBlockReason(newTournament(state))).toBeNull();
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

  it('stops at the lower value when it alone fills the limit', () => {
    expect(suggestEvenMatchesPerTeam(4, 3, 1)).toEqual([2]);
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

  it('no-ops on an unmatched qualification matchIndex instead of throwing', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 2);
    state = regenerateMatchups(state);
    const teamId = state.qualification.matches[0].allianceA[0];
    expect(() => setQualificationNoShow(state, 999, teamId, true)).not.toThrow();
    const result = setQualificationNoShow(state, 999, teamId, true);
    expect(result.qualification.matches).toEqual(state.qualification.matches);
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

describe('applyMatchTimeline', () => {
  const MIN = 60 * 1000;
  const NOON = new Date(2026, 9, 14, 12, 0).getTime();

  // Default pacing: 4-minute matches, 1-minute gaps, one Field.
  function backwardState(timeline = {}) {
    return setTimelineConfig(createInitialState(), { mode: 'backward', ...timeline });
  }

  it('Forward: sets the entered Start Time and leaves the End Time alone', () => {
    const state = setTimelineConfig(createInitialState(), { endTime: NOON });
    const next = applyMatchTimeline(state, { mode: 'forward', time: NOON - 30 * MIN });
    expect(next.timeline.startTime).toBe(NOON - 30 * MIN);
    expect(next.timeline.endTime).toBe(NOON);
  });

  it('Backward: back-calculates the Start Time from the End Time over the estimated Elimination Matches', () => {
    // Estimated Bracket Size 8, no Third-Place Match: 7 matches -> 7*4 + 6*1 = 34 minutes.
    const next = applyMatchTimeline(backwardState({ estimatedBracketSize: 8 }), { mode: 'backward', time: NOON });
    expect(next.timeline.endTime).toBe(NOON);
    expect(next.timeline.startTime).toBe(NOON - 34 * MIN);
  });

  it('Backward: counts the Third-Place Match when one is estimated', () => {
    // 8 matches -> 8*4 + 7*1 = 39 minutes.
    const state = backwardState({ estimatedBracketSize: 8, estimatedThirdPlace: true });
    expect(applyMatchTimeline(state, { mode: 'backward', time: NOON }).timeline.startTime).toBe(NOON - 39 * MIN);
  });

  it('Backward: a non-power-of-two Estimated Bracket Size counts Bracket Size - 1 matches (Byes play none)', () => {
    // Bracket Size 6 -> 5 matches -> 5*4 + 4*1 = 24 minutes.
    const state = backwardState({ estimatedBracketSize: 6 });
    expect(applyMatchTimeline(state, { mode: 'backward', time: NOON }).timeline.startTime).toBe(NOON - 24 * MIN);
  });

  it('Backward: includes Qualification Matches and the Field Count in the duration', () => {
    let state = regenerateMatchups(setMatchesPerTeam(withFourTeams(createInitialState()), 2));
    state = setTimelineConfig(state, { mode: 'backward', estimatedBracketSize: 2, fieldCount: 2 });
    const totalMatches = state.qualification.matches.length + 1;
    const slots = Math.ceil(totalMatches / 2);
    const next = applyMatchTimeline(state, { mode: 'backward', time: NOON });
    expect(next.timeline.startTime).toBe(NOON - (slots * 4 + (slots - 1) * 1) * MIN);
  });

  it('Backward: clearing the End Time clears the Start Time too', () => {
    const applied = applyMatchTimeline(backwardState(), { mode: 'backward', time: NOON });
    const cleared = applyMatchTimeline(applied, { mode: 'backward', time: null });
    expect(cleared.timeline.endTime).toBeNull();
    expect(cleared.timeline.startTime).toBeNull();
  });

  it('a later Bracket Size change does not re-target the applied End Time', () => {
    const applied = applyMatchTimeline(backwardState({ estimatedBracketSize: 8 }), { mode: 'backward', time: NOON });
    const changed = setTimelineConfig(applied, { estimatedBracketSize: 4 });
    expect(changed.timeline.startTime).toBe(NOON - 34 * MIN);
    expect(changed.timeline.endTime).toBe(NOON);
  });

  it('building the actual Bracket does not re-target the applied End Time; Applying again uses the actual Bracket', () => {
    // Four single-Team Playoff Alliances, so the actual Bracket Size (4) differs from the estimate (8).
    let state = createInitialState();
    for (const name of ['Alpha', 'Bravo', 'Charlie', 'Delta']) state = addTeam(state, { name, members: [] });
    state.teams.forEach((t) => { state = formPlayoffAlliance(state, t.id, t.id); });
    state = setTimelineConfig(state, { mode: 'backward', estimatedBracketSize: 8 });
    const applied = applyMatchTimeline(state, { mode: 'backward', time: NOON });
    const started = startFinals(setBracketConfig(applied, { bracketSize: 4, includeThirdPlace: false }), { confirmedShort: true }).state;
    expect(started.elimination.bracket).not.toBeNull();
    expect(started.timeline.startTime).toBe(NOON - 34 * MIN);
    // 3 actual matches -> 3*4 + 2*1 = 14 minutes.
    expect(applyMatchTimeline(started, { mode: 'backward', time: NOON }).timeline.startTime).toBe(NOON - 14 * MIN);
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

  it('has no per-number seed map: Seeds are the alliance list order', () => {
    expect(createInitialState().elimination).not.toHaveProperty('seeds');
  });

  it('setBracketConfig changes only the fields it is given', () => {
    let state = setBracketConfig(createInitialState(), { bracketSize: 4 });
    expect(state.elimination.includeThirdPlace).toBe(true);
    state = setBracketConfig(state, { includeThirdPlace: false });
    expect(state.elimination.bracketSize).toBe(4);
    expect(state.elimination.includeThirdPlace).toBe(false);
  });

  it('setBracketConfig refuses a Bracket Size below the number of alliances formed', () => {
    let state = withFourTeams(createInitialState());
    state.teams.slice(0, 3).forEach((t) => { state = formPlayoffAlliance(state, t.id, t.id); });
    expect(setBracketConfig(state, { bracketSize: 2 })).toBe(state);
    expect(setBracketConfig(state, { bracketSize: 3 }).elimination.bracketSize).toBe(3);
    expect(setBracketConfig(state, { includeThirdPlace: false }).elimination.includeThirdPlace).toBe(false);
  });

  it('forming an alliance or declining is a no-op once Bracket Size alliances have formed', () => {
    let state = setBracketConfig(withFourTeams(createInitialState()), { bracketSize: 2 });
    const [t1, t2, t3, t4] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t1.id);
    state = formPlayoffAlliance(state, t2.id, t2.id);
    expect(formPlayoffAlliance(state, t3.id, t4.id)).toBe(state);
    expect(declineTeam(state, t3.id)).toBe(state);
  });
});

describe('movePlayoffAlliance', () => {
  /** Alpha, Bravo, Charlie as three single-Team alliances, in that order. */
  function withThreeAlliances() {
    let s = withFourTeams(createInitialState());
    s.teams.slice(0, 3).forEach((t) => { s = formPlayoffAlliance(s, t.id, t.id); });
    return s;
  }
  const order = (s) => s.elimination.alliances.map((a) => a.teamIds[0]);

  it('moves an alliance up or down one place, changing its Seed', () => {
    const s = withThreeAlliances();
    const [a, b, c] = order(s);
    const [, second] = s.elimination.alliances;
    expect(order(movePlayoffAlliance(s, second.id, -1))).toEqual([b, a, c]);
    expect(order(movePlayoffAlliance(s, second.id, 1))).toEqual([a, c, b]);
  });

  it('no-ops past either end of the list, or for an unknown alliance', () => {
    const s = withThreeAlliances();
    const [first, , last] = s.elimination.alliances;
    expect(movePlayoffAlliance(s, first.id, -1)).toBe(s);
    expect(movePlayoffAlliance(s, last.id, 1)).toBe(s);
    expect(movePlayoffAlliance(s, 'nope', 1)).toBe(s);
  });
});

describe('startFinals', () => {
  /** n single-Team alliances, formed in roster order. */
  function withAlliances(n) {
    let s = createInitialState();
    for (let i = 0; i < n; i++) s = addTeam(s, { name: `T${i}`, members: [] });
    s.teams.forEach((t) => { s = formPlayoffAlliance(s, t.id, t.id); });
    return s;
  }
  const allianceIds = (s) => s.elimination.alliances.map((a) => a.id);

  it('no-ops with fewer than 2 alliances, reporting it did not start', () => {
    const none = withFourTeams(createInitialState());
    expect(startFinals(none)).toEqual({ state: none, started: false, shortBy: 0 });
    const one = withAlliances(1);
    expect(startFinals(one, { confirmedShort: true })).toEqual({ state: one, started: false, shortBy: 0 });
  });

  it('starts with every alliance formed, reporting no shortfall', () => {
    const s = setBracketConfig(withAlliances(4), { bracketSize: 4 });
    const result = startFinals(s);
    expect(result.started).toBe(true);
    expect(result.shortBy).toBe(0);
    expect(result.state.elimination.bracket.seeds).toEqual(allianceIds(s));
  });

  it('refuses to start short of Bracket Size until confirmed, reporting how many alliances short', () => {
    const s = setBracketConfig(withAlliances(3), { bracketSize: 5 });
    expect(startFinals(s)).toEqual({ state: s, started: false, shortBy: 2 });
    const confirmed = startFinals(s, { confirmedShort: true });
    expect(confirmed.started).toBe(true);
    expect(confirmed.shortBy).toBe(2);
    expect(confirmed.state.elimination.bracket.seeds).toHaveLength(3);
  });

  it('builds the Bracket from every alliance, seeded in list order, when fewer than the Estimated Bracket Size have formed', () => {
    let s = withAlliances(3);
    s = movePlayoffAlliance(s, s.elimination.alliances[2].id, -1);
    const next = startFinals(s, { confirmedShort: true }).state;
    expect(next.elimination.bracket.seeds).toEqual(allianceIds(s));
    expect(next.elimination.bracketSize).toBe(3);
  });

  it('enters only the first Bracket Size alliances when more have formed', () => {
    // Only reachable from a Tournament saved before Bracket Size capped Alliance Selection.
    const formed = withAlliances(4);
    const s = { ...formed, elimination: { ...formed.elimination, bracketSize: 2 } };
    expect(startFinals(s, { confirmedShort: true }).state.elimination.bracket.seeds).toEqual(allianceIds(s).slice(0, 2));
  });

  it('falls back to the Estimated Bracket Size when no Bracket Size is set', () => {
    // Only reachable from a Tournament saved before forming an alliance saved Bracket Size.
    const formed = setTimelineConfig(withAlliances(4), { estimatedBracketSize: 2 });
    const s = { ...formed, elimination: { ...formed.elimination, bracketSize: null } };
    const next = startFinals(s, { confirmedShort: true }).state;
    expect(next.elimination.bracket.seeds).toEqual(allianceIds(s).slice(0, 2));
    expect(next.elimination.bracketSize).toBe(2);
  });

  it('shrinks Bracket Size to the number of alliances formed when fewer have', () => {
    const next = startFinals(setBracketConfig(withAlliances(3), { bracketSize: 8 }), { confirmedShort: true }).state;
    expect(next.elimination.bracketSize).toBe(3);
    expect(next.elimination.bracket.seeds).toHaveLength(3);
  });

  it('stores Bracket Size and the Third-Place setting only in the Elimination settings, not in the Bracket', () => {
    const next = startFinals(setBracketConfig(withAlliances(4), { bracketSize: 4 })).state;
    expect(next.elimination).toMatchObject({ bracketSize: 4, includeThirdPlace: true });
    expect(Object.keys(next.elimination.bracket).sort()).toEqual(['matches', 'seeds']);
  });

  it('ignores a Bracket Size below 2 and enters every alliance', () => {
    const next = startFinals(setBracketConfig(withAlliances(3), { bracketSize: 1 }), { confirmedShort: true }).state;
    expect(next.elimination.bracket.seeds).toHaveLength(3);
  });

  it('uses the Third-Place setting', () => {
    const next = startFinals(setBracketConfig(withAlliances(4), { includeThirdPlace: true }), { confirmedShort: true }).state;
    expect(next.elimination.bracket.matches.some((m) => m.round === 'third-place')).toBe(true);
  });

  it('ignores the per-number seed map of a Tournament saved before Seeds became list order', () => {
    const s = withAlliances(2);
    const legacy = { ...s, elimination: { ...s.elimination, seeds: { 1: allianceIds(s)[1], 2: allianceIds(s)[0] } } };
    expect(startFinals(legacy, { confirmedShort: true }).state.elimination.bracket.seeds).toEqual(allianceIds(s));
  });
});

describe('Alliance Selection locked while a Bracket exists', () => {
  /** Two alliances (Alpha & Bravo, Charlie alone), Delta Declined, then Start Finals. */
  function withBracket() {
    let s = setBracketConfig(withFourTeams(createInitialState()), { bracketSize: 3, includeThirdPlace: false });
    const [a, b, c, d] = s.teams.map((t) => t.id);
    s = formPlayoffAlliance(s, a, b);
    s = formPlayoffAlliance(s, c, c);
    s = declineTeam(s, d);
    return startFinals(s, { confirmedShort: true }).state;
  }

  it('every Alliance Selection action is a no-op', () => {
    const s = withBracket();
    const [allianceA, allianceB] = s.elimination.alliances.map((a) => a.id);
    const delta = s.teams[3].id;
    expect(formPlayoffAlliance(s, delta, delta)).toBe(s);
    expect(removePlayoffAlliance(s, allianceA)).toBe(s);
    expect(movePlayoffAlliance(s, allianceB, -1)).toBe(s);
    expect(undoDecline(s, delta)).toBe(s);
    expect(setBracketConfig(s, { bracketSize: 4 })).toBe(s);
    expect(setBracketConfig(s, { includeThirdPlace: true })).toBe(s);
    expect(startFinals(s, { confirmedShort: true }).state).toBe(s);
  });

  it('declining is a no-op', () => {
    // Raise Bracket Size behind the lock's back, so only the lock can refuse the Decline.
    const locked = withBracket();
    const s = { ...locked, elimination: { ...locked.elimination, bracketSize: 8, declinedTeamIds: [] } };
    expect(declineTeam(s, s.teams[3].id)).toBe(s);
  });

  it('Discard Bracket clears the Bracket and the Podium reveal, and keeps alliances, Declines, and settings', () => {
    let s = withBracket();
    const final = s.elimination.bracket.matches.find((m) => m.round === 'final');
    s = recordEliminationResult(s, final.id, { scoreA: 5, scoreB: 1 });
    s = revealNextPlacement(s);
    expect(getRevealedCount(s)).toBe(1);

    const next = discardBracket(s);
    expect(next.elimination.bracket).toBeNull();
    expect(next.podium).toEqual(createInitialState().podium);
    expect(next.elimination.alliances).toBe(s.elimination.alliances);
    expect(next.elimination.declinedTeamIds).toBe(s.elimination.declinedTeamIds);
    expect(next.elimination.bracketSize).toBe(2);
    expect(next.elimination.includeThirdPlace).toBe(false);
  });

  it('after Discard Bracket, Alliance Selection is editable and Start Finals builds a new Bracket', () => {
    let s = discardBracket(withBracket());
    const [, allianceB] = s.elimination.alliances.map((a) => a.id);
    s = movePlayoffAlliance(s, allianceB, -1);
    expect(s.elimination.alliances[0].id).toBe(allianceB);
    s = startFinals(s, { confirmedShort: true }).state;
    expect(s.elimination.bracket.seeds[0]).toBe(allianceB);
  });

  it('Discard Bracket is a no-op with no Bracket', () => {
    const s = withFourTeams(createInitialState());
    expect(discardBracket(s)).toBe(s);
  });
});

describe('elimination results', () => {

  it('records an elimination match result', () => {
    let state = withFourTeams(createInitialState());
    const [t1, t2, t3, t4] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t2.id);
    state = formPlayoffAlliance(state, t3.id, t4.id);
    state = setBracketConfig(state, { includeThirdPlace: false });
    state = startFinals(state, { confirmedShort: true }).state;
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
    state = setBracketConfig(state, { includeThirdPlace: false });
    state = startFinals(state, { confirmedShort: true }).state;
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

  it('no-ops on an unmatched elimination matchId instead of throwing', () => {
    let state = withFourTeams(createInitialState());
    const [t1, t2, t3, t4] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t2.id);
    state = formPlayoffAlliance(state, t3.id, t4.id);
    state = setBracketConfig(state, { includeThirdPlace: false });
    state = startFinals(state, { confirmedShort: true }).state;

    expect(() => setEliminationNoShow(state, 'not-a-real-id', t1.id, true)).not.toThrow();
    const result = setEliminationNoShow(state, 'not-a-real-id', t1.id, true);
    expect(result.elimination.bracket.matches).toEqual(state.elimination.bracket.matches);
  });

  it('no-ops on recordEliminationResult/setEliminationDraftScore/setEliminationNoShow when there is no bracket yet', () => {
    const state = createInitialState();
    expect(() => recordEliminationResult(state, 'any-id', { scoreA: 1, scoreB: 0 })).not.toThrow();
    expect(recordEliminationResult(state, 'any-id', { scoreA: 1, scoreB: 0 })).toBe(state);
    expect(() => setEliminationDraftScore(state, 'any-id', 'scoreA', 1)).not.toThrow();
    expect(setEliminationDraftScore(state, 'any-id', 'scoreA', 1)).toBe(state);
    expect(() => setEliminationNoShow(state, 'any-id', 'team-1', true)).not.toThrow();
    expect(setEliminationNoShow(state, 'any-id', 'team-1', true)).toBe(state);
  });
});

describe('resetting Declines', () => {
  function withAllianceAndDecline() {
    let state = withFourTeams(createInitialState());
    const [a, b, c] = state.teams.map((t) => t.id);
    state = formPlayoffAlliance(state, a, b);
    return declineTeam(state, c);
  }

  it('Reset Results clears alliances and Declines, and keeps the roster', () => {
    const state = resetResults(withAllianceAndDecline());
    expect(state.elimination.alliances).toEqual([]);
    expect(state.elimination.declinedTeamIds).toEqual([]);
    expect(state.teams).toHaveLength(4);
  });

  it('Reset Results and New Tournament clear the saved Bracket Size, so it follows the estimate again', () => {
    const saved = withAllianceAndDecline();
    expect(saved.elimination.bracketSize).toBe(8);
    expect(resetResults(saved).elimination.bracketSize).toBeNull();
    expect(newTournament(saved).elimination.bracketSize).toBeNull();
  });

  it('New Tournament clears Declines along with everything else', () => {
    expect(newTournament(withAllianceAndDecline()).elimination.declinedTeamIds).toEqual([]);
  });
});

describe('upgradeSavedTournament', () => {
  function legacy({ allianceCount, estimatedBracketSize }) {
    let s = withFourTeams(createInitialState());
    s.teams.slice(0, allianceCount).forEach((t) => { s = formPlayoffAlliance(s, t.id, t.id); });
    s = setTimelineConfig(s, { estimatedBracketSize });
    return { ...s, elimination: { ...s.elimination, bracketSize: null } };
  }

  it('saves the Estimated Bracket Size as Bracket Size for a Tournament saved mid-selection without one', () => {
    expect(upgradeSavedTournament(legacy({ allianceCount: 2, estimatedBracketSize: 4 })).elimination.bracketSize).toBe(4);
  });

  it('raises it to the number of alliances formed, so none are dropped', () => {
    expect(upgradeSavedTournament(legacy({ allianceCount: 3, estimatedBracketSize: 2 })).elimination.bracketSize).toBe(3);
  });

  it('saves at least 2 when the Estimated Bracket Size is 1', () => {
    expect(upgradeSavedTournament(legacy({ allianceCount: 1, estimatedBracketSize: 1 })).elimination.bracketSize).toBe(2);
  });

  it('leaves a Tournament with no alliances, or a saved Bracket Size, unchanged', () => {
    const none = legacy({ allianceCount: 0, estimatedBracketSize: 4 });
    expect(upgradeSavedTournament(none)).toBe(none);
    const saved = setBracketConfig(withFourTeams(createInitialState()), { bracketSize: 3 });
    expect(upgradeSavedTournament(saved)).toBe(saved);
  });

  describe('a Tournament saved with Bracket settings duplicated inside the Bracket', () => {
    /** 4 single-Team alliances in Finals, saved in the old shape (the Bracket carrying its own settings). */
    function oldShape({ bracketThirdPlace }) {
      let s = withFourTeams(createInitialState());
      s.teams.forEach((t) => { s = formPlayoffAlliance(s, t.id, t.id); });
      s = setBracketConfig(s, { bracketSize: 4, includeThirdPlace: bracketThirdPlace });
      s = startFinals(s).state;
      const bracket = { bracketSize: 4, paddedSize: 4, seeds: s.elimination.bracket.seeds, includeThirdPlace: bracketThirdPlace, matches: s.elimination.bracket.matches };
      return { ...s, elimination: { ...s.elimination, includeThirdPlace: true, bracket } };
    }

    it('keeps only Seeds and matches in the Bracket', () => {
      const upgraded = upgradeSavedTournament(oldShape({ bracketThirdPlace: true }));
      expect(Object.keys(upgraded.elimination.bracket).sort()).toEqual(['matches', 'seeds']);
      expect(upgraded.elimination.bracketSize).toBe(4);
    });

    it("takes the Third-Place setting from the Bracket, since that's what its matches were built with", () => {
      const upgraded = upgradeSavedTournament(oldShape({ bracketThirdPlace: false }));
      expect(upgraded.elimination.includeThirdPlace).toBe(false);
      expect(upgraded.elimination.bracket.matches.some((m) => m.round === 'third-place')).toBe(false);
    });

    it('plays on the same as before: results advance and Placements come out', () => {
      let s = upgradeSavedTournament(oldShape({ bracketThirdPlace: true }));
      for (const match of getAllMatchesInScheduleOrder(s).filter((m) => m.kind === 'elimination')) {
        s = recordEliminationResult(s, match.match.id, { scoreA: 2, scoreB: 1 });
      }
      expect(getRevealedPlaces(revealNextPlacement(revealNextPlacement(revealNextPlacement(s)))).size).toBe(3);
    });
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
    s = setBracketConfig(s, { includeThirdPlace });
    return startFinals(s, { confirmedShort: true }).state;
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

  it('discarding the Bracket and starting the Finals again clears reveal progress', () => {
    const s = revealNextPlacement(completeAll(withBracket()));
    expect(startFinals(discardBracket(s), { confirmedShort: true }).state.podium.revealedCount).toBe(0);
  });

  it('Reset Results and New Tournament clear reveal progress', () => {
    const s = revealNextPlacement(completeAll(withBracket()));
    expect(getRevealedCount(resetResults(s))).toBe(0);
    expect(getRevealedCount(newTournament(s))).toBe(0);
  });
});

describe('playoffAllianceTeamIds', () => {
  it('returns the two Team ids making up a Playoff Alliance', () => {
    let state = withFourTeams(createInitialState());
    const [t1, t2] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t2.id);
    const allianceId = state.elimination.alliances[0].id;
    expect(playoffAllianceTeamIds(state, allianceId)).toEqual([t1.id, t2.id]);
  });

  it('returns an empty list for an alliance id that does not resolve', () => {
    expect(playoffAllianceTeamIds(createInitialState(), 'nope')).toEqual([]);
  });
});

describe('getAllMatchesInScheduleOrder', () => {
  it('returns an empty list for a fresh tournament', () => {
    expect(getAllMatchesInScheduleOrder(createInitialState())).toEqual([]);
  });

  it('orders Qualification Matches before Elimination Matches and excludes Byes', () => {
    let state = withFourTeams(createInitialState());
    state = setMatchesPerTeam(state, 1);
    state = regenerateMatchups(state);
    const [t1, t2, t3, t4] = state.teams;
    state = formPlayoffAlliance(state, t1.id, t2.id);
    state = formPlayoffAlliance(state, t3.id, t4.id);
    state = setBracketConfig(state, { includeThirdPlace: false });
    state = startFinals(state, { confirmedShort: true }).state;

    const entries = getAllMatchesInScheduleOrder(state);
    expect(entries.map((e) => e.kind)).toEqual([
      ...state.qualification.matches.map(() => 'qualification'),
      ...state.elimination.bracket.matches.filter((m) => !m.isBye).map(() => 'elimination'),
    ]);
    expect(entries.map((e) => e.globalIndex)).toEqual(entries.map((_, i) => i));
    expect(entries.some((e) => e.match.isBye)).toBe(false);
  });

  it('schedules Elimination Matches in bracket order, the Third-Place Match before the Final', () => {
    let state = withFourTeams(createInitialState());
    state.teams.forEach((t) => { state = formPlayoffAlliance(state, t.id, t.id); });
    state = startFinals(setBracketConfig(state, { includeThirdPlace: true }), { confirmedShort: true }).state;

    const rounds = getAllMatchesInScheduleOrder(state).map((e) => e.match.round);
    expect(rounds).toEqual([1, 1, 'third-place', 'final']);
  });
});
