import { describe, it, expect } from 'vitest';
import { getInferredCurrentMatchIndex, getUpNextMatchIndex, getEliminationCurrentMatchId, getEliminationUpNextMatchId } from '../../robotics/current-match.js';
import { buildBracket, eliminationMatchLabel } from '../../robotics/bracket.js';

function matches(completedFlags) {
  return completedFlags.map((completed) => ({ completed }));
}

describe('getInferredCurrentMatchIndex', () => {
  it('returns the first not-yet-complete match in order', () => {
    expect(getInferredCurrentMatchIndex(matches([true, true, false, false]))).toBe(2);
  });

  it('returns null when every match is complete', () => {
    expect(getInferredCurrentMatchIndex(matches([true, true]))).toBeNull();
  });

  it('returns null when there are no matches', () => {
    expect(getInferredCurrentMatchIndex([])).toBeNull();
  });
});

describe('getUpNextMatchIndex', () => {
  it('is the next not-yet-complete match after the current one', () => {
    expect(getUpNextMatchIndex(matches([true, false, false, false]), 1)).toBe(2);
  });

  it('skips completed matches to find the next incomplete one', () => {
    expect(getUpNextMatchIndex(matches([false, true, true, false]), 0)).toBe(3);
  });

  it('is null when there is no later incomplete match', () => {
    expect(getUpNextMatchIndex(matches([false, true, true]), 0)).toBeNull();
  });

  it('is null when current is null', () => {
    expect(getUpNextMatchIndex(matches([false, false]), null)).toBeNull();
  });
});

describe('Elimination Current Match and Up Next', () => {
  const label = (bracket, id) => (id === null ? null : eliminationMatchLabel(bracket.matches.find((m) => m.id === id)));
  /** Record [scoreA, scoreB] (as complete) on the matches with the given labels. */
  function withResults(bracket, resultsByLabel) {
    return {
      ...bracket,
      matches: bracket.matches.map((m) => {
        const scores = resultsByLabel[eliminationMatchLabel(m)];
        return scores ? { ...m, scoreA: scores[0], scoreB: scores[1], completed: true } : m;
      }),
    };
  }
  const four = () => buildBracket({ bracketSize: 4, seeds: ['a1', 'a2', 'a3', 'a4'], includeThirdPlace: true });
  function current(bracket) {
    const currentId = getEliminationCurrentMatchId(bracket);
    return [label(bracket, currentId), label(bracket, getEliminationUpNextMatchId(bracket, currentId))];
  }

  it('starts at the first match in bracket order, with the next one Up Next', () => {
    expect(current(four())).toEqual(['Round 1 · Match 1', 'Round 1 · Match 2']);
  });

  it('plays the Third-Place Match before the Final', () => {
    const bracket = withResults(four(), { 'Round 1 · Match 1': [9, 1], 'Round 1 · Match 2': [9, 1] });
    expect(current(bracket)).toEqual(['Third-Place Match', 'Final']);
  });

  it('skips Byes', () => {
    const bracket = buildBracket({ bracketSize: 3, seeds: ['a1', 'a2', 'a3'], includeThirdPlace: false });
    expect(current(bracket)).toEqual(['Round 1 · Match 2', 'Final']);
  });

  it('keeps a completed Tie Current, since it has no winner', () => {
    const bracket = withResults(four(), { 'Round 1 · Match 1': [5, 5] });
    expect(current(bracket)).toEqual(['Round 1 · Match 1', 'Round 1 · Match 2']);
  });

  it('skips a decided match when finding Up Next', () => {
    // Decided out of order: Round 1 · Match 2 is done while Match 1 is still Current.
    const bracket = withResults(four(), { 'Round 1 · Match 2': [9, 1] });
    expect(current(bracket)).toEqual(['Round 1 · Match 1', 'Third-Place Match']);
  });

  it('has no Up Next for the last undecided match', () => {
    const bracket = withResults(four(), { 'Round 1 · Match 1': [9, 1], 'Round 1 · Match 2': [9, 1], 'Third-Place Match': [9, 1] });
    expect(current(bracket)).toEqual(['Final', null]);
  });

  it('is null once every Elimination Match has a winner', () => {
    const bracket = withResults(four(), {
      'Round 1 · Match 1': [9, 1], 'Round 1 · Match 2': [9, 1], 'Third-Place Match': [9, 1], Final: [9, 1],
    });
    expect(current(bracket)).toEqual([null, null]);
  });
});
