import { computeMatchTime, MINUTE_MS } from './match-timeline.js';
import { getCurrentMatchIndex } from './current-match.js';
import { getMatchWinner } from './bracket.js';

export const PHASE_LABELS = {
  setup: 'Setup',
  qualification: 'Qualification',
  'alliance-selection': 'Alliance Selection',
  elimination: 'Elimination',
  complete: 'Complete',
};

/** Elimination Matches actually played - Byes occupy no slot and never complete. */
function playedEliminationMatches(bracket) {
  return bracket.matches.filter((m) => !m.isBye);
}

/**
 * How many played Elimination Matches are decided. A match marked complete
 * with a tie (or with a side still TBD) has no winner, so it isn't decided.
 */
function decidedEliminationCount(bracket) {
  return playedEliminationMatches(bracket).filter((m) => getMatchWinner(bracket, m.id) != null).length;
}

/**
 * The Tournament's phase, derived purely from state: Setup (no matches) ->
 * Qualification -> Alliance Selection (every Qualification Match complete,
 * no bracket yet) -> Elimination -> Complete (every played Elimination
 * Match has a winner).
 * @returns {'setup'|'qualification'|'alliance-selection'|'elimination'|'complete'}
 */
export function getTournamentPhase(state) {
  const { bracket } = state.elimination;
  if (bracket) {
    return decidedEliminationCount(bracket) === playedEliminationMatches(bracket).length ? 'complete' : 'elimination';
  }
  const matches = state.qualification.matches;
  if (matches.length === 0) return 'setup';
  return matches.every((m) => m.completed) ? 'alliance-selection' : 'qualification';
}

/**
 * Match progress for the header: the Current Match's position during
 * Qualification ("Match 7 of 24"), the next undecided Elimination Match's
 * number during Elimination ("Elimination 3 of 7"), or null when nothing is
 * in play.
 * @param {object} state
 * @param {string} [phase] - getTournamentPhase(state), if the caller already has it
 * @returns {string|null}
 */
export function getMatchProgress(state, phase = getTournamentPhase(state)) {
  if (phase === 'qualification') {
    const matches = state.qualification.matches;
    return `Match ${getCurrentMatchIndex(matches) + 1} of ${matches.length}`;
  }
  if (phase === 'elimination') {
    const { bracket } = state.elimination;
    return `Elimination ${decidedEliminationCount(bracket) + 1} of ${playedEliminationMatches(bracket).length}`;
  }
  return null;
}

/**
 * The Current Match's Match Time (Qualification Matches lead the schedule,
 * so its qualification index is also its schedule position).
 * @returns {number|null} epoch ms, or null with no Current Match or Start Time
 */
export function getCurrentMatchTime(state) {
  const currentIndex = getCurrentMatchIndex(state.qualification.matches);
  if (currentIndex === null) return null;
  return computeMatchTime(state.timeline, currentIndex);
}

/**
 * Schedule Drift: how far now is from a Match Time, rounded to whole
 * minutes. Anything that rounds to within 1 minute counts as on schedule.
 * @param {number} nowMs
 * @param {number|null} matchTimeMs
 * @returns {{status: 'on-schedule'|'behind'|'ahead', minutes: number}|null}
 */
export function getScheduleDrift(nowMs, matchTimeMs) {
  if (matchTimeMs == null) return null;
  const diffMs = nowMs - matchTimeMs;
  const minutes = Math.round(Math.abs(diffMs) / MINUTE_MS);
  if (minutes <= 1) return { status: 'on-schedule', minutes: 0 };
  return { status: diffMs > 0 ? 'behind' : 'ahead', minutes };
}

/** @returns {string|null} "On schedule", "N min behind" or "N min ahead" */
export function formatScheduleDrift(drift) {
  if (!drift) return null;
  if (drift.status === 'on-schedule') return 'On schedule';
  return `${drift.minutes} min ${drift.status}`;
}
