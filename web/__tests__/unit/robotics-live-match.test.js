import { describe, it, expect } from 'vitest';
import { getLiveMatch, getQualificationLiveMatch, getEliminationLiveMatch } from '../../robotics/live-match.js';
import { buildBracket } from '../../robotics/bracket.js';

const MINUTE = 60 * 1000;
const START = 1_000_000;

const TEAMS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'].map((name) => ({ id: name.toLowerCase(), name, members: [] }));

function qualMatch([a1, a2], [b1, b2], completed = false) {
  return { allianceA: [a1, a2], allianceB: [b1, b2], completed, scoreA: completed ? 1 : null, scoreB: completed ? 0 : null, noShow: {} };
}

/** Each `results` entry is [matchId, scoreA, scoreB], recorded as complete. */
function withResults(bracket, results) {
  const byId = new Map(results.map(([id, scoreA, scoreB]) => [id, { scoreA, scoreB, completed: true }]));
  return { ...bracket, matches: bracket.matches.map((m) => (byId.has(m.id) ? { ...m, ...byId.get(m.id) } : m)) };
}

// Four Playoff Alliances: p1 = Alpha & Bravo, p2 = Charlie & Delta, ...
const ALLIANCES = [0, 1, 2, 3].map((i) => ({ id: `p${i + 1}`, teamIds: [TEAMS[2 * i].id, TEAMS[2 * i + 1].id] }));

function makeState({ qual = [], bracket = null, startTime = START, fieldCount = 1 } = {}) {
  return {
    teams: TEAMS,
    qualification: { matches: qual },
    elimination: { alliances: ALLIANCES, bracket },
    timeline: { startTime, matchDurationMin: 5, gapMin: 1, fieldCount },
  };
}

const twoQualMatches = (firstCompleted = false, secondCompleted = false) => [
  qualMatch(['alpha', 'bravo'], ['charlie', 'delta'], firstCompleted),
  qualMatch(['echo', 'foxtrot'], ['golf', 'hotel'], secondCompleted),
];

function fourAllianceBracket({ includeThirdPlace = false, results = [] } = {}) {
  // Round 1: m1 = Seed 1 v Seed 4, m2 = Seed 2 v Seed 3; m3 = Final (m4 = Third-Place Match when included).
  return withResults(buildBracket({ bracketSize: 4, seeds: ['p1', 'p2', 'p3', 'p4'], includeThirdPlace }), results);
}

describe('getLiveMatch: no match in play', () => {
  it('is null during setup (no matches at all)', () => {
    expect(getLiveMatch(makeState())).toBeNull();
  });

  it('is null during Alliance Selection (every Qualification Match complete, no Bracket yet)', () => {
    expect(getLiveMatch(makeState({ qual: twoQualMatches(true, true) }))).toBeNull();
  });

  it('is null once the Tournament is complete', () => {
    const bracket = fourAllianceBracket({ results: [['m1', 5, 0], ['m2', 5, 0], ['m3', 5, 0]] });
    expect(getLiveMatch(makeState({ qual: twoQualMatches(true, true), bracket }))).toBeNull();
  });
});

describe('getLiveMatch: Qualification Round', () => {
  it('returns the Current Match, its schedule entry, Match Time, position and side labels', () => {
    const live = getLiveMatch(makeState({ qual: twoQualMatches(true, false) }));
    expect(live).toMatchObject({ phase: 'qualification', position: 2, total: 2 });
    expect(live.current.ref).toBe(1);
    expect(live.current.entry).toMatchObject({ kind: 'qualification', qualIndex: 1, globalIndex: 1 });
    expect(live.current.matchTime).toBe(START + 6 * MINUTE);
    expect(live.current.sideA).toEqual({ teamIds: ['echo', 'foxtrot'], label: 'Echo & Foxtrot' });
    expect(live.current.sideB).toEqual({ teamIds: ['golf', 'hotel'], label: 'Golf & Hotel' });
    expect(live.upNext).toBeNull();
  });

  it('returns Up Next with its own Match Time and labels', () => {
    const live = getLiveMatch(makeState({ qual: twoQualMatches() }));
    expect(live.current.ref).toBe(0);
    expect(live.upNext.ref).toBe(1);
    expect(live.upNext.matchTime).toBe(START + 6 * MINUTE);
    expect(live.upNext.sideA.label).toBe('Echo & Foxtrot');
    expect(live.upNext.sideB.label).toBe('Golf & Hotel');
  });

  it('counts position by schedule order even when a later match was completed out of order', () => {
    const qual = [...twoQualMatches(false, true), qualMatch(['alpha', 'charlie'], ['bravo', 'delta'])];
    const live = getLiveMatch(makeState({ qual }));
    expect(live).toMatchObject({ position: 1, total: 3 });
    expect(live.upNext.ref).toBe(2);
  });

  it('has no Match Time when no Start Time is set', () => {
    const live = getLiveMatch(makeState({ qual: twoQualMatches(), startTime: null }));
    expect(live.current.matchTime).toBeNull();
  });

  it('labels a Team that no longer exists as unknown', () => {
    const live = getLiveMatch(makeState({ qual: [qualMatch(['alpha', 'gone'], ['charlie', 'delta'])] }));
    expect(live.current.sideA.label).toBe('Alpha & (unknown team)');
  });
});

