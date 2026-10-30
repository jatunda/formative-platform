// @ts-check
// Readouts: the numbers on the clock screen. Pure: a Readout's mode and the
// moment from the clock model give the value to show.
//
// A mode is a position in the cycle, not a fixed meaning: `countdown` is
// "time left" in school and "until the Next School Day" in Off-Hours,
// `countup` is "time elapsed" or "since school ended", and `clock` is the
// current time either way. So a Readout keeps its place in the cycle as the
// day moves between in-school and Off-Hours.

import { formatClockTime, formatDuration, formatLongDuration, formatShortDate } from './format.js';

/** @typedef {'countdown' | 'countup' | 'clock'} ReadoutMode */

/** @type {readonly ReadoutMode[]} */
export const READOUT_MODES = Object.freeze(['countdown', 'countup', 'clock']);

/**
 * The mode a tap switches to.
 * @param {ReadoutMode} mode
 * @returns {ReadoutMode}
 */
export function nextMode(mode) {
  return READOUT_MODES[(READOUT_MODES.indexOf(mode) + 1) % READOUT_MODES.length];
}

/**
 * The mode a new Readout starts in: since school ended after school, and
 * otherwise counting down (time left in school; until school starts before
 * school; until the Next School Day on a day off).
 * @param {import('./clock-model.js').Moment} moment
 * @returns {ReadoutMode}
 */
export function defaultMode(moment) {
  return moment.state === 'afterSchool' ? 'countup' : 'countdown';
}

/**
 * What a Readout shows: a length of time with its caption ("43:00 left",
 * "2:00 since start", "2:40 until Period 4", "4d 22h until Mon, Nov 30"), or
 * the current time. `long` durations can run for days.
 * @typedef {{ kind: 'duration', ms: number, caption: string, long: boolean }
 *   | { kind: 'time', at: Date }} ReadoutValue
 */

/**
 * The value a Readout in `mode` shows at `now`. With nothing to count to or
 * from (Summer before next year's dates are known), it's the current time, so
 * the clock stays a plain clock rather than a broken countdown.
 * @param {ReadoutMode} mode
 * @param {import('./clock-model.js').Moment} moment `describeMoment(now, ...)`
 * @param {Date} now
 * @returns {ReadoutValue}
 */
export function readoutValue(mode, moment, now) {
  /** @type {ReadoutValue} */
  const time = { kind: 'time', at: now };
  /** @type {(ms: number | null, caption: string, long?: boolean) => ReadoutValue} */
  const duration = (ms, caption, long = false) => (ms === null ? time : { kind: 'duration', ms, caption, long });
  if (mode === 'clock' || moment.state === 'unknown') return time;
  if (moment.state === 'segment') {
    return mode === 'countdown'
      ? duration(moment.timeLeftMs, 'left')
      : duration(moment.timeElapsedMs, 'since start');
  }
  // With no Segment to count up from, a Passing Period shows what's left of it either way.
  if (moment.state === 'passing') return duration(moment.timeLeftMs, `until ${/** @type {import('./clock-model.js').TimedSegment} */ (moment.upNext).name}`);
  if (mode === 'countup') return duration(moment.sinceSchoolEndedMs, 'since school ended', true);
  const first = moment.nextSchoolDay?.firstSegment.start;
  const caption = moment.state === 'beforeSchool' || !first ? 'until school starts' : `until ${formatShortDate(first)}`;
  return duration(moment.untilNextSchoolDayMs, caption, true);
}

/**
 * A Readout's value in words: "43:00 left", "4d 22h until next school day",
 * or the time ("1:04:09 PM"). With `seconds` off: "12 min left" (but
 * "0:59 left" in the last minute) and "1:04 PM".
 * @param {ReadoutValue} value
 * @param {{ use24Hour?: boolean, seconds?: boolean }} [options]
 * @returns {string}
 */
export function readoutText(value, options = {}) {
  const { amount, caption } = readoutParts(value, options);
  return value.kind === 'time' ? amount : `${amount} ${caption}`;
}

/**
 * A Readout as the page draws it: its amount ("42:17", "42 min", "10:12:43 AM")
 * cut into pieces, where letters and the space before them ("min", "h", "AM")
 * are set small and clock seconds are not; its caption ("left", "now"); and
 * the glyph counts the big Readout's size rule needs.
 * @param {ReadoutValue} value
 * @param {{ use24Hour?: boolean, seconds?: boolean }} [options]
 * @returns {{ amount: string, caption: string, pieces: { text: string, small: boolean }[],
 *   glyphs: { digits: number, colons: number, letters: number } }}
 */
export function readoutParts(value, { use24Hour = false, seconds = true } = {}) {
  const amount = value.kind === 'time'
    ? formatClockTime(value.at, { seconds, use24Hour })
    : (value.long ? formatLongDuration : formatDuration)(value.ms, { seconds });
  const pieces = amount.split(/( ?[a-z]+)/i).filter(Boolean).map((text) => ({ text, small: /[a-z]/i.test(text) }));
  /** @param {RegExp} pattern */
  const count = (pattern) => (amount.match(pattern) ?? []).length;
  return {
    amount,
    caption: value.kind === 'time' ? 'now' : value.caption,
    pieces,
    glyphs: { digits: count(/\d/g), colons: count(/:/g), letters: count(/[a-z]/gi) },
  };
}
