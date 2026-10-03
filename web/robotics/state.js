import { generateQualificationMatches } from './pairing-draw.js';
import { buildBracket, isBracketComplete, getPlacements } from './bracket.js';

let idCounter = 0;
function generateId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/**
 * The blank Tournament state: no Teams, default Qualification/Timeline
 * config, no Elimination Bracket. See web/robotics/CONTEXT.md for the
 * vocabulary behind every field here.
 * @returns {object}
 */
export function createInitialState() {
  return {
    teams: [],
    qualification: {
      matchesPerTeam: 3,
      matches: [],
    },
    timeline: {
      mode: 'forward',
      startTime: null,
      endTime: null,
      matchDurationMin: 4,
      gapMin: 1,
      fieldCount: 1,
      estimatedBracketSize: 8,
      estimatedThirdPlace: false,
    },
    elimination: {
      bracketSize: null,
      includeThirdPlace: true,
      alliances: [],
      seeds: {},
      bracket: null,
    },
    podium: {
      revealedCount: 0,
      revealedFor: null,
    },
  };
}

// ---- Teams ----

export function addTeam(state, { name, members = [] }) {
  const team = { id: generateId('team'), name, members: [...members] };
  return { ...state, teams: [...state.teams, team] };
}

export function updateTeam(state, teamId, patch) {
  return {
    ...state,
    teams: state.teams.map((t) => (t.id === teamId ? { ...t, ...patch } : t)),
  };
}

export function removeTeam(state, teamId) {
  return { ...state, teams: state.teams.filter((t) => t.id !== teamId) };
}

// ---- Qualification ----

export function setMatchesPerTeam(state, matchesPerTeam) {
  return { ...state, qualification: { ...state.qualification, matchesPerTeam } };
}

/** Regenerating matchups is destructive, so it's locked once any Qualification Match is complete. */
export function canRegenerateMatchups(state) {
  return state.qualification.matches.every((m) => !m.completed);
}

/** Whether every Team would play the same number of Qualification Matches for this roster size and matchesPerTeam. */
export function hasEvenMatchCounts(teamCount, matchesPerTeam) {
  return (teamCount * matchesPerTeam) % 4 === 0;
}

/**
 * Nearby matchesPerTeam values (excluding the current one) that would give every
 * Team an equal match count for this roster size, nearest first.
 * @param {number} teamCount
 * @param {number} matchesPerTeam
 * @param {number} [limit]
 * @returns {number[]}
 */
export function suggestEvenMatchesPerTeam(teamCount, matchesPerTeam, limit = 2) {
  const suggestions = [];
  for (let delta = 1; suggestions.length < limit && delta <= 4 * (teamCount + matchesPerTeam + 1); delta++) {
    const lower = matchesPerTeam - delta;
    const higher = matchesPerTeam + delta;
    if (lower > 0 && hasEvenMatchCounts(teamCount, lower)) suggestions.push(lower);
    if (suggestions.length >= limit) break;
    if (hasEvenMatchCounts(teamCount, higher)) suggestions.push(higher);
  }
  return suggestions.sort((a, b) => a - b);
}

export function regenerateMatchups(state, { random } = {}) {
  if (!canRegenerateMatchups(state)) {
    throw new Error('Cannot regenerate matchups once a Qualification Match is complete. Reset results first.');
  }
  const raw = generateQualificationMatches(state.teams, state.qualification.matchesPerTeam, random ? { random } : {});
  const matches = raw.map((m) => ({
    id: generateId('qm'),
    allianceA: m.allianceA,
    allianceB: m.allianceB,
    scoreA: null,
    scoreB: null,
    completed: false,
    noShow: {},
  }));
  return { ...state, qualification: { ...state.qualification, matches } };
}

export function recordQualificationResult(state, matchIndex, { scoreA, scoreB }) {
  const matches = state.qualification.matches.map((m, i) =>
    i === matchIndex ? { ...m, scoreA, scoreB, completed: true } : m
  );
  return { ...state, qualification: { ...state.qualification, matches } };
}

