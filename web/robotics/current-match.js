/**
 * The Inferred Current Match: the first not-yet-complete match in schedule
 * order, or null if every match is complete (or there are none).
 * @param {{completed: boolean}[]} matches
 * @returns {number|null}
 */
export function getInferredCurrentMatchIndex(matches) {
  const index = matches.findIndex((m) => !m.completed);
  return index === -1 ? null : index;
}

/**
 * The Current Match: always the Inferred Current Match - there is no
 * override. Schedule order itself is manually reorderable (see
 * reorderQualificationMatch in state.js), which is how the teacher controls
 * which match ends up here.
 * @param {{completed: boolean}[]} matches
 * @returns {number|null}
 */
export function getCurrentMatchIndex(matches) {
  return getInferredCurrentMatchIndex(matches);
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
