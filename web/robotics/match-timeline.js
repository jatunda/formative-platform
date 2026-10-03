export const MINUTE_MS = 60 * 1000;

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

/**
 * One-line summary of a Match Timeline for its collapsed panel, e.g.
 * `Forward · starts 1:00 PM · 4 + 1 min · 2 fields · ends ~2:10 PM`.
 * Forward mode leads with the Start Time and projects the end; Backward mode
 * leads with the target End Time and shows the start it last applied - the
 * stored Start Time every Match Time derives from, so the summary never
 * disagrees with the schedule even before the teacher re-applies.
 * @param {{mode: 'forward'|'backward', startTime: number|null, endTime: number|null, matchDurationMin: number, gapMin: number, fieldCount: number}} timeline
 * @param {number} totalMatchCount - matches the schedule currently spans
 * @param {(epochMs: number) => string} formatClock - renders a time of day
 * @returns {string}
 */
export function formatTimelineSummary(timeline, totalMatchCount, formatClock) {
  const pacing = [
    `${timeline.matchDurationMin} + ${timeline.gapMin} min`,
    `${timeline.fieldCount} field${timeline.fieldCount === 1 ? '' : 's'}`,
  ];
  if (timeline.mode === 'backward') {
    if (timeline.endTime == null) return ['Backward', 'no end time', ...pacing].join(' · ');
    const parts = ['Backward', `ends ${formatClock(timeline.endTime)}`, ...pacing];
    if (timeline.startTime != null) parts.push(`starts ~${formatClock(timeline.startTime)}`);
    return parts.join(' · ');
  }
  if (timeline.startTime == null) return ['Forward', 'no start time', ...pacing].join(' · ');
  const parts = ['Forward', `starts ${formatClock(timeline.startTime)}`, ...pacing];
  if (totalMatchCount > 0) {
    const endTime = timeline.startTime + computeTotalDurationMinutes(timeline, totalMatchCount) * MINUTE_MS;
    parts.push(`ends ~${formatClock(endTime)}`);
  }
  return parts.join(' · ');
}
