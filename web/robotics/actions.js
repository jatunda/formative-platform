// @ts-check
import {
  addTeam,
  updateTeam,
  removeTeam,
  getRosterBlockReason,
  canRegenerateMatchups,
  regenerateMatchups,
  setMatchesPerTeam,
  setTimelineConfig,
  formPlayoffAlliance,
  declineTeam,
  undoDecline,
  movePlayoffAlliance,
  removePlayoffAlliance,
  setBracketConfig,
  startFinals,
  discardBracket,
} from './state.js';
import { getAllianceSelectionBlockReason } from './alliance-selection.js';

const REGENERATE_LOCKED_MESSAGE = 'Locked — a Qualification Match is already complete. Use Reset Results or Reset Everything / New Tournament first.';

/**
 * @typedef {{type: string, [field: string]: *}} TournamentAction
 * @typedef {{captainOverride: string|null}} Screen
 * @typedef {object} ActionHandler
 * @property {(state: *, action: TournamentAction) => (string|null)} [blockReason]
 * @property {(state: *, action: TournamentAction) => *} [apply] - the new Tournament
 * @property {(state: *, action: TournamentAction) => {state: *, outcome: *}} [applyWithOutcome] - for an
 *   action whose caller needs to know what it did, the new Tournament and that report
 * @property {(screen: Screen, action: TournamentAction) => Screen} [nextScreen] - the screen state after it
 */

/** Patches a Team's Members, computed from the Team as it is now. */
function updateMembers(state, teamId, change) {
  const team = state.teams.find((t) => t.id === teamId);
  return team ? updateTeam(state, teamId, { members: change(team.members) }) : state;
}

/** Alliance Selection actions are blocked by the rule keyed by their own type. */
function selectionBlockReason(state, action) {
  return getAllianceSelectionBlockReason(state, action.type, action);
}

/** @type {Record<string, ActionHandler>} */
const HANDLERS = {
  'add-team': {
    blockReason: getRosterBlockReason,
    apply: (state, { name, members }) => addTeam(state, { name, members }),
  },
  'remove-team': {
    blockReason: getRosterBlockReason,
    apply: (state, { teamId }) => removeTeam(state, teamId),
  },
  'rename-team': {
    apply: (state, { teamId, name }) => updateTeam(state, teamId, { name }),
  },
  'add-member': {
    apply: (state, { teamId, member }) => updateMembers(state, teamId, (members) => [...members, member]),
  },
  'remove-member': {
    apply: (state, { teamId, index }) => updateMembers(state, teamId, (members) => members.filter((_, i) => i !== index)),
  },
  'set-matches-per-team': {
    apply: (state, { matchesPerTeam }) => setMatchesPerTeam(state, matchesPerTeam),
  },
  'set-timeline-config': {
    apply: (state, { patch }) => setTimelineConfig(state, patch),
  },
  'regenerate-matchups': {
    blockReason: (state) => (canRegenerateMatchups(state) ? null : REGENERATE_LOCKED_MESSAGE),
    apply: (state) => regenerateMatchups(state),
  },
  // The teacher's one-turn Alliance Captain override: screen state only, never saved.
  'set-captain-override': {
    nextScreen: (screen, { teamId }) => ({ ...screen, captainOverride: teamId }),
  },
  // A Captain picking itself forms a single-Team alliance. Forming an alliance ends the turn,
  // and with it any Captain override.
  pick: {
    blockReason: selectionBlockReason,
    apply: (state, { captainId, partnerId }) => formPlayoffAlliance(state, captainId, partnerId),
    nextScreen: (screen) => ({ ...screen, captainOverride: null }),
  },
  decline: {
    blockReason: selectionBlockReason,
    apply: (state, { teamId }) => declineTeam(state, teamId),
  },
  'undo-decline': {
    blockReason: selectionBlockReason,
    apply: (state, { teamId }) => undoDecline(state, teamId),
  },
  'move-alliance': {
    blockReason: selectionBlockReason,
    apply: (state, { allianceId, direction }) => movePlayoffAlliance(state, allianceId, direction),
  },
  'remove-alliance': {
    blockReason: selectionBlockReason,
    apply: (state, { allianceId }) => removePlayoffAlliance(state, allianceId),
  },
  'set-bracket-size': {
    blockReason: selectionBlockReason,
    apply: (state, { bracketSize }) => setBracketConfig(state, { bracketSize }),
  },
  'set-third-place': {
    blockReason: selectionBlockReason,
    apply: (state, { includeThirdPlace }) => setBracketConfig(state, { includeThirdPlace }),
  },
  // Short of Bracket Size it builds nothing until confirmedShort; the outcome says which happened.
  'start-finals': {
    blockReason: selectionBlockReason,
    applyWithOutcome: (state, { confirmedShort }) => {
      const { state: next, started, shortBy } = startFinals(state, { confirmedShort });
      return { state: next, outcome: { started, shortBy } };
    },
  },
  'discard-bracket': {
    apply: (state) => discardBracket(state),
  },
};

function handlerFor(action) {
  const handler = HANDLERS[action.type];
  if (!handler) throw new Error(`Unknown tournament action: ${action.type}`);
  return handler;
}

/**
 * Why a named action can't happen right now, as the toast to show, or null when it's allowed.
 * @param {*} state - the Tournament
 * @param {TournamentAction} action
 * @returns {string|null}
 */
export function getActionBlockReason(state, action) {
  return handlerFor(action).blockReason?.(state, action) ?? null;
}

/**
 * The one entry point for a named tournament action: checks its block reason, then applies it
 * to the Tournament and to the screen state it owns. A blocked action changes nothing and
 * reports why. `outcome` is set only by actions that report what they did (Start Finals).
 * @param {*} state - the Tournament
 * @param {Screen} screen
 * @param {TournamentAction} action
 * @returns {{state: *, screen: Screen, blockReason: string|null, outcome?: *}}
 */
export function applyTournamentAction(state, screen, action) {
  const blockReason = getActionBlockReason(state, action);
  if (blockReason) return { state, screen, blockReason };
  const handler = handlerFor(action);
  const nextScreen = handler.nextScreen?.(screen, action) ?? screen;
  if (handler.applyWithOutcome) {
    const { state: next, outcome } = handler.applyWithOutcome(state, action);
    return { state: next, screen: nextScreen, blockReason: null, outcome };
  }
  return { state: handler.apply?.(state, action) ?? state, screen: nextScreen, blockReason: null };
}
