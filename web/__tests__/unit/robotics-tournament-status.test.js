import { describe, it, expect } from 'vitest';
import {
  getTournamentPhase,
  PHASE_LABELS,
  getMatchProgress,
  getCurrentMatchTime,
  getScheduleDrift,
  formatScheduleDrift,
} from '../../robotics/tournament-status.js';
import { buildBracket } from '../../robotics/bracket.js';

const MINUTE = 60 * 1000;

function qualMatches(completedFlags) {
  return completedFlags.map((completed) => ({ completed }));
}

/**
 * A 3-alliance bracket: Seed 1 has a Bye, Seed 2 v Seed 3 is the one played
 * Round 1 match, then the Final - 2 played matches. Each `results` entry is
 * [scoreA, scoreB] recorded (as complete) on the next played match in order.
 */
function threeAllianceBracket(results = []) {
  const bracket = buildBracket({ bracketSize: 3, seeds: ['a1', 'a2', 'a3'], includeThirdPlace: false });
  const playedIds = bracket.matches.filter((m) => !m.isBye).map((m) => m.id);
  const scoresById = new Map(results.map((scores, i) => [playedIds[i], scores]));
  return {
    ...bracket,
    matches: bracket.matches.map((m) => {
      const scores = scoresById.get(m.id);
      return scores ? { ...m, scoreA: scores[0], scoreB: scores[1], completed: true } : m;
    }),
  };
}

function makeState({ qual = [], bracket = null, startTime = null } = {}) {
  return {
    qualification: { matches: qualMatches(qual) },
    elimination: { bracket },
    timeline: { startTime, matchDurationMin: 5, gapMin: 1, fieldCount: 1 },
  };
}

describe('getTournamentPhase', () => {
  it('is setup when there are no Qualification Matches and no bracket', () => {
    expect(getTournamentPhase(makeState())).toBe('setup');
  });

  it('is qualification while any Qualification Match is incomplete', () => {
    expect(getTournamentPhase(makeState({ qual: [true, false] }))).toBe('qualification');
  });

  it('is alliance-selection once every Qualification Match is complete and there is no bracket', () => {
    expect(getTournamentPhase(makeState({ qual: [true, true] }))).toBe('alliance-selection');
  });

  it('is elimination while any played Elimination Match is undecided', () => {
    expect(getTournamentPhase(makeState({ qual: [true], bracket: threeAllianceBracket([[5, 3]]) }))).toBe('elimination');
  });

  it('is complete once every played Elimination Match has a winner (Byes are never played)', () => {
    expect(getTournamentPhase(makeState({ qual: [true], bracket: threeAllianceBracket([[5, 3], [4, 2]]) }))).toBe('complete');
  });

  it('is not complete when the Final was marked complete with a tie', () => {
    expect(getTournamentPhase(makeState({ qual: [true], bracket: threeAllianceBracket([[5, 3], [4, 4]]) }))).toBe('elimination');
  });

  it('is not complete when an earlier tie left the Final with a TBD side', () => {
    expect(getTournamentPhase(makeState({ qual: [true], bracket: threeAllianceBracket([[3, 3], [4, 2]]) }))).toBe('elimination');
  });

  it('has a display label for every phase', () => {
    expect(PHASE_LABELS).toEqual({
      setup: 'Setup',
      qualification: 'Qualification',
      'alliance-selection': 'Alliance Selection',
      elimination: 'Elimination',
      complete: 'Complete',
    });
  });
});

describe('getMatchProgress', () => {
  it('shows the Current Match position out of all Qualification Matches during Qualification', () => {
    expect(getMatchProgress(makeState({ qual: [true, true, false, false] }))).toBe('Match 3 of 4');
  });

  it('counts by Current Match position even when later matches were completed out of order', () => {
    expect(getMatchProgress(makeState({ qual: [true, false, true, false] }))).toBe('Match 2 of 4');
  });

  it('shows the next undecided Elimination Match number out of played matches during Elimination', () => {
    expect(getMatchProgress(makeState({ qual: [true], bracket: threeAllianceBracket() }))).toBe('Elimination 1 of 2');
    expect(getMatchProgress(makeState({ qual: [true], bracket: threeAllianceBracket([[5, 3]]) }))).toBe('Elimination 2 of 2');
  });

  it('does not count a tied Elimination Match as decided', () => {
    expect(getMatchProgress(makeState({ qual: [true], bracket: threeAllianceBracket([[3, 3]]) }))).toBe('Elimination 1 of 2');
  });

  it('is null in phases with no match in progress', () => {
    expect(getMatchProgress(makeState())).toBeNull();
    expect(getMatchProgress(makeState({ qual: [true] }))).toBeNull();
    expect(getMatchProgress(makeState({ qual: [true], bracket: threeAllianceBracket([[5, 3], [4, 2]]) }))).toBeNull();
  });
});

describe('getCurrentMatchTime', () => {
  it("is the Current Match's Match Time", () => {
    const state = makeState({ qual: [true, true, false], startTime: 1000 });
    expect(getCurrentMatchTime(state)).toBe(1000 + 2 * 6 * MINUTE);
  });

  it('is null when there is no Start Time', () => {
    expect(getCurrentMatchTime(makeState({ qual: [false] }))).toBeNull();
  });

  it('is null when there is no Current Match', () => {
    expect(getCurrentMatchTime(makeState({ qual: [true], startTime: 1000 }))).toBeNull();
    expect(getCurrentMatchTime(makeState({ startTime: 1000 }))).toBeNull();
  });
});

describe('getScheduleDrift', () => {
  const matchTime = 10 * 60 * MINUTE;

  it('is null when there is no Match Time', () => {
    expect(getScheduleDrift(matchTime, null)).toBeNull();
  });

  it('is on schedule within ±1 minute either side', () => {
    expect(getScheduleDrift(matchTime, matchTime)).toEqual({ status: 'on-schedule', minutes: 0 });
    expect(getScheduleDrift(matchTime + MINUTE, matchTime)).toEqual({ status: 'on-schedule', minutes: 0 });
    expect(getScheduleDrift(matchTime - MINUTE, matchTime)).toEqual({ status: 'on-schedule', minutes: 0 });
  });

  it('is behind when now is past the Match Time, in whole minutes', () => {
    expect(getScheduleDrift(matchTime + 4 * MINUTE + 10 * 1000, matchTime)).toEqual({ status: 'behind', minutes: 4 });
  });

  it('is ahead when now is before the Match Time', () => {
    expect(getScheduleDrift(matchTime - 3 * MINUTE, matchTime)).toEqual({ status: 'ahead', minutes: 3 });
  });

  it('rounds to whole minutes, so anything rounding to 1 min is still on schedule', () => {
    expect(getScheduleDrift(matchTime + MINUTE + 29 * 1000, matchTime)).toEqual({ status: 'on-schedule', minutes: 0 });
    expect(getScheduleDrift(matchTime + MINUTE + 31 * 1000, matchTime)).toEqual({ status: 'behind', minutes: 2 });
  });
});

describe('formatScheduleDrift', () => {
  it('formats each drift status', () => {
    expect(formatScheduleDrift({ status: 'on-schedule', minutes: 0 })).toBe('On schedule');
    expect(formatScheduleDrift({ status: 'behind', minutes: 4 })).toBe('4 min behind');
    expect(formatScheduleDrift({ status: 'ahead', minutes: 2 })).toBe('2 min ahead');
  });

  it('is null for no drift', () => {
    expect(formatScheduleDrift(null)).toBeNull();
  });
});
