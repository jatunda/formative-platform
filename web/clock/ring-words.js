// @ts-check
// What the ring card says about a ring: its kind ("Period Alarm"), a title
// (the Alarm's name, or what the Bell marks) and a detail line saying when it
// rings ("5 min before the end of Period 3"). The same words are announced
// once to screen readers.

import { formatDuration } from './format.js';

/** @typedef {{ kind: string, title: string, detail: string }} RingWords */

/**
 * @param {import('./clock-model.js').Ring} ring
 * @param {{ name: (segment: import('./clock-model.js').TimedSegment) => string,
 *   time: (date: Date) => string }} text how the page writes Segment names and clock times
 * @returns {RingWords}
 */
export function ringWords(ring, text) {
  switch (ring.source) {
    case 'bell': {
      // A Bell between two Segments is named for the one starting.
      const title = ring.starts ? `${text.name(ring.starts)} starts` : `${text.name(/** @type {*} */ (ring.ends))} ends`;
      const detail = ring.starts && ring.ends ? `${text.name(ring.ends)} ends` : '';
      return { kind: 'Bell', title, detail };
    }
    case 'clockAlarm': {
      const time = text.time(ring.at);
      const repeat = ring.alarm.repeat === 'once' ? 'once' : 'every School Day';
      return ring.alarm.label
        ? { kind: 'Clock Alarm', title: ring.alarm.label, detail: `${time} · ${repeat}` }
        : { kind: 'Clock Alarm', title: time, detail: repeat };
    }
    case 'periodAlarm': {
      const period = text.name(ring.period);
      const { anchor } = ring.alarm;
      let when = `halfway through ${period}`;
      if (anchor.from === 'start') when = `minute ${anchor.minutes} of ${period}`;
      if (anchor.from === 'end') when = `${anchor.minutes} min before the end of ${period}`;
      return { kind: 'Period Alarm', title: ring.alarm.label || period, detail: when };
    }
    default:
      return { kind: 'Timer', title: 'Time is up', detail: ring.totalMs ? `${formatDuration(ring.totalMs)} timer` : '' };
  }
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
