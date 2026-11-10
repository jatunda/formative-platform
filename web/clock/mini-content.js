// @ts-check
// What the School Clock's mini player shows, in words: a head line (the
// current Segment with its Period Label, or "5:00 timer"), the big Readout,
// and a foot (how far through the Segment, up next, or the timer's bar and the
// time left in the Segment under a timer). Pure: the page's moment, settings and big Readout give it.
// What's ringing is the mini player's own overlay on top of this.
import { displayText } from './display-text.js';
import { formatClockTime, formatSegmentName } from './format.js';
import { readoutParts, readoutText } from './readouts.js';
import { timerName } from './timer.js';

const SECOND = 1000;

/** @typedef {ReturnType<typeof readoutParts>} Parts */
/**
 * @typedef {{ big: Parts, mode: import('./readouts.js').ReadoutMode | null }} BigReadout
 * The page's big Readout and its mode (null when it's just the time).
 */

/**
 * @typedef {{ kind: 'progress', label: string, percent: number, text: string }
 *   | { kind: 'next', name: string }
 *   | { kind: 'none' }} MiniFoot
 * - `progress`: the just-this-Segment bar ("Period 3 progress", 93) and "ends 11:15 AM",
 *   or under a timer its own bar ("Timer progress", the share left) and "42:17 left in Period 3";
 * - `next`: "Up next" and the next Segment's name, with its Period Label.
 */

/**
 * @typedef {{ timer: boolean, head: string, readout: Parts, mode: import('./readouts.js').ReadoutMode | null,
 *   foot: MiniFoot }} MiniContent
 * `timer`: the timer has the big Readout (the head is "Timer").
 * `mode`: the big Readout's mode, which a click cycles; null when there's none
 * to cycle (just the time, or the timer in the big spot).
 */

/**
 * @param {{
 *   now: Date,
 *   moment: import('./clock-model.js').Moment | null,
 *   settings: { use24Hour: boolean, showSeconds: boolean, periodLabels: Record<string, string> },
 *   big: Parts,
 *   mode: BigReadout['mode'],
 *   timer: { remainingMs: number, paused: boolean, totalMs: number | null, progress: number } | null,
 * }} state `moment` is null before a Division is chosen; `big` is the page's
 *   big Readout (ignored while `timer` shows) and `mode` its mode (null when
 *   it's just the time); `timer` while one runs, is
 *   paused or has just rung, with the length it was started with (null if
 *   unknown) and the share of it left, 0–1.
 * @returns {MiniContent}
 */
export function miniContent({ now, moment, settings, big, mode, timer }) {
  const options = { use24Hour: settings.use24Hour, seconds: settings.showSeconds };
  const words = moment ? displayText(now, moment, settings) : null;
  const segmentHead = words ? [words.title, words.tag].filter(Boolean).join(' · ') : '';
  const readout = timer
    // Timers always show seconds, rounded up like the main page's.
    ? readoutParts({ kind: 'duration', ms: Math.ceil(timer.remainingMs / SECOND) * SECOND, caption: 'left', long: false })
    : big;
  return {
    timer: Boolean(timer),
    head: timer ? timerHead(timer) : segmentHead,
    readout,
    mode: timer ? null : mode,
    foot: footFor(moment, settings, options, timer),
  };
}

/** "5:00 timer", or "5:00 timer · paused". @param {{ paused: boolean, totalMs: number | null }} timer */
function timerHead({ paused, totalMs }) {
  return `${timerName(totalMs)}${paused ? ' · paused' : ''}`;
}

/**
 * @param {import('./clock-model.js').Moment | null} moment
 * @param {{ use24Hour: boolean, periodLabels: Record<string, string> }} settings
 * @param {{ use24Hour: boolean, seconds: boolean }} options
 * @param {{ progress: number } | null} timer
 * @returns {MiniFoot}
 */
function footFor(moment, settings, options, timer) {
  if (moment?.state === 'segment') {
    const current = /** @type {import('./clock-model.js').TimedSegment} */ (moment.current);
    const left = /** @type {number} */ (moment.timeLeftMs);
    if (timer) {
      return {
        kind: 'progress',
        label: 'Timer progress',
        percent: Math.round(timer.progress * 100),
        text: `${readoutText({ kind: 'duration', ms: left, caption: 'left', long: false }, options)} in ${current.name}`,
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
