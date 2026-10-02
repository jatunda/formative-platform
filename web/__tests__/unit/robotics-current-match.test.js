import { describe, it, expect } from 'vitest';
import { getInferredCurrentMatchIndex, getCurrentMatchIndex, getUpNextMatchIndex } from '../../robotics/current-match.js';

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

describe('getCurrentMatchIndex', () => {
  it('uses the inferred match when no pin is set', () => {
    expect(getCurrentMatchIndex(matches([true, false, false]), null)).toBe(1);
  });

  it('uses the pinned index when a pin is set', () => {
    expect(getCurrentMatchIndex(matches([false, false, false]), 2)).toBe(2);
  });

  it('falls back to inferred if the pinned match is already complete', () => {
    expect(getCurrentMatchIndex(matches([true, false, true]), 0)).toBe(1);
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
