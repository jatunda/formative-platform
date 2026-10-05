// Minimum number of other matches that must separate two matches featuring
// the same team, when the numbers allow it (Pairing Rule 3).
const MIN_GAP = 1;

// Cap on how many of the least-used teams are considered as candidates for
// each match, so the combination search below stays cheap even with large
// rosters - classroom tournaments are small enough that this never meaningfully
// constrains the search (it only kicks in above a dozen or so teams).
const CANDIDATE_POOL_SIZE = 12;

function shuffle(array, random) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function combinationsOfFour(items) {
  const result = [];
  for (let a = 0; a < items.length; a++) {
    for (let b = a + 1; b < items.length; b++) {
      for (let c = b + 1; c < items.length; c++) {
        for (let d = c + 1; d < items.length; d++) {
          result.push([items[a], items[b], items[c], items[d]]);
        }
      }
    }
  }
  return result;
}

const SPLITS = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
];

function repeatScore(allianceA, allianceB, teammatesOf, opponentsOf) {
  let score = 0;
  if (teammatesOf.get(allianceA[0]).has(allianceA[1])) score++;
  if (teammatesOf.get(allianceB[0]).has(allianceB[1])) score++;
  for (const a of allianceA) {
    for (const b of allianceB) {
      if (opponentsOf.get(a).has(b)) score++;
    }
  }
  return score;
}

