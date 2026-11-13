// @ts-check
// Every word the School Clock's main screen and mini player write, short of
// what a ring says (ring-words.js): the "Simulated time" banner, the stage
// (the Day Label and date at the top, the heading, and the line under the
// Readouts), the Readouts with their captions, and the mini player's head,
// big Readout and foot. Pure: one call, `screenWords()`, takes the moment,
// the time, the settings and the Timer as it shows, and returns structured
// fields; the views only draw them.
import { formatClockTime, formatDate, formatSegmentName, formatShortDate, periodLabel } from './format.js';
import { UNTIL_END, readoutParts, readoutText, readoutValue } from './readouts.js';

/** @typedef {import('./clock-model.js').Moment} Moment */
/** @typedef {import('./clock-model.js').TimedSegment} TimedSegment */
/** @typedef {import('./format.js').WordSettings} WordSettings */
/** @typedef {import('./readouts.js').ReadoutMode} ReadoutMode */
/** @typedef {ReturnType<typeof readoutParts>} Parts */

/**
 * @typedef {{ kind: 'next', label: string, name: string, at: string }
 *   | { kind: 'line', text: string, namesNextDay: boolean }
 *   | { kind: 'none' }} UnderLine
 * The line under the Readouts:
 * - `next`: "Up next" with the next Segment and its start, during a Passing
 *   Period and before school; or "Ends" and when the current Segment ends
 *   (`name` ''), with "Show period end time" on.
 * - `line`: the Off-Hours line ("Back Mon, Nov 30 · All Day"; '' in a Segment
 *   with the setting off). How long until then is a Readout's job, not the
 *   line's. `namesNextDay`: it only names the Next School Day (after school, a
 *   day off), as the Day Bar's heading does, so it can step aside for the bar.
 * - `none`: nothing, before a Division is chosen.
 */

/**
 * @typedef {{
 *   day: { dayLabel: string, date: string },
 *   heading: { title: string, tag: string, hidden: boolean },
 *   under: UnderLine,
 * }} StageWords
 * - `day`: "All Day" and "Tue, Oct 27"; `dayLabel` is '' when the heading
 *   already names the day (or there's none), so just the date shows.
 * - `heading`: "Period 3" and its Period Label "AP CSA" ('' when it has none);
 *   `hidden` before a Division is chosen, when it's only there for screen readers.
 */

/**
 * @typedef {{ kind: 'progress', label: string, percent: number, text: string }
 *   | { kind: 'next', name: string }
 *   | { kind: 'none' }} MiniFoot
 * - `progress`: the just-this-Segment bar ("Period 3 progress", 93) and "ends 11:15 AM",
 *   or under a Timer its own bar ("Timer progress", the share left) and "42:17 until end of Period 3";
 * - `next`: "Up next" and the next Segment's name, with its Period Label.
 */

/**
 * @typedef {{ timer: boolean, head: import('./timer.js').TimerTitle, readout: Parts,
 *   mode: ReadoutMode | null, foot: MiniFoot }} MiniContent
 * What the mini player shows. `head`: the Segment ("Period 3 · AP CSA", all
 * `lead`), or the Timer's heading, its name the `lead` that's cut short where
 * space runs out ("Quiz" + " · 20:00 timer").
 * `timer`: the Timer has the big Readout.
 * `mode`: the big Readout's mode, which a click cycles; null when there's none
 * to cycle (just the time, or the Timer in the big spot).
 */

/**
 * @typedef {{ banner: string, stage: StageWords, readouts: Parts[], mini: MiniContent }} ScreenWords
 * - `banner`: "Simulated time · Tue, Oct 27, 10:32:00 AM · this tab only".
 * - `readouts`: the Readouts as drawn, in the layout's order (one, the time,
 *   when there are no `readouts` modes). Beside the Timer's ring the big one's
 *   time left names its Segment, since the heading steps aside for the ring.
 */

/**
 * Everything the screen says at `now`.
 * @param {{
 *   now: Date,
 *   moment: Moment | null,
 *   settings: WordSettings,
 *   timer: import('./timer.js').TimerView | null,
 *   readouts: ReadoutMode[] | null,
 * }} state `moment` is null before a Division is chosen; `timer` while one
 *   runs, is paused or has just rung (`timerRingView`); `readouts` the
 *   layout's modes, big one first, or null when the Readouts show just the time.
 * @returns {ScreenWords}
 */
export function screenWords({ now, moment, settings, timer, readouts: modes }) {
  const stage = moment ? stageWords(now, moment, settings) : beforeDivision(now);
  const readouts = readoutsFor(now, moment, settings, timer, modes);
  const time = formatClockTime(now, { seconds: settings.showSeconds, use24Hour: settings.use24Hour });
  return {
    banner: `Simulated time · ${formatShortDate(now)}, ${time} · this tab only`,
    stage,
    readouts,
    mini: {
      timer: Boolean(timer),
      head: timer ? timer.heading : { lead: headLine(stage.heading), tail: '' },
      // Timers always show seconds, rounded up like the main page's.
      readout: timer ? readoutParts({ kind: 'duration', ms: timer.remainingMs, caption: 'left', long: false }) : readouts[0],
      mode: timer || !modes ? null : modes[0],
      foot: miniFoot(moment, settings, timer),
    },
  };
}

/** Before a Division is chosen: just the date. @param {Date} now @returns {StageWords} */
const beforeDivision = (now) => ({
  day: { dayLabel: '', date: formatShortDate(now) },
  heading: { title: 'School Clock', tag: '', hidden: true },
  under: { kind: 'none' },
});