/** Persists an in-progress (not yet "Mark Complete"-d) score so it survives a No-Show toggle's re-render. */
export function setQualificationDraftScore(state, matchIndex, field, value) {
  const matches = state.qualification.matches.map((m, i) =>
    i === matchIndex ? { ...m, [field]: value } : m
  );
  return { ...state, qualification: { ...state.qualification, matches } };
}

export function setQualificationNoShow(state, matchIndex, teamId, flag) {
  const matches = state.qualification.matches.map((m, i) => {
    if (i !== matchIndex) return m;
    const noShow = { ...m.noShow };
    if (flag) noShow[teamId] = true;
    else delete noShow[teamId];
    return { ...m, noShow };
  });
  return { ...state, qualification: { ...state.qualification, matches } };
}

/**
 * Whether the match at qualIndex can swap with its neighbor in the given
 * direction (-1 for up, +1 for down) - both must exist and be not-yet-complete.
 * @param {{completed: boolean}[]} matches
 * @param {number} qualIndex
 * @param {number} direction
 * @returns {boolean}
 */
export function canMoveQualificationMatch(matches, qualIndex, direction) {
  const other = qualIndex + direction;
  if (other < 0 || other >= matches.length) return false;
  return !matches[qualIndex].completed && !matches[other].completed;
}

/** Swaps the match at qualIndex with its neighbor (direction -1 up, +1 down); a no-op if canMoveQualificationMatch would be false. */
export function reorderQualificationMatch(state, qualIndex, direction) {
  const matches = state.qualification.matches;
  if (!canMoveQualificationMatch(matches, qualIndex, direction)) return state;
  const other = qualIndex + direction;
  const reordered = [...matches];
  [reordered[qualIndex], reordered[other]] = [reordered[other], reordered[qualIndex]];
  return { ...state, qualification: { ...state.qualification, matches: reordered } };
}

// ---- Timeline ----

export function setTimelineConfig(state, patch) {
  return { ...state, timeline: { ...state.timeline, ...patch } };
}

// ---- Elimination ----

export function formPlayoffAlliance(state, teamIdA, teamIdB) {
  const teamIds = teamIdA === teamIdB ? [teamIdA] : [teamIdA, teamIdB];
  const alreadyUsed = new Set(state.elimination.alliances.flatMap((a) => a.teamIds));
  if (teamIds.some((id) => alreadyUsed.has(id))) {
    throw new Error('A team can only belong to one Playoff Alliance.');
  }
  const alliance = { id: generateId('alliance'), teamIds };
  return { ...state, elimination: { ...state.elimination, alliances: [...state.elimination.alliances, alliance] } };
}

export function removePlayoffAlliance(state, allianceId) {
  const seeds = { ...state.elimination.seeds };
  for (const [seedNum, id] of Object.entries(seeds)) {
    if (id === allianceId) delete seeds[seedNum];
  }
  return {
    ...state,
    elimination: {
      ...state.elimination,
      alliances: state.elimination.alliances.filter((a) => a.id !== allianceId),
      seeds,
    },
  };
}

export function setBracketConfig(state, { bracketSize, includeThirdPlace }) {
  return { ...state, elimination: { ...state.elimination, bracketSize, includeThirdPlace } };
}

export function setSeed(state, seedNumber, allianceId) {
  return { ...state, elimination: { ...state.elimination, seeds: { ...state.elimination.seeds, [seedNumber]: allianceId } } };
}

export function generateBracket(state) {
  const { bracketSize, seeds, includeThirdPlace } = state.elimination;
  if (!bracketSize || bracketSize < 2) {
    throw new Error('Bracket Size must be at least 2 before generating the Elimination Bracket.');
  }
  const seedList = [];
  for (let i = 1; i <= bracketSize; i++) {
    if (!seeds[i]) {
      throw new Error(`Seed ${i} has no Playoff Alliance assigned.`);
    }
    seedList.push(seeds[i]);
  }
  const bracket = buildBracket({ bracketSize, seeds: seedList, includeThirdPlace });
  // A new bracket has new Placements, so any earlier Podium reveal no longer applies.
  return { ...state, elimination: { ...state.elimination, bracket }, podium: createInitialState().podium };
}

