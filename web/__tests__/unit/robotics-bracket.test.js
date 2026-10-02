import { describe, it, expect } from 'vitest';
import { nextPowerOfTwo, seedOrder, buildBracket, resolveMatchSides, getBracketWinner } from '../../robotics/bracket.js';

describe('nextPowerOfTwo', () => {
  it('returns the same number when already a power of two', () => {
    expect(nextPowerOfTwo(8)).toBe(8);
    expect(nextPowerOfTwo(2)).toBe(2);
  });

  it('rounds up to the next power of two otherwise', () => {
    expect(nextPowerOfTwo(6)).toBe(8);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(3)).toBe(4);
  });
});

describe('seedOrder', () => {
  it('produces the standard bracket seeding for 2', () => {
    expect(seedOrder(2)).toEqual([1, 2]);
  });

  it('produces the standard bracket seeding for 4', () => {
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
  });

  it('produces the standard bracket seeding for 8', () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
});

function alliances(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}`, teamIds: [`t${2 * i + 1}`, `t${2 * i + 2}`] }));
}

describe('buildBracket', () => {
  it('builds a power-of-two bracket with no byes', () => {
    const bracket = buildBracket({ bracketSize: 4, seeds: alliances(4).map((a) => a.id), includeThirdPlace: false });
    const round1 = bracket.matches.filter((m) => m.round === 1);
    expect(round1).toHaveLength(2);
    expect(round1.every((m) => !m.isBye)).toBe(true);
    const final = bracket.matches.find((m) => m.round === 'final');
    expect(final).toBeTruthy();
  });

  it('pads a non-power-of-two bracketSize and assigns byes to the top seeds', () => {
    const seeds = alliances(6).map((a) => a.id); // 6 -> padded to 8, 2 byes to seeds 1 and 2
    const bracket = buildBracket({ bracketSize: 6, seeds, includeThirdPlace: false });
    const round1 = bracket.matches.filter((m) => m.round === 1);
    const byeMatches = round1.filter((m) => m.isBye);
    expect(byeMatches).toHaveLength(2);
    // total *real* matches played = bracketSize - 1 regardless of byes;
    // byes still appear as structural entries so the bracket can render a "BYE" slot.
    expect(bracket.matches.filter((m) => m.round !== 'third-place' && !m.isBye)).toHaveLength(5);
  });

  it('total match count is bracketSize - 1 plus an optional third-place match', () => {
    const withoutThird = buildBracket({ bracketSize: 8, seeds: alliances(8).map((a) => a.id), includeThirdPlace: false });
    expect(withoutThird.matches).toHaveLength(7);

    const withThird = buildBracket({ bracketSize: 8, seeds: alliances(8).map((a) => a.id), includeThirdPlace: true });
    expect(withThird.matches).toHaveLength(8);
    expect(withThird.matches.some((m) => m.round === 'third-place')).toBe(true);
  });

  it('resolves round 1 sides directly from seeds', () => {
    const seeds = alliances(4).map((a) => a.id);
    const bracket = buildBracket({ bracketSize: 4, seeds, includeThirdPlace: false });
    const match = bracket.matches.find((m) => m.round === 1 && m.slot === 0);
    const sides = resolveMatchSides(bracket, match.id);
    // seedOrder(4) = [1,4,2,3] -> round1 pairs (seed1,seed4) and (seed2,seed3)
    expect(sides.allianceA).toBe(seeds[0]); // seed 1
    expect(sides.allianceB).toBe(seeds[3]); // seed 4
  });

  it('a bye advances the top seed to round 2 without a match being played', () => {
    const seeds = alliances(3).map((a) => a.id); // bracketSize 3 -> padded to 4, 1 bye for seed 1
    const bracket = buildBracket({ bracketSize: 3, seeds, includeThirdPlace: false });
    const round2 = bracket.matches.find((m) => m.round === 2 || m.round === 'final');
    const sides = resolveMatchSides(bracket, round2.id);
    expect([sides.allianceA, sides.allianceB]).toContain(seeds[0]);
  });

  it('round 2 participants resolve from round 1 winners once completed', () => {
    const seeds = alliances(4).map((a) => a.id);
    let bracket = buildBracket({ bracketSize: 4, seeds, includeThirdPlace: false });
    const [m1, m2] = bracket.matches.filter((m) => m.round === 1);
    bracket = {
      ...bracket,
      matches: bracket.matches.map((m) => {
        if (m.id === m1.id) return { ...m, scoreA: 50, scoreB: 10, completed: true };
        if (m.id === m2.id) return { ...m, scoreA: 5, scoreB: 60, completed: true };
        return m;
      }),
    };
    const final = bracket.matches.find((m) => m.round === 'final');
    const sides = resolveMatchSides(bracket, final.id);
    const sideA1 = resolveMatchSides(bracket, m1.id);
    const sideB2 = resolveMatchSides(bracket, m2.id);
    expect([sides.allianceA, sides.allianceB]).toContain(sideA1.allianceA); // winner of m1
    expect([sides.allianceA, sides.allianceB]).toContain(sideB2.allianceB); // winner of m2
  });

  it('third place match resolves from the two semifinal losers', () => {
    const seeds = alliances(4).map((a) => a.id);
    let bracket = buildBracket({ bracketSize: 4, seeds, includeThirdPlace: true });
    const [m1, m2] = bracket.matches.filter((m) => m.round === 1);
    bracket = {
      ...bracket,
      matches: bracket.matches.map((m) => {
        if (m.id === m1.id) return { ...m, scoreA: 50, scoreB: 10, completed: true };
        if (m.id === m2.id) return { ...m, scoreA: 5, scoreB: 60, completed: true };
        return m;
      }),
    };
    const thirdPlace = bracket.matches.find((m) => m.round === 'third-place');
    const sides = resolveMatchSides(bracket, thirdPlace.id);
    const sideM1 = resolveMatchSides(bracket, m1.id);
    const sideM2 = resolveMatchSides(bracket, m2.id);
    expect([sides.allianceA, sides.allianceB]).toContain(sideM1.allianceB); // loser of m1
    expect([sides.allianceA, sides.allianceB]).toContain(sideM2.allianceA); // loser of m2
  });

  it('getBracketWinner returns null until the final is complete', () => {
    const seeds = alliances(2).map((a) => a.id);
    const bracket = buildBracket({ bracketSize: 2, seeds, includeThirdPlace: false });
    expect(getBracketWinner(bracket)).toBeNull();
  });

  it('getBracketWinner returns the champion once the final is complete', () => {
    const seeds = alliances(2).map((a) => a.id);
    let bracket = buildBracket({ bracketSize: 2, seeds, includeThirdPlace: false });
    const final = bracket.matches.find((m) => m.round === 'final');
    bracket = {
      ...bracket,
      matches: bracket.matches.map((m) => (m.id === final.id ? { ...m, scoreA: 80, scoreB: 20, completed: true } : m)),
    };
    expect(getBracketWinner(bracket)).toBe(seeds[0]);
  });
});