describe('getLiveMatch: Elimination Bracket', () => {
  it('returns the Elimination Current Match with its schedule entry after the Qualification Matches', () => {
    const live = getLiveMatch(makeState({ qual: twoQualMatches(true, true), bracket: fourAllianceBracket() }));
    expect(live).toMatchObject({ phase: 'elimination', position: 1, total: 3 });
    expect(live.current.ref).toBe('m1');
    expect(live.current.entry).toMatchObject({ kind: 'elimination', globalIndex: 2 });
    expect(live.current.matchTime).toBe(START + 2 * 6 * MINUTE);
    expect(live.current.sideA).toEqual({ teamIds: ['alpha', 'bravo'], label: 'Alpha & Bravo' });
    expect(live.current.sideB).toEqual({ teamIds: ['golf', 'hotel'], label: 'Golf & Hotel' });
    expect(live.upNext.ref).toBe('m2');
  });

  it('labels an Up Next side not decided yet with the match it comes from', () => {
    const bracket = fourAllianceBracket({ results: [['m1', 5, 0]] });
    const live = getLiveMatch(makeState({ qual: twoQualMatches(true, true), bracket }));
    expect(live.current.ref).toBe('m2');
    expect(live.upNext.ref).toBe('m3');
    expect(live.upNext.sideA).toEqual({ teamIds: ['alpha', 'bravo'], label: 'Alpha & Bravo' });
    expect(live.upNext.sideB).toEqual({ teamIds: [], label: 'Winner of Round 1 · Match 2' });
  });

  it('labels Third-Place sides "Runner-up of", never "Loser of"', () => {
    const bracket = fourAllianceBracket({ includeThirdPlace: true, results: [['m1', 5, 0]] });
    const live = getLiveMatch(makeState({ qual: twoQualMatches(true, true), bracket }));
    expect(live.upNext.ref).toBe('m4');
    expect(live.upNext.sideA).toEqual({ teamIds: ['golf', 'hotel'], label: 'Golf & Hotel' });
    expect(live.upNext.sideB).toEqual({ teamIds: [], label: 'Runner-up of Round 1 · Match 2' });
  });

  it('keeps a completed Tie as the Current Match', () => {
    const bracket = fourAllianceBracket({ results: [['m1', 3, 3]] });
    const live = getLiveMatch(makeState({ qual: twoQualMatches(true, true), bracket }));
    expect(live.current.ref).toBe('m1');
    expect(live.position).toBe(1);
  });

  it('counts position by bracket order even when a later match was decided first', () => {
    const bracket = fourAllianceBracket({ results: [['m1', 3, 3], ['m2', 5, 0]] });
    const live = getLiveMatch(makeState({ qual: twoQualMatches(true, true), bracket }));
    expect(live.current.ref).toBe('m1');
    expect(live).toMatchObject({ position: 1, total: 3 });
  });

  it('skips Byes, which occupy no schedule slot', () => {
    // 3 alliances: Seed 1 has a Bye in m1, m2 = Seed 2 v Seed 3, m3 = Final.
    const bracket = buildBracket({ bracketSize: 3, seeds: ['p1', 'p2', 'p3'], includeThirdPlace: false });
    const live = getLiveMatch(makeState({ qual: twoQualMatches(true, true), bracket }));
    expect(live).toMatchObject({ position: 1, total: 2 });
    expect(live.current.ref).toBe('m2');
    expect(live.current.entry.globalIndex).toBe(2);
    expect(live.upNext.ref).toBe('m3');
    expect(live.upNext.sideA.label).toBe('Alpha & Bravo');
  });

  it('counts position by bracket order, and Match Time by schedule slot across Fields', () => {
    const bracket = fourAllianceBracket({ results: [['m1', 5, 0], ['m2', 0, 5]] });
    const live = getLiveMatch(makeState({ qual: twoQualMatches(true, true), bracket, fieldCount: 2 }));
    expect(live).toMatchObject({ position: 3, total: 3 });
    expect(live.current.ref).toBe('m3');
    // Schedule position 4 on two Fields is the third slot.
    expect(live.current.matchTime).toBe(START + 2 * 6 * MINUTE);
    expect(live.current.sideB.label).toBe('Echo & Foxtrot');
    expect(live.upNext).toBeNull();
  });

  it('labels a side whose Playoff Alliance no longer resolves as unassigned', () => {
    const bracket = buildBracket({ bracketSize: 2, seeds: ['p1', 'gone'], includeThirdPlace: false });
    const live = getLiveMatch(makeState({ qual: twoQualMatches(true, true), bracket }));
    expect(live.current.sideB).toEqual({ teamIds: [], label: '(unassigned)' });
  });
});

describe('phase-specific Live Match queries', () => {
  it('getQualificationLiveMatch still answers for the Qualification Round once a Bracket exists', () => {
    const live = getQualificationLiveMatch(makeState({ qual: twoQualMatches(true, false), bracket: fourAllianceBracket() }));
    expect(live).toMatchObject({ phase: 'qualification', position: 2 });
    expect(live.current.ref).toBe(1);
  });

  it('getQualificationLiveMatch is null when every Qualification Match is complete', () => {
    expect(getQualificationLiveMatch(makeState({ qual: twoQualMatches(true, true) }))).toBeNull();
  });

  it('getEliminationLiveMatch is null without a Bracket, even mid-Qualification', () => {
    expect(getEliminationLiveMatch(makeState({ qual: twoQualMatches() }))).toBeNull();
  });

  it('getEliminationLiveMatch answers for the Bracket even while Qualification is incomplete', () => {
    const live = getEliminationLiveMatch(makeState({ qual: twoQualMatches(), bracket: fourAllianceBracket() }));
    expect(live).toMatchObject({ phase: 'elimination', position: 1 });
    expect(live.current.ref).toBe('m1');
  });

  it('getEliminationLiveMatch is null once every Elimination Match has a winner', () => {
    const bracket = fourAllianceBracket({ results: [['m1', 5, 0], ['m2', 5, 0], ['m3', 5, 0]] });
    expect(getEliminationLiveMatch(makeState({ qual: twoQualMatches(true, true), bracket }))).toBeNull();
  });
});
