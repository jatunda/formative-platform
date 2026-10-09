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
 * The Field a match plays on, or null when only one Field runs (so there is nothing to show).
 * @param {number} fieldCount
 * @param {number} globalIndex - 0-based position in schedule order
 * @returns {number|null}
 */
export function matchField(fieldCount, globalIndex) {
  return fieldCount > 1 ? (globalIndex % fieldCount) + 1 : null;
}

/**
 * Every match the schedule spans: Qualification Matches plus actual (once a
 * bracket exists) or estimated Elimination Matches.
 * @param {number} qualificationMatchCount
 * @param {{matches: {isBye?: boolean}[]}|null} bracket - the actual Elimination Bracket, once generated
 * @param {number} estimatedBracketSize
 * @param {boolean} estimatedThirdPlace
 * @returns {number}
 */
export function getScheduledMatchCount(qualificationMatchCount, bracket, estimatedBracketSize, estimatedThirdPlace) {
  const eliminationCount = bracket
    ? bracket.matches.filter((m) => !m.isBye).length
    : estimateEliminationMatchCount(estimatedBracketSize, estimatedThirdPlace);
  return qualificationMatchCount + eliminationCount;
}

// A Match Timeline Start/End Time is a time-of-day only (the Tournament runs in one sitting) —
// combine it with a reference date to get the epoch-ms the rest of the app works in.

/**
 * Render an epoch-ms Match Timeline Start/End Time as a `<input type="time">` value.
 * @param {number|null} epochMs
 * @returns {string}
 */
export function timeOfDayInputValue(epochMs) {
  if (epochMs == null) return '';
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Parse an `<input type="time">` value into epoch-ms, combined with referenceTime's
 * calendar date (so the Tournament's single sitting always lands on "today").
 * @param {string} timeStr - "HH:MM", or "" for unset
 * @param {number} [referenceTime] - epoch-ms to take the calendar date from; defaults to now
 * @returns {number|null}
 */
export function timeOfDayToEpochMs(timeStr, referenceTime = Date.now()) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(referenceTime);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}
