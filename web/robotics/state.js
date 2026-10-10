import { generateQualificationMatches } from './pairing-draw.js';
import { buildBracket, isBracketComplete, getPlacements } from './bracket.js';
import { getAllianceSelectionBlockReason, getDeclinedTeamIds, getEffectiveBracketSize } from './alliance-selection.js';

let idCounter = 0;
function generateId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

// Qualification Matches are located by array index (reordered in place, never regenerated
// with new ids); Elimination Matches are located by id (generated once by the bracket, never
// reordered). byIndex/byId plus updateOneMatch/noShowPatch are what's actually shared between
// every Qualification/Elimination setter pair below - the two concepts themselves stay separate
// exports, matching their separate CONTEXT.md definitions.
function byIndex(index) {
  return (_match, i) => i === index;
}

function byId(matchId) {
  return (match) => match.id === matchId;
}

function updateOneMatch(matches, locator, makePatch) {
  return matches.map((m, i) => (locator(m, i) ? { ...m, ...makePatch(m) } : m));
}

function noShowPatch(match, teamId, flag) {
  const noShow = { ...match.noShow };
  if (flag) noShow[teamId] = true;
  else delete noShow[teamId];
  return { noShow };
}

/** No-ops if there's no Elimination Bracket yet (its default before startFinals, and again after resetResults/newTournament). */
function updateEliminationBracket(state, matchId, makePatch) {
  if (!state.elimination.bracket) return state;
  const bracket = {
    ...state.elimination.bracket,
    matches: updateOneMatch(state.elimination.bracket.matches, byId(matchId), makePatch),
  };
  return { ...state, elimination: { ...state.elimination, bracket } };
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
      declinedTeamIds: [],
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
  const matches = updateOneMatch(state.qualification.matches, byIndex(matchIndex), () => ({ scoreA, scoreB, completed: true }));
  return { ...state, qualification: { ...state.qualification, matches } };
}

/** Persists an in-progress (not yet "Mark Complete"-d) score so it survives a No-Show toggle's re-render. */
export function setQualificationDraftScore(state, matchIndex, field, value) {
  const matches = updateOneMatch(state.qualification.matches, byIndex(matchIndex), () => ({ [field]: value }));
  return { ...state, qualification: { ...state.qualification, matches } };
}

