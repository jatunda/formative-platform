import { describe, it, expect } from 'vitest';
import { matchOutcome, winningSide, qualificationTeamResult } from '../../robotics/match-result.js';

function match({ scoreA = 0, scoreB = 0, completed = true, noShow = {} } = {}) {
  return { scoreA, scoreB, completed, noShow };
}

describe('matchOutcome', () => {
  it('is the side with the higher Score once complete', () => {
    expect(matchOutcome(match({ scoreA: 30, scoreB: 20 }))).toBe('A');
    expect(matchOutcome(match({ scoreA: 10, scoreB: 20 }))).toBe('B');
  });

  it('is a Tie when the Scores are equal', () => {
    expect(matchOutcome(match({ scoreA: 15, scoreB: 15 }))).toBe('tie');
  });

  it('is null while the match is incomplete, whatever the draft Scores', () => {
    expect(matchOutcome(match({ scoreA: 30, scoreB: 20, completed: false }))).toBeNull();
  });

  it('ignores No-Shows: the Score alone decides which side won', () => {
    expect(matchOutcome(match({ scoreA: 30, scoreB: 20, noShow: { t1: true } }))).toBe('A');
  });
});

describe('winningSide', () => {
  it('is the winning side once complete', () => {
    expect(winningSide(match({ scoreA: 30, scoreB: 20 }))).toBe('A');
    expect(winningSide(match({ scoreA: 10, scoreB: 20 }))).toBe('B');
  });

  it('has no winning side on a Tie, so an Elimination Match stays undecided', () => {
    expect(winningSide(match({ scoreA: 15, scoreB: 15 }))).toBeNull();
  });

  it('has no winning side while incomplete', () => {
    expect(winningSide(match({ scoreA: 30, scoreB: 20, completed: false }))).toBeNull();
  });

  it('is unaffected by a No-Show on the higher-scoring side', () => {
    expect(winningSide(match({ scoreA: 30, scoreB: 20, noShow: { t1: true } }))).toBe('A');
  });
});

describe('qualificationTeamResult', () => {
  it('is a win for the higher-scoring side and a loss for the other', () => {
    const m = match({ scoreA: 30, scoreB: 20 });
    expect(qualificationTeamResult(m, 'A', 't1')).toBe('win');
    expect(qualificationTeamResult(m, 'B', 't3')).toBe('loss');
  });

  it('is a Tie for both sides when the Scores are equal', () => {
    const m = match({ scoreA: 15, scoreB: 15 });
    expect(qualificationTeamResult(m, 'A', 't1')).toBe('tie');
    expect(qualificationTeamResult(m, 'B', 't3')).toBe('tie');
  });

  it('is a loss for a No-Show Team alone, even on the winning side or in a Tie', () => {
    const won = match({ scoreA: 30, scoreB: 20, noShow: { t1: true } });
    expect(qualificationTeamResult(won, 'A', 't1')).toBe('loss');
    expect(qualificationTeamResult(won, 'A', 't2')).toBe('win');
    const tied = match({ scoreA: 15, scoreB: 15, noShow: { t3: true } });
    expect(qualificationTeamResult(tied, 'B', 't3')).toBe('loss');
    expect(qualificationTeamResult(tied, 'B', 't4')).toBe('tie');
  });

  it('is null while the match is incomplete, No-Show or not', () => {
    const m = match({ scoreA: 30, scoreB: 20, completed: false, noShow: { t1: true } });
    expect(qualificationTeamResult(m, 'A', 't1')).toBeNull();
    expect(qualificationTeamResult(m, 'B', 't3')).toBeNull();
  });

  it('treats a missing No-Show map as nobody absent', () => {
    const m = { scoreA: 30, scoreB: 20, completed: true };
    expect(qualificationTeamResult(m, 'A', 't1')).toBe('win');
  });
});
