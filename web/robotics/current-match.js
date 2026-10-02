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
 * The Current Match: the Pinned Match if one is set and not yet complete,
 * otherwise the Inferred Current Match.
 * @param {{completed: boolean}[]} matches
 * @param {number|null} pinnedIndex
 * @returns {number|null}
 */
export function getCurrentMatchIndex(matches, pinnedIndex) {
  if (pinnedIndex !== null && matches[pinnedIndex] && !matches[pinnedIndex].completed) {
    return pinnedIndex;
  }
  return getInferredCurrentMatchIndex(matches);
}

/**
 * Up Next: the first not-yet-complete match after the Current Match, in
 * schedule order. Always automatic - never pinnable.
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
