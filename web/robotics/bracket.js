// @ts-check
import { winningSide } from './match-result.js';

/**
 * An Elimination Bracket: its Seeds (index 0 = Seed 1) and its matches. Bracket Size and
 * whether a Third-Place Match is included live only in the Tournament's Elimination settings;
 * the matches already reflect both (Byes, and the Third-Place Match when there is one).
 * @typedef {{seeds: string[], matches: object[]}} Bracket
 */

/** Smallest power of two that is >= n. */
export function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard recursive tournament bracket seeding: for a bracket of size n
 * (a power of two), returns the seed numbers in the order they fill bracket
 * slots left-to-right, so that adjacent pairs are each round's matches and
 * top seeds never meet until as late as possible (e.g. seedOrder(8) ->
 * [1,8,4,5,2,7,3,6], i.e. 1v8, 4v5, 2v7, 3v6).
 * @param {number} n - a power of two
 * @returns {number[]}
 */
export function seedOrder(n) {
  if (n === 1) return [1];
  const prev = seedOrder(n / 2);
  const result = [];
  for (const s of prev) {
    result.push(s, n + 1 - s);
  }
  return result;
}

/**
 * Build an Elimination Bracket's match structure from a Bracket Size and an
 * ordered list of Seeds (index 0 = Seed 1). Non-power-of-two Bracket Sizes
 * pad to the next power of two, with the resulting empty slots resolved as
 * Byes for the top Seeds. Byes still appear in `matches` (flagged `isBye`)
 * so the bracket can render a "BYE" slot, even though no match is played.
 * @param {{bracketSize: number, seeds: string[], includeThirdPlace: boolean}} config
 * @returns {Bracket}
 */
export function buildBracket({ bracketSize, seeds, includeThirdPlace }) {
  const paddedSize = nextPowerOfTwo(bracketSize);
  const order = seedOrder(paddedSize);
  let matchIdCounter = 0;
  const matches = [];
  const rounds = [];

  const round1Ids = [];
  for (let i = 0; i < order.length; i += 2) {
    const seedA = order[i];
    const seedB = order[i + 1];
    const isBye = seedA > bracketSize || seedB > bracketSize;
    const id = `m${++matchIdCounter}`;
    matches.push({
      id,
      round: 1,
      slot: i / 2,
      seedA,
      seedB,
      isBye,
      fromMatch: null,
      resolveAs: null,
      scoreA: null,
      scoreB: null,
      completed: false,
      noShow: {},
    });
    round1Ids.push(id);
  }
  rounds.push(round1Ids);

  let prevRoundIds = round1Ids;
  let roundNumber = 2;
  while (prevRoundIds.length > 1) {
    const nextRoundIds = [];
    for (let i = 0; i < prevRoundIds.length; i += 2) {
      const id = `m${++matchIdCounter}`;
      matches.push({
        id,
        round: roundNumber,
        slot: i / 2,
        seedA: null,
        seedB: null,
        isBye: false,
        fromMatch: [prevRoundIds[i], prevRoundIds[i + 1]],
        resolveAs: 'winner',
        scoreA: null,
        scoreB: null,
        completed: false,
        noShow: {},
      });
      nextRoundIds.push(id);
    }
    rounds.push(nextRoundIds);
    prevRoundIds = nextRoundIds;
    roundNumber++;
  }

  rounds[rounds.length - 1].forEach((id) => {
    matches.find((m) => m.id === id).round = 'final';
  });
  const semifinalRound = rounds.length >= 2 ? rounds[rounds.length - 2] : null;

  if (includeThirdPlace && semifinalRound && semifinalRound.length === 2) {
    matches.push({
      id: `m${matchIdCounter + 1}`,
      round: 'third-place',
      slot: 0,
      seedA: null,
      seedB: null,
      isBye: false,
      fromMatch: [semifinalRound[0], semifinalRound[1]],
      resolveAs: 'loser',
      scoreA: null,
      scoreB: null,
      completed: false,
      noShow: {},
    });
  }

  return { seeds: [...seeds], matches };
}

function findMatch(bracket, matchId) {
  return bracket.matches.find((m) => m.id === matchId);
}

/**
 * Resolve the two Playoff Alliances occupying a match's sides. A side is
 * `null` until it can be determined (round 1 always resolves immediately;
 * later rounds resolve once their feeder matches are decided or are Byes).
 * @param {Bracket} bracket
 * @param {string} matchId
 * @returns {{allianceA: string|null, allianceB: string|null}}
 */
export function resolveMatchSides(bracket, matchId) {
  const match = findMatch(bracket, matchId);
  if (match.fromMatch === null) {
    return {
      allianceA: bracket.seeds[match.seedA - 1] ?? null,
      allianceB: bracket.seeds[match.seedB - 1] ?? null,
    };
  }
  const resolver = match.resolveAs === 'loser' ? getMatchLoser : getMatchWinner;
  return {
    allianceA: resolver(bracket, match.fromMatch[0]),
    allianceB: resolver(bracket, match.fromMatch[1]),
  };
}

