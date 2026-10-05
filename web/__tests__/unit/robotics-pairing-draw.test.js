import { describe, it, expect } from 'vitest';
import { generateQualificationMatches } from '../../robotics/pairing-draw.js';

function teams(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `Team ${i + 1}` }));
}

function appearanceCounts(matches) {
  const counts = new Map();
  for (const match of matches) {
    for (const id of [...match.allianceA, ...match.allianceB]) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  return counts;
}

describe('generateQualificationMatches', () => {
  it('throws with fewer than 4 teams', () => {
    expect(() => generateQualificationMatches(teams(3), 2)).toThrow();
  });

  it('produces ceil(teams*matchesPerTeam/4) matches', () => {
    const matches = generateQualificationMatches(teams(8), 4);
    expect(matches).toHaveLength(8); // 8*4/4 = 8
  });

  it('rounds up total matches when slots are not evenly divisible by 4', () => {
    const matches = generateQualificationMatches(teams(5), 2); // 10 slots -> ceil(10/4) = 3 matches = 12 slots
    expect(matches).toHaveLength(3);
  });

  it('gives every team exactly matchesPerTeam appearances when evenly divisible', () => {
    const matches = generateQualificationMatches(teams(8), 4);
    const counts = appearanceCounts(matches);
    for (const t of teams(8)) {
      expect(counts.get(t.id)).toBe(4);
    }
  });

  it('gives every team exactly matchesPerTeam appearances for any evenly divisible roster, across many draws', () => {
    // Configs where the old repeat-first greedy routinely left some Teams at
    // matchesPerTeam - 1 and others at + 1 despite an even slot count.
    for (const [teamCount, matchesPerTeam] of [[5, 4], [10, 2], [12, 4], [16, 5]]) {
      for (let run = 0; run < 10; run++) {
        const counts = appearanceCounts(generateQualificationMatches(teams(teamCount), matchesPerTeam));
        for (const t of teams(teamCount)) {
          expect(counts.get(t.id)).toBe(matchesPerTeam);
        }
      }
    }
  }, 15_000); // ~40 full draws; generous for slow CI runners

  it('balances appearances within 1 when not evenly divisible', () => {
    const matches = generateQualificationMatches(teams(5), 2);
    const counts = appearanceCounts(matches);
    const values = teams(5).map((t) => counts.get(t.id) || 0);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
  });

  it('each match has exactly two teams per alliance, four distinct teams total', () => {
    const matches = generateQualificationMatches(teams(10), 3);
    for (const match of matches) {
      expect(match.allianceA).toHaveLength(2);
      expect(match.allianceB).toHaveLength(2);
      const all = [...match.allianceA, ...match.allianceB];
      expect(new Set(all).size).toBe(4);
    }
  });

  it('avoids repeat teammates when enough teams exist to avoid it', () => {
    // 12 teams, 3 matches each: plenty of variety available, repeats should be avoidable entirely
    const matches = generateQualificationMatches(teams(12), 3);
    const teammatePairs = new Set();
    let repeats = 0;
    for (const match of matches) {
      const [a1, a2] = [...match.allianceA].sort();
      const [b1, b2] = [...match.allianceB].sort();
      for (const [x, y] of [[a1, a2], [b1, b2]]) {
        const key = `${x}|${y}`;
        if (teammatePairs.has(key)) repeats++;
        teammatePairs.add(key);
      }
    }
    expect(repeats).toBe(0);
  });

  it('avoids repeat opponents when enough teams exist to avoid it', () => {
    const matches = generateQualificationMatches(teams(12), 3);
    const opponentPairs = new Set();
    let repeats = 0;
    for (const match of matches) {
      for (const a of match.allianceA) {
        for (const b of match.allianceB) {
          const key = [a, b].sort().join('|');
          if (opponentPairs.has(key)) repeats++;
          opponentPairs.add(key);
        }
      }
    }
    expect(repeats).toBe(0);
  });

  it('falls back to allowing repeats when the numbers make avoiding them impossible', () => {
    // Exactly 4 teams: every match necessarily reuses the same 4 teams, so
    // repeat teammates/opponents are mathematically unavoidable past match 1.
    expect(() => generateQualificationMatches(teams(4), 5)).not.toThrow();
  });

  it('spreads a team matches across the schedule rather than clustering them, when avoidable', () => {
    const matches = generateQualificationMatches(teams(16), 4);
    const positionsByTeam = new Map();
    matches.forEach((match, index) => {
      for (const id of [...match.allianceA, ...match.allianceB]) {
        if (!positionsByTeam.has(id)) positionsByTeam.set(id, []);
        positionsByTeam.get(id).push(index);
      }
    });
    for (const positions of positionsByTeam.values()) {
      for (let i = 1; i < positions.length; i++) {
        // with 16 teams and plenty of matches, no team should ever be asked
        // to play in two matches back-to-back (gap of at least 1 match)
        expect(positions[i] - positions[i - 1]).toBeGreaterThan(1);
      }
    }
  });

  it('is reproducible given the same injected random source', () => {
    let seed = 1;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const run = () => {
      seed = 1;
      return generateQualificationMatches(teams(9), 3, { random: seededRandom });
    };
    expect(run()).toEqual(run());
  });
});
