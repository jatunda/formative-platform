import { MINUTE_MS } from './match-timeline.js';
import { isBracketComplete } from './bracket.js';
import { isQualificationIncomplete } from './alliance-selection.js';

export const PHASE_LABELS = {
  setup: 'Setup',
  qualification: 'Qualification',
  'alliance-selection': 'Alliance Selection',
  elimination: 'Elimination',
  complete: 'Complete',
};

/**
 * The Tournament's phase, derived purely from state: Setup (no matches) ->
 * Qualification -> Alliance Selection (every Qualification Match complete,
 * no bracket yet; Playoff Alliances formed earlier don't change the phase)
 * -> Elimination -> Complete (every played Elimination Match has a winner).
 * @returns {'setup'|'qualification'|'alliance-selection'|'elimination'|'complete'}
 */
export function getTournamentPhase(state) {
  const { bracket } = state.elimination;
  if (bracket) {
    return isBracketComplete(bracket) ? 'complete' : 'elimination';
  }
  if (state.qualification.matches.length === 0) return 'setup';
  return isQualificationIncomplete(state) ? 'qualification' : 'alliance-selection';
}

/**
 * Match progress for the header: the Current Match's position among its
 * phase's matches, "Match 7 of 24" during Qualification or "Elimination 3 of
 * 7" during Elimination, or null when nothing is in play.
 * @param {import('./live-match.js').LiveMatch|null} liveMatch - getLiveMatch(state)
 * @returns {string|null}
 */
export function getMatchProgress(liveMatch) {
  if (!liveMatch) return null;
  const prefix = liveMatch.phase === 'qualification' ? 'Match' : 'Elimination';
  return `${prefix} ${liveMatch.position} of ${liveMatch.total}`;
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