/** The alliance that won a match, or null if not yet decided. Byes resolve immediately. */
export function getMatchWinner(bracket, matchId) {
  const match = findMatch(bracket, matchId);
  const { allianceA, allianceB } = resolveMatchSides(bracket, matchId);
  if (match.isBye) return allianceA ?? allianceB;
  const side = winningSide(match);
  if (side === null) return null;
  return side === 'A' ? allianceA : allianceB;
}

/** The alliance that lost a match, or null if not yet decided (or there is no loser, as with a Bye). */
export function getMatchLoser(bracket, matchId) {
  const match = findMatch(bracket, matchId);
  if (match.isBye) return null;
  const { allianceA, allianceB } = resolveMatchSides(bracket, matchId);
  const side = winningSide(match);
  if (side === null) return null;
  return side === 'A' ? allianceB : allianceA;
}

/** The Tournament champion once the final is complete, else null. */
export function getBracketWinner(bracket) {
  const final = bracket.matches.find((m) => m.round === 'final');
  return final ? getMatchWinner(bracket, final.id) : null;
}

/** How an Elimination Match is named to the teacher: "Round R · Match S", "Third-Place Match", or "Final". */
export function eliminationMatchLabel(match) {
  if (match.round === 'final') return 'Final';
  if (match.round === 'third-place') return 'Third-Place Match';
  return `Round ${match.round} · Match ${match.slot + 1}`;
}

/** Elimination Matches actually played - Byes occupy no slot and never complete. */
export function getPlayedEliminationMatches(bracket) {
  return bracket.matches.filter((m) => !m.isBye);
}

// Numbered rounds first, then the Third-Place Match, then the Final. Finite
// keys, since Infinity - 1 === Infinity would tie the two named rounds.
const NAMED_ROUND_KEY = { 'third-place': Number.MAX_SAFE_INTEGER - 1, final: Number.MAX_SAFE_INTEGER };

function roundKey(match) {
  return typeof match.round === 'number' ? match.round : NAMED_ROUND_KEY[match.round];
}

function compareBracketOrder(a, b) {
  return roundKey(a) - roundKey(b) || a.slot - b.slot;
}

/**
 * Played Elimination Matches in bracket order: by round, then slot, with the
 * Third-Place Match before the Final. The one definition of bracket order,
 * shared by the schedule and the Finals Current Match.
 */
export function getMatchesInBracketOrder(bracket) {
  return getPlayedEliminationMatches(bracket).sort(compareBracketOrder);
}

/**
 * Where a match's side comes from, while it isn't decided yet: "Winner of
 * Round 2 · Match 1" (or "Runner-up of …" for the Third-Place Match). Null for a
 * Round 1 side, which is a Seed rather than a feeder match.
 * @param {Bracket} bracket
 * @param {string} matchId
 * @param {'A'|'B'} side
 * @returns {string|null}
 */
export function sideSourceLabel(bracket, matchId, side) {
  const match = findMatch(bracket, matchId);
  if (match.fromMatch === null) return null;
  const feeder = findMatch(bracket, match.fromMatch[side === 'A' ? 0 : 1]);
  return `${match.resolveAs === 'loser' ? 'Runner-up' : 'Winner'} of ${eliminationMatchLabel(feeder)}`;
}

/**
 * How many played Elimination Matches (Third-Place Match included) are still
 * undecided. A match marked complete with a tie (or with a side still TBD)
 * has no winner, so it isn't decided.
 */
export function countUndecidedMatches(bracket) {
  return getPlayedEliminationMatches(bracket).filter((m) => getMatchWinner(bracket, m.id) == null).length;
}

/** Whether every played Elimination Match has a winner, so every Placement is decided. */
export function isBracketComplete(bracket) {
  return !!bracket && countUndecidedMatches(bracket) === 0;
}

/**
 * The decided Placements, in place order: 1st and 2nd from the Final, 3rd
 * from the Third-Place Match (only when one is included and decided).
 * @returns {{place: number, allianceId: string}[]}
 */
export function getPlacements(bracket) {
  const finalMatch = bracket.matches.find((m) => m.round === 'final');
  const thirdPlaceMatch = bracket.matches.find((m) => m.round === 'third-place');
  const candidates = [
    { place: 1, allianceId: getMatchWinner(bracket, finalMatch.id) },
    { place: 2, allianceId: getMatchLoser(bracket, finalMatch.id) },
    { place: 3, allianceId: thirdPlaceMatch ? getMatchWinner(bracket, thirdPlaceMatch.id) : null },
  ];
  return /** @type {{place: number, allianceId: string}[]} */ (candidates.filter((p) => p.allianceId));
}
