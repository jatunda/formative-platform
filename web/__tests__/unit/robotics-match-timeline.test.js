import { describe, it, expect } from 'vitest';
import {
  computeMatchTime,
  computeTotalDurationMinutes,
  computeStartTimeFromEndTime,
  estimateEliminationMatchCount,
  matchField,
  getScheduledMatchCount,
  timeOfDayInputValue,
  timeOfDayToEpochMs,
  MINUTE_MS,
} from '../../robotics/match-timeline.js';

const START = new Date('2026-10-02T08:00:00Z').getTime();

describe('estimateEliminationMatchCount', () => {
  it('is bracketSize - 1 without a third-place match', () => {
    expect(estimateEliminationMatchCount(8, false)).toBe(7);
    expect(estimateEliminationMatchCount(6, false)).toBe(5);
    expect(estimateEliminationMatchCount(2, false)).toBe(1);
  });

  it('adds one when a third-place match is included', () => {
    expect(estimateEliminationMatchCount(8, true)).toBe(8);
  });
});

describe('computeMatchTime', () => {
  it('computes the time for the first match as the start time', () => {
    const timeline = { startTime: START, matchDurationMin: 4, gapMin: 1, fieldCount: 1 };
    expect(computeMatchTime(timeline, 0)).toBe(START);
  });

  it('returns null for every match index when no start time has been set yet', () => {
    const timeline = { startTime: null, matchDurationMin: 4, gapMin: 1, fieldCount: 1 };
    expect(computeMatchTime(timeline, 0)).toBeNull();
    expect(computeMatchTime(timeline, 1)).toBeNull();
    expect(computeMatchTime(timeline, 2)).toBeNull();
  });

  it('advances by duration+gap per slot with a single field', () => {
    const timeline = { startTime: START, matchDurationMin: 4, gapMin: 1, fieldCount: 1 };
    expect(computeMatchTime(timeline, 1)).toBe(START + 5 * 60 * 1000);
    expect(computeMatchTime(timeline, 2)).toBe(START + 10 * 60 * 1000);
  });

  it('groups matches into the same time slot when fieldCount > 1', () => {
    const timeline = { startTime: START, matchDurationMin: 4, gapMin: 1, fieldCount: 2 };
    expect(computeMatchTime(timeline, 0)).toBe(START);
    expect(computeMatchTime(timeline, 1)).toBe(START); // same slot, second field
    expect(computeMatchTime(timeline, 2)).toBe(START + 5 * 60 * 1000); // next slot
    expect(computeMatchTime(timeline, 3)).toBe(START + 5 * 60 * 1000);
  });
});

describe('computeTotalDurationMinutes', () => {
  it('computes total minutes for a single field with no trailing gap', () => {
    // 3 matches, 4 min + 1 min gap each, no gap after the last one
    expect(computeTotalDurationMinutes({ matchDurationMin: 4, gapMin: 1, fieldCount: 1 }, 3)).toBe(4 + 1 + 4 + 1 + 4);
  });

  it('computes total minutes across multiple fields by slot count', () => {
    // 4 matches, 2 fields -> 2 slots, 4 min + 1 min gap, no trailing gap
    expect(computeTotalDurationMinutes({ matchDurationMin: 4, gapMin: 1, fieldCount: 2 }, 4)).toBe(4 + 1 + 4);
  });

  it('returns 0 for zero matches', () => {
    expect(computeTotalDurationMinutes({ matchDurationMin: 4, gapMin: 1, fieldCount: 1 }, 0)).toBe(0);
  });
});

describe('computeStartTimeFromEndTime', () => {
  it('back-calculates a start time so the full timeline ends at endTime', () => {
    const endTime = START + 60 * 60 * 1000; // 1 hour later
    const timeline = { matchDurationMin: 4, gapMin: 1, fieldCount: 1 };
    const totalMinutes = 55; // arbitrary total duration for this test
    const result = computeStartTimeFromEndTime({ ...timeline, endTime }, totalMinutes);
    expect(result).toBe(endTime - totalMinutes * 60 * 1000);
  });
});

describe('matchField', () => {
  it('returns null when only one field runs - nothing to show', () => {
    expect(matchField(1, 0)).toBeNull();
    expect(matchField(1, 5)).toBeNull();
  });

  it('cycles matches across fields, 1-indexed', () => {
    expect(matchField(2, 0)).toBe(1);
    expect(matchField(2, 1)).toBe(2);
    expect(matchField(2, 2)).toBe(1);
    expect(matchField(2, 3)).toBe(2);
  });
});

describe('timeOfDayInputValue', () => {
  it('formats hours and minutes zero-padded to HH:MM', () => {
    expect(timeOfDayInputValue(new Date(2026, 9, 2, 9, 5).getTime())).toBe('09:05');
    expect(timeOfDayInputValue(new Date(2026, 9, 2, 23, 45).getTime())).toBe('23:45');
  });

  it('returns an empty string when unset', () => {
    expect(timeOfDayInputValue(null)).toBe('');
  });
});

describe('timeOfDayToEpochMs', () => {
  it('returns null for an empty string', () => {
    expect(timeOfDayToEpochMs('')).toBeNull();
  });

  it('combines the time-of-day with the reference date', () => {
    const referenceTime = new Date(2026, 9, 2, 12, 0).getTime();
    expect(timeOfDayToEpochMs('09:05', referenceTime)).toBe(new Date(2026, 9, 2, 9, 5).getTime());
  });

  it('stays on the reference date even when the time-of-day is near midnight', () => {
    // A reference time late in the evening combined with an early time-of-day doesn't roll
    // over to the next calendar day - the date always comes from the reference, not the clock.
    const referenceTime = new Date(2026, 9, 2, 23, 45).getTime();
    expect(timeOfDayToEpochMs('00:05', referenceTime)).toBe(new Date(2026, 9, 2, 0, 5).getTime());
  });

  it('defaults the reference time to now when omitted', () => {
    const before = Date.now();
    const result = timeOfDayToEpochMs('00:00');
    const now = new Date(before);
    expect(result).toBe(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0).getTime());
  });
});

describe('getScheduledMatchCount', () => {
  it('adds the estimated Elimination Match count before a bracket exists', () => {
    // estimateEliminationMatchCount(8, false) === 7
    expect(getScheduledMatchCount(12, null, 8, false)).toBe(19);
  });

  it('adds one more when the estimate includes a Third-Place Match', () => {
    expect(getScheduledMatchCount(12, null, 8, true)).toBe(20);
  });

  it('uses the actual bracket once one exists, excluding Byes, ignoring the estimate', () => {
    const bracket = { matches: [{ isBye: true }, {}, {}] };
    expect(getScheduledMatchCount(12, bracket, 8, false)).toBe(14);
  });
});
