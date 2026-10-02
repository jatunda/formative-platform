import { describe, it, expect } from 'vitest';
import {
  computeMatchTime,
  computeTotalDurationMinutes,
  computeStartTimeFromEndTime,
  estimateEliminationMatchCount,
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
