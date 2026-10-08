import { describe, it, expect } from 'vitest';
import { bracketColumnSpacerGrowRatios } from '../../robotics/bracket-layout.js';

describe('bracketColumnSpacerGrowRatios', () => {
  it('returns just a leading and trailing spacer for a single match', () => {
    expect(bracketColumnSpacerGrowRatios(1)).toEqual([1, 1]);
  });

  it('puts a 2 between every pair of matches, bookended by 1s', () => {
    expect(bracketColumnSpacerGrowRatios(3)).toEqual([1, 2, 2, 1]);
  });

  it('scales to a large round count', () => {
    expect(bracketColumnSpacerGrowRatios(8)).toEqual([1, 2, 2, 2, 2, 2, 2, 2, 1]);
  });

  it('handles an odd match count the same way as any other', () => {
    expect(bracketColumnSpacerGrowRatios(5)).toEqual([1, 2, 2, 2, 2, 1]);
  });
});
