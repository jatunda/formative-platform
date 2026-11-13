// @ts-check
// Every way the page puts a ring into words, in one place: where in its Period
// a Period Alarm rings ("5 min before the end"), how often a Clock Alarm
// repeats, the ring card's kind, title and detail ("Period Alarm", "Period 3",
// "5 min before the end of Period 3", also announced once to screen readers),
// and the Settings drawer's "Next rings today" lines.

import { ringsInWindow } from './clock-model.js';
import { formatClockTime, formatSegmentName } from './format.js';
import { fullTimerName } from './timer.js';
import { SOUND_NAMES } from './sound.js';

/** @typedef {{ kind: string, title: string, detail: string }} RingWords */
/** @typedef {import('./clock-model.js').Ring} Ring */

/** @typedef {import('./format.js').WordSettings} WordSettings */

/**
 * How the settings write Segment names and clock times (Period Labels, the 24-hour clock).
 * @param {Pick<WordSettings, 'use24Hour' | 'periodLabels'>} settings
 */
const writer = ({ use24Hour, periodLabels }) => ({
  /** @param {{ name: string, kind: string }} segment */
  name: (segment) => formatSegmentName(segment, periodLabels),
  /** @param {Date} date */
  time: (date, seconds = false) => formatClockTime(date, { seconds, use24Hour }),
});

/**
 * Where in its Period a Period Alarm rings: "minute 5", "5 min before the end"
 * or "halfway"; given the Period's name, "minute 5 of Period 3", "5 min before
 * the end of Period 3" or "halfway through Period 3".
 * @param {import('./clock-settings.js').PeriodAnchor} anchor
 * @param {string} [period]
 */
export function anchorText(anchor, period) {
  const of = period ? ` of ${period}` : '';
  if (anchor.from === 'start') return `minute ${anchor.minutes}${of}`;
  if (anchor.from === 'end') return `${anchor.minutes} min before the end${of}`;
  return period ? `halfway through ${period}` : 'halfway';
}

/** How often a Clock Alarm rings. @param {{ repeat: string }} alarm */
export const repeatText = (alarm) => (alarm.repeat === 'once' ? 'once' : 'every School Day');

/**
 * The ring card's words for a ring.
 * @param {Ring} ring
 * @param {Pick<WordSettings, 'use24Hour' | 'periodLabels'>} settings
 * @returns {RingWords}
 */
export function ringWords(ring, settings) {
  const text = writer(settings);
  switch (ring.source) {
    case 'bell': {
      // A Bell between two Segments is named for the one starting.
      const title = ring.starts ? `${text.name(ring.starts)} starts` : `${text.name(/** @type {*} */ (ring.ends))} ends`;
      const detail = ring.starts && ring.ends ? `${text.name(ring.ends)} ends` : '';
      return { kind: 'Bell', title, detail };
    }
    case 'clockAlarm': {
      const time = text.time(ring.at);
      const repeat = repeatText(ring.alarm);
      return ring.alarm.label
        ? { kind: 'Clock Alarm', title: ring.alarm.label, detail: `${time} · ${repeat}` }
        : { kind: 'Clock Alarm', title: time, detail: repeat };
    }
    case 'periodAlarm': {
      const period = text.name(ring.period);
      return { kind: 'Period Alarm', title: ring.alarm.label || period, detail: anchorText(ring.alarm.anchor, period) };
    }
    default:
      return {
        kind: 'Timer', title: 'Time is up',
        detail: ring.totalMs || ring.name ? fullTimerName(ring.totalMs, ring.name) : '',
      };
  }
}

/**
 * What rang, in one line: "Bell · Period 2 ends, Nutrition starts",
 * "Clock Alarm · Lunch duty, every School Day", "Period Alarm · Period 3, halfway".
 * @param {Ring} ring
 * @param {ReturnType<typeof writer>} text
 */
function ringSourceText(ring, text) {
  switch (ring.source) {
    case 'bell': {
      const parts = [];
      if (ring.ends) parts.push(`${text.name(ring.ends)} ends`);
      if (ring.starts) parts.push(`${text.name(ring.starts)} starts`);
      return `Bell · ${parts.join(', ')}`;
    }
    case 'clockAlarm': {
      const repeat = repeatText(ring.alarm);
      return `Clock Alarm · ${ring.alarm.label ? `${ring.alarm.label}, ${repeat}` : repeat}`;
    }
    case 'periodAlarm': {
      const where = `${text.name(ring.period)}, ${anchorText(ring.alarm.anchor)}`;
      return `Period Alarm · ${ring.alarm.label ? `${ring.alarm.label} · ${where}` : where}`;
    }
    default:
      return 'Timer';
  }
}

/**
 * The "Next rings today" lines: every ring from `now` to midnight, with its
 * time, what rings and its sound.
 * @param {Date} now
 * @param {import('./school-years.js').SchoolYear[]} schoolYears
 * @param {import('./clock-settings.js').RingSettings & Pick<WordSettings, 'use24Hour' | 'periodLabels'>} settings
 */
export function nextRingLines(now, schoolYears, settings) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const text = writer(settings);
  return ringsInWindow(now, midnight, schoolYears, settings).map((ring) => {
    const time = text.time(ring.at, ring.at.getSeconds() !== 0);
    return `${time} · ${ringSourceText(ring, text)} · ${SOUND_NAMES[ring.sound]}`;
  });
}

/** A test ring from Settings. @type {Readonly<RingWords>} */
export const TEST_RING_WORDS = Object.freeze({ kind: 'Test', title: 'Test ring', detail: '' });

/**
 * The words announced once when a ring starts.
 * @param {RingWords} words
 */
export function ringAnnouncement({ kind, title, detail }) {
  return `Ringing · ${kind}: ${title}${detail ? `, ${detail}` : ''}`;
}
