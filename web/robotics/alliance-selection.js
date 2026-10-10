import { computeStandings } from './standings.js';

// Alliance Selection rules (see web/robotics/CONTEXT.md). Pure queries over Tournament
// state with no DOM code: the Alliance Selection tab only asks these questions, and the
// state actions that enforce a rule ask the same ones, so the two can never disagree.

const MIN_ALLIANCES_TO_START_FINALS = 2;

/** @returns {number} the 1-based alliance number (its Seed) of the Playoff Alliance holding teamId, or 0 if none does. */
function allianceNumberOf(state, teamId) {
  return state.elimination.alliances.findIndex((a) => a.teamIds.includes(teamId)) + 1;
}

/**
 * The Teams that have Declined; each Decline counts against every Alliance Captain until Undo.
 * Tournaments saved before Declines existed have no `declinedTeamIds`, read as none.
 * @returns {string[]}
 */
export function getDeclinedTeamIds(state) {
  return state.elimination.declinedTeamIds ?? [];
}

/** The Teams not yet in a Playoff Alliance, in Standings order (the same computation the Standings tab uses). */
function availableTeamIds(state) {
  return computeStandings(state.teams, state.qualification.matches)
    .map((entry) => entry.teamId)
    .filter((teamId) => !allianceNumberOf(state, teamId));
}

/**
 * How many Playoff Alliances Alliance Selection forms: the Bracket Size the teacher set, or
 * the Estimated Bracket Size from the Match Timeline settings until one is set.
 * @returns {number}
 */
export function getEffectiveBracketSize(state) {
  return effectiveBracketSizeFor(state, state.elimination.bracketSize);
}

/** The effective Bracket Size if Bracket Size were `bracketSize` (null or below 2 means unset). */
function effectiveBracketSizeFor(state, bracketSize) {
  return bracketSize >= 2 ? bracketSize : state.timeline.estimatedBracketSize;
}

/** Whether Alliance Selection is over: as many alliances have formed as the effective Bracket Size. */
export function isSelectionComplete(state) {
  return state.elimination.alliances.length >= getEffectiveBracketSize(state);
}

/**
 * The Alliance Captain: the highest-ranked Team in Standings that is not yet in a Playoff
 * Alliance. A Declined Team is eligible. `overrideId` is the teacher's one-turn override; it
 * wins while it names a Team still available, and otherwise the default rule applies.
 * @param {object} state
 * @param {string|null} [overrideId]
 * @returns {string|null} a Team id, or null when selection is complete or no Team is left to pick
 */
export function getAllianceCaptain(state, overrideId = null) {
  if (isSelectionComplete(state)) return null;
  const available = availableTeamIds(state);
  if (available.includes(overrideId)) return overrideId;
  return available[0] ?? null;
}

/**
 * The Teams the Captain could pick: every available Team other than the Captain, in
 * Standings order, each flagged when it has Declined (picking it then needs a confirm).
 * Empty when the Captain is the last available Team.
 * @returns {{teamId: string, declined: boolean}[]}
 */
export function getPickableTeams(state, captainId) {
  const declinedTeamIds = getDeclinedTeamIds(state);
  return availableTeamIds(state)
    .filter((teamId) => teamId !== captainId)
    .map((teamId) => ({ teamId, declined: declinedTeamIds.includes(teamId) }));
}

/**
 * How one Team's row reads on the Alliance Selection tab. A Declined Captain reads as the
 * Captain, and a Declined Team that was picked anyway reads as in its alliance. Once selection
 * is complete, every Team left over is not advancing, flagged when it had Declined. `captainId`
 * defaults to getAllianceCaptain's default rule; pass the overridden Captain when there is one.
 * @returns {{status: 'in-alliance', allianceNumber: number}|{status: 'captain'}|{status: 'declined'}|{status: 'available'}|{status: 'not-advancing', declined: boolean}}
 */
export function getSelectionRowStatus(state, teamId, captainId = getAllianceCaptain(state)) {
  const allianceNumber = allianceNumberOf(state, teamId);
  if (allianceNumber) return { status: 'in-alliance', allianceNumber };
  const declined = getDeclinedTeamIds(state).includes(teamId);
  if (isSelectionComplete(state)) return { status: 'not-advancing', declined };
  if (teamId === captainId) return { status: 'captain' };
  if (declined) return { status: 'declined' };
  return { status: 'available' };
}

/**
 * Why an Alliance Selection action can't happen right now, as the toast to show, or null
 * when it's allowed. Actions: 'pick', 'decline', 'undo-decline', 'move', 'remove',
 * 'start-finals', and 'set-bracket-size', which also takes the `bracketSize` being set
 * (null clears it back to the Estimated Bracket Size).
 * @param {object} state
 * @param {string} action
 * @param {{bracketSize?: number|null}} [args]
 * @returns {string|null}
 */
export function getAllianceSelectionBlockReason(state, action, { bracketSize } = {}) {
  const formed = state.elimination.alliances.length;
  if (action === 'start-finals' && formed < MIN_ALLIANCES_TO_START_FINALS) {
    return `Form at least ${MIN_ALLIANCES_TO_START_FINALS} alliances before starting the Finals.`;
  }
  if ((action === 'pick' || action === 'decline') && isSelectionComplete(state)) {
    return `All ${getEffectiveBracketSize(state)} alliances are formed. Raise Bracket Size to keep picking.`;
  }
  if (action === 'set-bracket-size') {
    if (effectiveBracketSizeFor(state, bracketSize) < formed) {
      return `${formed} alliances are already formed. Remove alliances before lowering Bracket Size below ${formed}.`;
    }
  }
  return null;
}