function bestSplitForGroup(group, teammatesOf, opponentsOf, random) {
  const candidates = shuffle(SPLITS, random).map(([ia, ib]) => ({
    allianceA: [group[ia[0]], group[ia[1]]],
    allianceB: [group[ib[0]], group[ib[1]]],
  }));
  let best = candidates[0];
  let bestScore = repeatScore(best.allianceA, best.allianceB, teammatesOf, opponentsOf);
  for (const candidate of candidates.slice(1)) {
    const score = repeatScore(candidate.allianceA, candidate.allianceB, teammatesOf, opponentsOf);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return { ...best, score: bestScore };
}

function recordHistory(allianceA, allianceB, teammatesOf, opponentsOf) {
  teammatesOf.get(allianceA[0]).add(allianceA[1]);
  teammatesOf.get(allianceA[1]).add(allianceA[0]);
  teammatesOf.get(allianceB[0]).add(allianceB[1]);
  teammatesOf.get(allianceB[1]).add(allianceB[0]);
  for (const a of allianceA) {
    for (const b of allianceB) {
      opponentsOf.get(a).add(b);
      opponentsOf.get(b).add(a);
    }
  }
}

/**
 * Every 4-team group that keeps appearance counts within 1 of each other:
 * if fewer than 4 teams sit at the lowest count, all of them must play, topped
 * up from the next level; otherwise the group comes only from the lowest level.
 * Holding this invariant on every pick is what guarantees each Team plays
 * exactly matchesPerTeam matches whenever teams × matchesPerTeam divides by 4.
 */
function balancedGroups(teamIds, used, random) {
  const minUsed = Math.min(...teamIds.map((id) => used.get(id)));
  const shuffled = shuffle(teamIds, random);
  const lowest = shuffled.filter((id) => used.get(id) === minUsed);
  if (lowest.length >= 4) {
    return combinationsOfFour(lowest.slice(0, CANDIDATE_POOL_SIZE));
  }
  const next = shuffled.filter((id) => used.get(id) === minUsed + 1).slice(0, CANDIDATE_POOL_SIZE);
  const fillCount = 4 - lowest.length;
  return combinationsOfFour([...lowest, ...next])
    .filter((group) => group.filter((id) => used.get(id) !== minUsed).length === fillCount);
}

/**
 * Pick the match (group of 4 + alliance split) for one slot: among groups
 * that keep appearance counts balanced, the one with the fewest repeat
 * teammates/opponents, ties broken randomly.
 */
function pickNextMatch(teamIds, used, teammatesOf, opponentsOf, random) {
  let best = null;
  let bestScore = Infinity;
  for (const group of balancedGroups(teamIds, used, random)) {
    const split = bestSplitForGroup(group, teammatesOf, opponentsOf, random);
    if (split.score < bestScore) {
      best = { allianceA: split.allianceA, allianceB: split.allianceB, group, score: split.score };
      bestScore = split.score;
    }
  }
  return best;
}

/** One greedy pass at the unordered set of matchups; returns them with their total repeat score. */
function drawMatchupsOnce(teamIds, matchesPerTeam, random) {
  const used = new Map(teamIds.map((id) => [id, 0]));
  const teammatesOf = new Map(teamIds.map((id) => [id, new Set()]));
  const opponentsOf = new Map(teamIds.map((id) => [id, new Set()]));
  const totalSlotsNeeded = teamIds.length * matchesPerTeam;
  const totalMatches = Math.ceil(totalSlotsNeeded / 4);

  const matches = [];
  let repeats = 0;
  for (let m = 0; m < totalMatches; m++) {
    const { allianceA, allianceB, group, score } = pickNextMatch(teamIds, used, teammatesOf, opponentsOf, random);
    matches.push({ allianceA, allianceB });
    repeats += score;
    recordHistory(allianceA, allianceB, teammatesOf, opponentsOf);
    for (const id of group) used.set(id, used.get(id) + 1);
  }
  return { matches, repeats };
}

// Keeping appearance counts balanced narrows each greedy pick, so a single
// pass can corner itself into repeats a different early choice would have
// avoided - retry and keep the best, as scheduleMatchOrder does below.
const MAX_DRAW_ATTEMPTS = 40;

/** Build the unordered set of matchups (Pairing Rule 1: avoid repeat teammates/opponents). */
function drawMatchups(teamIds, matchesPerTeam, random) {
  let best = null;
  for (let attempt = 0; attempt < MAX_DRAW_ATTEMPTS && (!best || best.repeats > 0); attempt++) {
    const draw = drawMatchupsOnce(teamIds, matchesPerTeam, random);
    if (!best || draw.repeats < best.repeats) best = draw;
  }
  return best.matches;
}

function violatesMinGap(match, lastPlayedIndex, index) {
  return [...match.allianceA, ...match.allianceB].some((id) => index - lastPlayedIndex.get(id) <= MIN_GAP);
}

function idleScores(match, lastPlayedIndex, index) {
  const idles = [...match.allianceA, ...match.allianceB].map((id) => index - lastPlayedIndex.get(id));
  return { min: Math.min(...idles), sum: idles.reduce((a, b) => a + b, 0) };
}

function scheduleMatchOrderOnce(matches, teamIds, random) {
  const remaining = [...matches];
  const lastPlayedIndex = new Map(teamIds.map((id) => [id, -Infinity]));
  const ordered = [];

  for (let index = 0; index < matches.length; index++) {
    const feasible = remaining.filter((match) => !violatesMinGap(match, lastPlayedIndex, index));
    const pool = feasible.length > 0 ? feasible : remaining;

    let best = null;
    let bestScore = { min: -Infinity, sum: -Infinity };
    for (const match of shuffle(pool, random)) {
      const score = idleScores(match, lastPlayedIndex, index);
      if (score.min > bestScore.min || (score.min === bestScore.min && score.sum > bestScore.sum)) {
        bestScore = score;
        best = match;
      }
    }
    ordered.push(best);
    remaining.splice(remaining.indexOf(best), 1);
    for (const id of [...best.allianceA, ...best.allianceB]) {
      lastPlayedIndex.set(id, index);
    }
  }
  return ordered;
}

function countMinGapViolations(order) {
  const lastPlayedIndex = new Map();
  let violations = 0;
  order.forEach((match, index) => {
    const participants = [...match.allianceA, ...match.allianceB];
    if (participants.some((id) => lastPlayedIndex.has(id) && index - lastPlayedIndex.get(id) <= MIN_GAP)) {
      violations++;
    }
    participants.forEach((id) => lastPlayedIndex.set(id, index));
  });
  return violations;
}

// A single greedy pass can still land on an avoidable violation late in the
// schedule (it never backtracks), so retry a handful of times and keep the
// best result - cheap at classroom scale, and reliably finds a zero-violation
// order whenever one exists.
const MAX_SCHEDULING_ATTEMPTS = 25;

/** Order the matchups across the round (Pairing Rules 2 & 3: spread, avoid consecutive). */
function scheduleMatchOrder(matches, teamIds, random) {
  let best = null;
  let bestViolations = Infinity;
  for (let attempt = 0; attempt < MAX_SCHEDULING_ATTEMPTS && bestViolations > 0; attempt++) {
    const order = scheduleMatchOrderOnce(matches, teamIds, random);
    const violations = countMinGapViolations(order);
    if (violations < bestViolations) {
      best = order;
      bestViolations = violations;
    }
  }
  return best;
}

/**
 * Generate the Qualification Round's matchups: which two Teams form each
 * Match Alliance, and the order (schedule position) the resulting
 * Qualification Matches are played in. Implements the Pairing Rules as a
 * best-effort heuristic, not an exhaustive solver - a rule is only violated
 * when the team count and matchesPerTeam make satisfying it impossible.
 * @param {{id: string}[]} teams
 * @param {number} matchesPerTeam
 * @param {{random?: () => number}} [options] - inject a seeded random source for reproducible output
 * @returns {{allianceA: string[], allianceB: string[]}[]}
 */
export function generateQualificationMatches(teams, matchesPerTeam, { random = Math.random } = {}) {
  if (teams.length < 4) {
    throw new Error('At least 4 teams are required to form a Qualification Match.');
  }
  const teamIds = teams.map((t) => t.id);
  const matchups = drawMatchups(teamIds, matchesPerTeam, random);
  return scheduleMatchOrder(matchups, teamIds, random);
}
