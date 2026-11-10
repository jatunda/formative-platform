// @ts-check
// The words on the School Clock's main screen around the Readouts: the Day
// Label and date at the top, the heading (the current Segment with its
// Period Label, or what kind of time it is), and the one line under the
// Readouts (up next, or when the Next School Day is). Pure: a moment from
// the clock model and the time settings give the text.
import { formatClockTime, formatDate, formatSegmentName, formatShortDate, periodLabel } from './format.js';

/** @typedef {import('./clock-model.js').Moment} Moment */

/**
 * @typedef {{
 *   day: string,
 *   title: string,
 *   tag: string,
 *   upNext: { name: string, at: string } | null,
 *   line: string | null,
 * }} DisplayText
 * - `day`: "All Day · Tue, Oct 27"; just the date when the title already names the day.
 * - `title` and `tag`: "Period 3" and its Period Label "AP CSA" ('' when it has none).
 * - `upNext`: the next Segment and its start, during a Passing Period and before school.
 * - `line`: the Off-Hours line ("Back Mon, Nov 30 · All Day"), or null.
 *   How long until then is a Readout's job (until the Next School Day), not the line's.
 */

/**
 * The main screen's words at `now`.
 * @param {Date} now
 * @param {Moment} moment `describeMoment(now, ...)`
 * @param {{ use24Hour: boolean, periodLabels: Record<string, string> }} settings
 * @returns {DisplayText}
 */
export function displayText(now, moment, { use24Hour, periodLabels }) {
  const date = formatShortDate(now);
  const schoolDay = `${moment.dayLabel} · ${date}`;
  /** @param {Date} at */
  const time = (at) => formatClockTime(at, { use24Hour });
  const next = moment.upNext ? { name: formatSegmentName(moment.upNext, periodLabels), at: time(moment.upNext.start) } : null;
  // Off-Hours always have a Next School Day, except a Summer before next year is known.
  const back = moment.nextSchoolDay ? formatShortDate(moment.nextSchoolDay.firstSegment.start) : '';
  const nextDayLabel = () => /** @type {import('./clock-model.js').NextSchoolDay} */ (moment.nextSchoolDay).dayLabel;
  /** @type {(fields: Partial<DisplayText>) => DisplayText} */
  const text = (fields) => ({ day: date, title: '', tag: '', upNext: null, line: null, ...fields });

  switch (moment.state) {
    case 'segment': {
      const current = /** @type {import('./clock-model.js').TimedSegment} */ (moment.current);
      return text({ day: schoolDay, title: current.name, tag: periodLabel(current, periodLabels) });
    }
    case 'passing':
      return text({ day: schoolDay, title: 'Passing Period', upNext: next });
    case 'beforeSchool':
      return text({ day: schoolDay, title: 'Before school', upNext: next });
    case 'afterSchool':
      return text({ day: schoolDay, title: 'After school', line: `Next: ${back} · ${nextDayLabel()}` });
    case 'dayOff':
      return text({ title: /** @type {string} */ (moment.dayLabel), line: `Back ${back} · ${nextDayLabel()}` });
    case 'experienceWeek':
      return text({ title: /** @type {string} */ (moment.dayLabel), line: `It's Experience Week · back ${back}` });
    case 'summer':
      return text({ title: `Day ${moment.summerDay} of Summer`, line: back ? `Have a great summer! · back ${back}` : 'Have a great summer!' });
    default:
      return text({ day: formatDate(now), title: formatDate(now), line: 'No school calendar for this date yet' });
  }
}
