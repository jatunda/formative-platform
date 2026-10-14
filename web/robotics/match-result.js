// @ts-check
/**
 * The one "who won" rule for every Match, Qualification or Elimination.
 * Only Score decides which side won; a No-Show never changes it. The phases
 * differ only in what a Tie means, so each has its own entry point:
 * - Elimination advancement (and any winner highlight) uses `winningSide`,
 *   where a Tie has no winner and leaves the Match undecided.
 * - Standings use `qualificationTeamResult`, where a Tie is a result (half a
 *   win) and a No-Show Team records a loss on its own.
 * @typedef {{scoreA: number|null, scoreB: number|null, completed: boolean, noShow?: Record<string, boolean>}} ScoredMatch
 * @typedef {'A'|'B'} Side
 */

/**
 * How a Match came out by Score: the winning side, `'tie'` for equal Scores,
 * or null while it isn't complete.
 * @param {ScoredMatch} match
 * @returns {Side|'tie'|null}
 */
export function matchOutcome(match) {
  if (!match.completed) return null;
  if (match.scoreA === match.scoreB) return 'tie';
  // Recording a result always saves both Scores; Number() only spells out the
  // coercion `>` already applies to a null draft Score.
  return Number(match.scoreA) > Number(match.scoreB) ? 'A' : 'B';
}

/**
 * The side that won a Match, or null while there is no winner (incomplete,
 * or a Tie - which leaves an Elimination Match undecided).
 * @param {ScoredMatch} match
 * @returns {Side|null}
 */
export function winningSide(match) {
  const outcome = matchOutcome(match);
  return outcome === 'tie' ? null : outcome;
}

/**
 * One Team's result in a Qualification Match, as Standings count it: a Tie
 * is a result for both sides, and a No-Show Team records a loss whatever its
 * side scored. Null while the Match isn't complete.
 * @param {ScoredMatch} match
 * @param {Side} side - the side the Team played on
 * @param {string} teamId
 * @returns {'win'|'loss'|'tie'|null}
 */
export function qualificationTeamResult(match, side, teamId) {
  const outcome = matchOutcome(match);
  if (outcome === null) return null;
  if (match.noShow?.[teamId]) return 'loss';
  if (outcome === 'tie') return 'tie';
  return outcome === side ? 'win' : 'loss';
}
