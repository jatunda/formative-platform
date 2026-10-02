const MINUTE_MS = 60 * 1000;

/**
 * Total Elimination Matches a single-elimination bracket requires: every
 * match eliminates exactly one Playoff Alliance, and a Bye eliminates none,
 * so reaching a single champion from bracketSize alliances always takes
 * exactly bracketSize - 1 matches, independent of how byes are distributed.
 * @param {number} bracketSize
 * @param {boolean} includeThirdPlace
 * @returns {number}
 */
export function estimateEliminationMatchCount(bracketSize, includeThirdPlace) {
  return bracketSize - 1 + (includeThirdPlace ? 1 : 0);
}

/**
 * The Match Time for the match at the given position in the overall
 * schedule (Qualification Matches first, then Elimination Matches),
 * derived purely from the Match Timeline - no match time is ever stored.
 * @param {{startTime: number|null, matchDurationMin: number, gapMin: number, fieldCount: number}} timeline
 * @param {number} matchIndex - 0-based position in schedule order
 * @returns {number|null} epoch ms, or null if no Start Time has been set yet
 */
export function computeMatchTime(timeline, matchIndex) {
  if (timeline.startTime == null) return null;
  const slotIndex = Math.floor(matchIndex / timeline.fieldCount);
  const slotLengthMin = timeline.matchDurationMin + timeline.gapMin;
  return timeline.startTime + slotIndex * slotLengthMin * MINUTE_MS;
}

/**
 * Total wall-clock minutes a given number of matches occupies under this
 * Match Timeline's duration/gap/fieldCount, with no trailing gap after the
 * final slot.
 * @param {{matchDurationMin: number, gapMin: number, fieldCount: number}} timeline
 * @param {number} totalMatchCount
 * @returns {number}
 */
export function computeTotalDurationMinutes(timeline, totalMatchCount) {
  if (totalMatchCount <= 0) return 0;
  const totalSlots = Math.ceil(totalMatchCount / timeline.fieldCount);
  return totalSlots * timeline.matchDurationMin + (totalSlots - 1) * timeline.gapMin;
}

/**
 * Back-calculate a Start Time from a target End Time and a total duration
 * (in minutes) - the "backward" Match Timeline mode.
 * @param {{endTime: number}} timeline
 * @param {number} totalDurationMinutes
 * @returns {number} epoch ms
 */
export function computeStartTimeFromEndTime(timeline, totalDurationMinutes) {
  return timeline.endTime - totalDurationMinutes * MINUTE_MS;
}
