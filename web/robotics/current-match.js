import { getMatchesInBracketOrder, getMatchWinner } from './bracket.js';

/**
 * The Inferred Current Match: the first not-yet-complete match in schedule
 * order, or null if every match is complete (or there are none). It is always
 * the Current Match - there is no override. Schedule order itself is manually
 * reorderable (see reorderQualificationMatch in state.js), which is how the
 * teacher controls which match ends up here.
 * @param {{completed: boolean}[]} matches
 * @returns {number|null}
 */
export function getInferredCurrentMatchIndex(matches) {
  const index = matches.findIndex((m) => !m.completed);
  return index === -1 ? null : index;
}

/**
 * Up Next: the first not-yet-complete match after the Current Match, in
 * schedule order.
 * @param {{completed: boolean}[]} matches
 * @param {number|null} currentIndex
 * @returns {number|null}
 */
export function getUpNextMatchIndex(matches, currentIndex) {
  if (currentIndex === null) return null;
  for (let i = currentIndex + 1; i < matches.length; i++) {
    if (!matches[i].completed) return i;
  }
  return null;
}

/** Played Elimination Matches still without a winner (a completed Tie included), in bracket order. */
function undecidedEliminationMatchIds(bracket) {
  return getMatchesInBracketOrder(bracket)
    .filter((m) => getMatchWinner(bracket, m.id) == null)
    .map((m) => m.id);
}

/**
 * The Elimination Current Match: the first undecided Elimination Match in
 * bracket order (Byes skipped). A completed Tie has no winner, so it stays
 * Current until its Score is changed. Null once every match has a winner.
 * @param {object} bracket
 * @returns {string|null}
 */
export function getEliminationCurrentMatchId(bracket) {
  return undecidedEliminationMatchIds(bracket)[0] ?? null;
}

/**
 * Elimination Up Next: the next undecided Elimination Match after the Current
 * Match, in bracket order.
 * @param {object} bracket
 * @param {string|null} currentId
 * @returns {string|null}
 */
export function getEliminationUpNextMatchId(bracket, currentId) {
  const ids = undecidedEliminationMatchIds(bracket);
  const index = ids.indexOf(currentId);
  return index === -1 ? null : ids[index + 1] ?? null;
}
