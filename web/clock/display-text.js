// @ts-check
// The words on the School Clock's main screen around the Readouts: the Day
// Label and date at the top, the heading (the current Segment with its
// Period Label, or what kind of time it is), and the one line under the
// Readouts (up next, when this Segment ends, or when the Next School Day is). Pure: a moment from
// the clock model and the time settings give the text.
import { formatClockTime, formatDate, formatSegmentName, formatShortDate, periodLabel } from './format.js';

/** @typedef {import('./clock-model.js').Moment} Moment */

/**
 * @typedef {{
 *   day: string,
 *   title: string,
 *   tag: string,
 *   upNext: { name: string, at: string } | null,
 *   ends: string | null,
 *   line: string | null,
 *   namesNextDay: boolean,
 * }} DisplayText
 * - `day`: "All Day · Tue, Oct 27"; just the date when the title already names the day.
 * - `title` and `tag`: "Period 3" and its Period Label "AP CSA" ('' when it has none).
 * - `upNext`: the next Segment and its start, during a Passing Period and before school.
 * - `ends`: when the current Segment ends ("11:15 AM"), with "Show period
 *   end time" on; null otherwise.
 * - `line`: the Off-Hours line ("Back Mon, Nov 30 · All Day"), or null.
 *   How long until then is a Readout's job (until the Next School Day), not the line's.
 * - `namesNextDay`: the line only names the Next School Day (after school, a
 *   day off), as the Day Bar's heading does, so it can step aside for the bar.
 */

/**
 * The main screen's words at `now`.
 * @param {Date} now
 * @param {Moment} moment `describeMoment(now, ...)`
 * @param {{ use24Hour: boolean, periodLabels: Record<string, string>, showPeriodEnd: boolean }} settings
 * @returns {DisplayText}
 */
export function displayText(now, moment, { use24Hour, periodLabels, showPeriodEnd }) {
  const date = formatShortDate(now);
  const schoolDay = `${moment.dayLabel} · ${date}`;
  /** @param {Date} at */
  const time = (at) => formatClockTime(at, { use24Hour });
  const next = moment.upNext ? { name: formatSegmentName(moment.upNext, periodLabels), at: time(moment.upNext.start) } : null;
  // Off-Hours always have a Next School Day, except a Summer before next year is known.
  const back = moment.nextSchoolDay ? formatShortDate(moment.nextSchoolDay.firstSegment.start) : '';
  const nextDayLabel = () => /** @type {import('./clock-model.js').NextSchoolDay} */ (moment.nextSchoolDay).dayLabel;
  /** @type {(fields: Partial<DisplayText>) => DisplayText} */
  const text = (fields) => ({ day: date, title: '', tag: '', upNext: null, ends: null, line: null, namesNextDay: false, ...fields });

  switch (moment.state) {
    case 'segment': {
      const current = /** @type {import('./clock-model.js').TimedSegment} */ (moment.current);
      return text({
        day: schoolDay, title: current.name, tag: periodLabel(current, periodLabels),
        ends: showPeriodEnd ? time(current.end) : null,
      });
    }
    case 'passing':
      return text({ day: schoolDay, title: 'Passing Period', upNext: next });
    case 'beforeSchool':
      return text({ day: schoolDay, title: 'Before school', upNext: next });
    case 'afterSchool':
      return text({ day: schoolDay, title: 'After school', line: `Next: ${back} · ${nextDayLabel()}`, namesNextDay: true });
    case 'dayOff':
      return text({ title: /** @type {string} */ (moment.dayLabel), line: `Back ${back} · ${nextDayLabel()}`, namesNextDay: true });
    case 'experienceWeek':
      return text({ title: /** @type {string} */ (moment.dayLabel), line: `It's Experience Week · back ${back}` });
    case 'summer':
      return text({ title: `Day ${moment.summerDay} of Summer`, line: back ? `Have a great summer! · back ${back}` : 'Have a great summer!' });
    default:
      return text({ day: formatDate(now), title: formatDate(now), line: 'No school calendar for this date yet' });
  }
}

/**
 * Just the heading at `now`, as one line ("Period 3 · AP CSA", "Passing
 * Period"), for a view with no room for the rest (the mini player).
 * @param {Date} now
 * @param {Moment} moment `describeMoment(now, ...)`
 * @param {Record<string, string>} periodLabels
 * @returns {string}
 */
export function headingText(now, moment, periodLabels) {
  // The heading never depends on the time format or the end-time setting.
  const { title, tag } = displayText(now, moment, { use24Hour: false, periodLabels, showPeriodEnd: false });
  return [title, tag].filter(Boolean).join(' · ');
}