/**
 * The heading as one line ("Period 3 · AP CSA", "Passing Period"), for the
 * mini player, which has no room for the rest ('' while the heading is hidden).
 * @param {StageWords['heading']} heading
 */
function headLine({ title, tag, hidden }) {
  if (hidden) return '';
  return tag ? `${title} · ${tag}` : title;
}

/**
 * The stage's words at `now`.
 * @param {Date} now @param {Moment} moment @param {WordSettings} settings
 * @returns {StageWords}
 */
function stageWords(now, moment, { use24Hour, periodLabels, showPeriodEnd }) {
  const date = formatShortDate(now);
  const schoolDay = { dayLabel: /** @type {string} */ (moment.dayLabel), date };
  const dateOnly = { dayLabel: '', date };
  /** @param {Date} at */
  const time = (at) => formatClockTime(at, { use24Hour });
  // Off-Hours always have a Next School Day, except a Summer before next year is known.
  const back = moment.nextSchoolDay ? formatShortDate(moment.nextSchoolDay.firstSegment.start) : '';
  const nextDayLabel = () => /** @type {import('./clock-model.js').NextSchoolDay} */ (moment.nextSchoolDay).dayLabel;
  /** @returns {UnderLine} */
  const upNext = () => {
    const next = /** @type {TimedSegment} */ (moment.upNext);
    return { kind: 'next', label: 'Up next', name: formatSegmentName(next, periodLabels), at: time(next.start) };
  };
  /** @param {string} text @returns {UnderLine} */
  const line = (text, namesNextDay = false) => ({ kind: 'line', text, namesNextDay });
  /** @param {StageWords['day']} day @param {string} title @param {UnderLine} under @returns {StageWords} */
  const stage = (day, title, under, tag = '') => ({ day, heading: { title, tag, hidden: false }, under });

  switch (moment.state) {
    case 'segment': {
      const current = /** @type {TimedSegment} */ (moment.current);
      /** @type {UnderLine} Styled like Up next: "Ends 11:15 AM". */
      const ends = showPeriodEnd ? { kind: 'next', label: 'Ends', name: '', at: time(current.end) } : line('');
      return stage(schoolDay, current.name, ends, periodLabel(current, periodLabels));
    }
    case 'passing':
      return stage(schoolDay, 'Passing Period', upNext());
    case 'beforeSchool':
      return stage(schoolDay, 'Before school', upNext());
    case 'afterSchool':
      return stage(schoolDay, 'After school', line(`Next: ${back} · ${nextDayLabel()}`, true));
    case 'dayOff':
      return stage(dateOnly, /** @type {string} */ (moment.dayLabel), line(`Back ${back} · ${nextDayLabel()}`, true));
    case 'experienceWeek':
      return stage(dateOnly, /** @type {string} */ (moment.dayLabel), line(`It's Experience Week · back ${back}`));
    case 'summer':
      return stage(dateOnly, `Day ${moment.summerDay} of Summer`,
        line(back ? `Have a great summer! · back ${back}` : 'Have a great summer!'));
    default:
      return stage({ dayLabel: '', date: formatDate(now) }, formatDate(now), line('No school calendar for this date yet'));
  }
}

/**
 * The Readouts as drawn: the layout's, or just the time.
 * @param {Date} now @param {Moment | null} moment @param {WordSettings} settings
 * @param {import('./timer.js').TimerView | null} timer @param {ReadoutMode[] | null} modes
 * @returns {Parts[]}
 */
function readoutsFor(now, moment, settings, timer, modes) {
  if (!moment || !modes) return [readoutParts({ kind: 'time', at: now }, settings)];
  const parts = modes.map((mode) => readoutParts(readoutValue(mode, moment, now, settings.periodLabels), settings));
  // Beside the Timer's ring, the big Readout's time left names its Segment
  // (the heading steps aside for the ring).
  if (timer && moment.state === 'segment' && parts[0].caption === UNTIL_END) {
    const current = /** @type {TimedSegment} */ (moment.current);
    parts[0] = { ...parts[0], caption: untilEndOf(formatSegmentName(current, settings.periodLabels)) };
  }
  return parts;
}

/**
 * The caption on a Segment's time left with the Segment named, where the
 * heading doesn't name it: "until end of Period 3".
 * @param {string} segmentName
 */
const untilEndOf = (segmentName) => `${UNTIL_END} of ${segmentName}`;

/**
 * @param {Moment | null} moment @param {WordSettings} settings
 * @param {{ progress: number } | null} timer
 * @returns {MiniFoot}
 */
function miniFoot(moment, settings, timer) {
  if (moment?.state === 'segment') {
    const current = /** @type {TimedSegment} */ (moment.current);
    const left = /** @type {number} */ (moment.timeLeftMs);
    if (timer) {
      return {
        kind: 'progress',
        label: 'Timer progress',
        percent: Math.round(timer.progress * 100),
        text: readoutText({ kind: 'duration', ms: left, caption: untilEndOf(current.name), long: false }, settings),
      };
    }
    const elapsed = /** @type {number} */ (moment.timeElapsedMs);
    return {
      kind: 'progress',
      label: `${current.name} progress`,
      percent: Math.round((elapsed / (elapsed + left)) * 100),
      text: `ends ${formatClockTime(current.end, { use24Hour: settings.use24Hour })}`,
    };
  }
  if (moment?.upNext) return { kind: 'next', name: formatSegmentName(moment.upNext, settings.periodLabels) };
  return { kind: 'none' };
}
