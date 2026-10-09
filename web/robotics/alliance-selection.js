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
 * The Alliance Captain: the highest-ranked Team in Standings (the same computation the
 * Standings tab uses) that is not yet in a Playoff Alliance.
 * @returns {string|null} a Team id, or null when no Team is left to pick
 */
export function getAllianceCaptain(state) {
  const standings = computeStandings(state.teams, state.qualification.matches);
  return standings.find((entry) => !allianceNumberOf(state, entry.teamId))?.teamId ?? null;
}

/**
 * How one Team's row reads on the Alliance Selection tab.
 * @returns {{status: 'in-alliance', allianceNumber: number}|{status: 'captain'}|{status: 'available'}}
 */
export function getSelectionRowStatus(state, teamId) {
  const allianceNumber = allianceNumberOf(state, teamId);
  if (allianceNumber) return { status: 'in-alliance', allianceNumber };
  if (teamId === getAllianceCaptain(state)) return { status: 'captain' };
  return { status: 'available' };
}

/**
 * Why an Alliance Selection action can't happen right now, as the toast to show, or null
 * when it's allowed. Actions: 'pick', 'move', 'remove', 'start-finals'.
 * @param {object} state
 * @param {string} action
 * @returns {string|null}
 */
export function getAllianceSelectionBlockReason(state, action) {
  if (action === 'start-finals' && state.elimination.alliances.length < MIN_ALLIANCES_TO_START_FINALS) {
    return `Form at least ${MIN_ALLIANCES_TO_START_FINALS} alliances before starting the Finals.`;
  }
  return null;
}