export function recordEliminationResult(state, matchId, { scoreA, scoreB }) {
  const bracket = {
    ...state.elimination.bracket,
    matches: state.elimination.bracket.matches.map((m) =>
      m.id === matchId ? { ...m, scoreA, scoreB, completed: true } : m
    ),
  };
  return { ...state, elimination: { ...state.elimination, bracket } };
}

/** Persists an in-progress (not yet "Mark Complete"-d) score so it survives a No-Show toggle's re-render. */
export function setEliminationDraftScore(state, matchId, field, value) {
  const bracket = {
    ...state.elimination.bracket,
    matches: state.elimination.bracket.matches.map((m) =>
      m.id === matchId ? { ...m, [field]: value } : m
    ),
  };
  return { ...state, elimination: { ...state.elimination, bracket } };
}

export function setEliminationNoShow(state, matchId, teamId, flag) {
  const bracket = {
    ...state.elimination.bracket,
    matches: state.elimination.bracket.matches.map((m) => {
      if (m.id !== matchId) return m;
      const noShow = { ...m.noShow };
      if (flag) noShow[teamId] = true;
      else delete noShow[teamId];
      return { ...m, noShow };
    }),
  };
  return { ...state, elimination: { ...state.elimination, bracket } };
}

// ---- Podium reveal ----

/** Identifies who holds each Placement, so a reveal can tell when an edited result has changed them. */
function placementsKey(bracket) {
  return getPlacements(bracket).map((p) => `${p.place}:${p.allianceId}`).join('|');
}

/** Places in reveal order: 3rd -> 2nd -> 1st, or 2nd -> 1st with no Third-Place Match. */
function revealOrder(bracket) {
  return getPlacements(bracket).map((p) => p.place).reverse();
}

/**
 * How many Placements are uncovered on the Podium. 0 until the bracket is
 * complete, and back to 0 if an edited result has changed the Placements
 * since they were revealed (or for a state saved before the Podium existed).
 */
export function getRevealedCount(state) {
  const { bracket } = state.elimination;
  if (!state.podium || !isBracketComplete(bracket) || state.podium.revealedFor !== placementsKey(bracket)) return 0;
  return state.podium.revealedCount;
}

/** @returns {Set<number>} the places currently uncovered on the Podium */
export function getRevealedPlaces(state) {
  const { bracket } = state.elimination;
  if (!isBracketComplete(bracket)) return new Set();
  return new Set(revealOrder(bracket).slice(0, getRevealedCount(state)));
}

/** @returns {number|null} the place the next reveal uncovers, or null when nothing is left to reveal (or the bracket isn't complete) */
export function getNextPlaceToReveal(state) {
  const { bracket } = state.elimination;
  if (!isBracketComplete(bracket)) return null;
  return revealOrder(bracket)[getRevealedCount(state)] ?? null;
}

/** Uncover the next Placement on the Podium; a no-op when getNextPlaceToReveal is null. */
export function revealNextPlacement(state) {
  if (getNextPlaceToReveal(state) === null) return state;
  return {
    ...state,
    podium: { revealedCount: getRevealedCount(state) + 1, revealedFor: placementsKey(state.elimination.bracket) },
  };
}

/** Replay reveal: re-cover every Podium block so the reveal can run again. */
export function replayReveal(state) {
  return { ...state, podium: createInitialState().podium };
}

// ---- Resets ----

/** Reset Results: clears Qualification/Elimination state, keeps the Team roster. */
export function resetResults(state) {
  const fresh = createInitialState();
  return { ...fresh, teams: state.teams };
}

/** New Tournament: clears everything, including the Team roster. */
export function newTournament(_state) {
  return createInitialState();
}