export function setQualificationNoShow(state, matchIndex, teamId, flag) {
  const matches = updateOneMatch(state.qualification.matches, byIndex(matchIndex), (m) => noShowPatch(m, teamId, flag));
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

/** @returns {string[]} the Team ids making up a Playoff Alliance, or [] if allianceId doesn't resolve. */
export function playoffAllianceTeamIds(state, allianceId) {
  return state.elimination.alliances.find((a) => a.id === allianceId)?.teamIds ?? [];
}

/** A no-op once selection is complete or while a Bracket exists (getAllianceSelectionBlockReason blocks 'pick'). */
export function formPlayoffAlliance(state, teamIdA, teamIdB) {
  if (getAllianceSelectionBlockReason(state, 'pick')) return state;
  const teamIds = teamIdA === teamIdB ? [teamIdA] : [teamIdA, teamIdB];
  const alreadyUsed = new Set(state.elimination.alliances.flatMap((a) => a.teamIds));
  if (teamIds.some((id) => alreadyUsed.has(id))) {
    throw new Error('A team can only belong to one Playoff Alliance.');
  }
  const alliance = { id: generateId('alliance'), teamIds };
  return { ...state, elimination: { ...state.elimination, alliances: [...state.elimination.alliances, alliance] } };
}

/** A no-op while a Bracket exists. */
export function removePlayoffAlliance(state, allianceId) {
  if (getAllianceSelectionBlockReason(state, 'remove')) return state;
  return {
    ...state,
    elimination: { ...state.elimination, alliances: state.elimination.alliances.filter((a) => a.id !== allianceId) },
  };
}

/**
 * Records that teamId Declined; it then counts against every Alliance Captain until undoDecline.
 * A no-op once selection is complete or while a Bracket exists (getAllianceSelectionBlockReason blocks 'decline').
 */
export function declineTeam(state, teamId) {
  const declinedTeamIds = getDeclinedTeamIds(state);
  if (declinedTeamIds.includes(teamId) || getAllianceSelectionBlockReason(state, 'decline')) return state;
  return { ...state, elimination: { ...state.elimination, declinedTeamIds: [...declinedTeamIds, teamId] } };
}

/** Undo a Decline. A no-op while a Bracket exists. */
export function undoDecline(state, teamId) {
  if (getAllianceSelectionBlockReason(state, 'undo-decline')) return state;
  const declinedTeamIds = getDeclinedTeamIds(state).filter((id) => id !== teamId);
  return { ...state, elimination: { ...state.elimination, declinedTeamIds } };
}

/**
 * Moves a Playoff Alliance one place up (direction -1) or down (+1) the list, changing
 * its Seed: alliance N in the list is Seed N. A no-op past either end, for an unknown id, or
 * while a Bracket exists.
 */
export function movePlayoffAlliance(state, allianceId, direction) {
  if (getAllianceSelectionBlockReason(state, 'move')) return state;
  const alliances = state.elimination.alliances;
  const index = alliances.findIndex((a) => a.id === allianceId);
  const other = index + direction;
  if (index === -1 || other < 0 || other >= alliances.length) return state;
  const reordered = [...alliances];
  [reordered[index], reordered[other]] = [reordered[other], reordered[index]];
  return { ...state, elimination: { ...state.elimination, alliances: reordered } };
}

/**
 * Sets Bracket Size and/or the Third-Place Match toggle; fields left out of the patch are kept.
 * A no-op when the patch would lower Bracket Size below the number of alliances formed, or
 * while a Bracket exists.
 */
export function setBracketConfig(state, patch) {
  if ('bracketSize' in patch && getAllianceSelectionBlockReason(state, 'set-bracket-size', patch)) return state;
  if ('includeThirdPlace' in patch && getAllianceSelectionBlockReason(state, 'set-third-place')) return state;
  return { ...state, elimination: { ...state.elimination, ...patch } };
}

/**
 * Start Finals: builds the Elimination Bracket from the first Bracket Size Playoff
 * Alliances in list order (alliance N is Seed N), using the effective Bracket Size (the
 * Estimated Bracket Size until one is set). With fewer alliances formed than that, Bracket
 * Size becomes the number formed. A no-op while getAllianceSelectionBlockReason blocks
 * 'start-finals' (fewer than 2 alliances, or a Bracket already exists). Tournaments saved before Seeds became list
 * order still carry a per-number `seeds` map; it's ignored here.
 */
export function startFinals(state) {
  if (getAllianceSelectionBlockReason(state, 'start-finals')) return state;
  const { alliances, includeThirdPlace } = state.elimination;
  const bracketSize = Math.min(getEffectiveBracketSize(state), alliances.length);
  const seeds = alliances.slice(0, bracketSize).map((a) => a.id);
  const bracket = buildBracket({ bracketSize, seeds, includeThirdPlace });
  // A new bracket has new Placements, so any earlier Podium reveal no longer applies.
  return { ...state, elimination: { ...state.elimination, bracketSize, bracket }, podium: createInitialState().podium };
}

/**
 * Discard Bracket: deletes the Elimination Bracket and its results, unlocking Alliance
 * Selection, and resets the Podium reveal. Alliances, Declines, Bracket Size, and the
 * Third-Place setting are kept, so Start Finals can build a new Bracket. A no-op with no Bracket.
 */
export function discardBracket(state) {
  if (!state.elimination.bracket) return state;
  return { ...state, elimination: { ...state.elimination, bracket: null }, podium: createInitialState().podium };
}

export function recordEliminationResult(state, matchId, { scoreA, scoreB }) {
  return updateEliminationBracket(state, matchId, () => ({ scoreA, scoreB, completed: true }));
}

/** Persists an in-progress (not yet "Mark Complete"-d) score so it survives a No-Show toggle's re-render. */
export function setEliminationDraftScore(state, matchId, field, value) {
  return updateEliminationBracket(state, matchId, () => ({ [field]: value }));
}

export function setEliminationNoShow(state, matchId, teamId, flag) {
  return updateEliminationBracket(state, matchId, (m) => noShowPatch(m, teamId, flag));
}

/**
 * All matches (Qualification then Elimination, Byes excluded since they
 * occupy no time slot) in schedule order, each annotated with its global
 * index for Match Time purposes.
 */
export function getAllMatchesInScheduleOrder(state) {
  const entries = state.qualification.matches.map((match, i) => ({ kind: 'qualification', match, qualIndex: i }));
  if (state.elimination.bracket) {
    const order = { 'third-place': Infinity - 1, final: Infinity };
    const sortedElimMatches = [...state.elimination.bracket.matches]
      .filter((m) => !m.isBye)
      .sort((a, b) => {
        const aKey = typeof a.round === 'number' ? a.round : order[a.round];
        const bKey = typeof b.round === 'number' ? b.round : order[b.round];
        return aKey - bKey || a.slot - b.slot;
      });
    for (const match of sortedElimMatches) {
      entries.push({ kind: 'elimination', match });
    }
  }
  return entries.map((entry, globalIndex) => ({ ...entry, globalIndex }));
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

/** Reset Results: clears Qualification/Elimination state (alliances and Declines included), keeps the Team roster. */
export function resetResults(state) {
  const fresh = createInitialState();
  return { ...fresh, teams: state.teams };
}

/** New Tournament: clears everything, including the Team roster. */
export function newTournament(_state) {
  return createInitialState();
}
