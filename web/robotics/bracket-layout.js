/**
 * A bracket-tree column centers each match between the two matches feeding it by
 * surrounding every match with flex spacers in a 1 : 2 : 2 : ... : 2 : 1 ratio: the
 * leftover space a shorter column gets stretched into (relative to round 1, which
 * has the most matches and so defines the bracket's overall height) is distributed
 * so each match lands at the midpoint of its two feeders, recursively.
 * @param {number} matchCount - matches in this bracket column
 * @returns {number[]} flex-grow values for the spacers surrounding and between the
 *   matches - one more value than matchCount, since a leading and trailing spacer
 *   bookend the matches in addition to the ones between each pair
 */
export function bracketColumnSpacerGrowRatios(matchCount) {
  return [1, ...Array(Math.max(matchCount - 1, 0)).fill(2), 1];
}
