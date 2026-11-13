// @ts-check
// The life of a Ring, from coming due to going quiet, with no DOM: which
// Rings are due on a tick (and which were missed while the tab slept), the
// coming Rings handed to the sound player ahead of time, how long each one
// rings, and what's ringing now (newest on top), including the Timer that
// rang. The page shows what this says and hands the sound player what it
// returns.
//
// Two clocks meet here. Rings come due in clock time (which runs fast with
// `&speed=`), but how long a Ring shows, how far ahead sounds are handed over,
// and how late is too late are all in real time: at &speed=60 a clock minute
// is a real second.

import { ringsInWindow } from './clock-model.js';
import { TEST_RING_WORDS, ringWords } from './ring-words.js';
import { ALARM_MAX_SECONDS, ringLength } from './sound.js';
import { timerRingView, timerStatus } from './timer.js';

/** @typedef {import('./clock-model.js').Ring} Ring */
/** @typedef {import('./clock-settings.js').ClockSettings} ClockSettings */
/** @typedef {import('./ring-words.js').RingWords} RingWords */
/**
 * One Ring as the sound player takes it: `key` names it across redone windows,
 * `at` is on the audio clock (seconds), and `seconds`, when given, is when it
 * starts no new pass (a Bell that stops on its own).
 * @typedef {{ key: string, at: number, sound: import('./clock-settings.js').SoundName, repeat: boolean,
 *   seconds?: number }} SoundRing
 */

/** How long a Bell rings before stopping on its own, unless the teacher keeps Bells ringing until dismissed. */
export const BELL_AUTO_DISMISS_SECONDS = 5;

/** How far ahead (real time) Rings are handed to the sound player: past the
 * minute-long timer throttling of a background tab. */
const LOOKAHEAD_MS = 5 * 60 * 1000;
/** Rings this recent (real time) stay in the sound window, so one already
 * playing is kept rather than cancelled when the window is redone. */
const GRACE_MS = 1000;
/** Rings older than this (real time) when a tick finally reaches them were
 * missed while the tab slept or was throttled: they don't ring late. */
const STALE_MS = 5 * 1000;

/**
 * A name for one Ring that stays the same each time the window is redone, so
 * the sound player can tell a Ring it already has from a new one.
 * @param {Ring} ring
 */
function ringKey(ring) {
  return `${ring.at.getTime()}|${ring.source}|${'alarm' in ring ? ring.alarm.id : ''}`;
}

/**
 * How long a Ring of this kind lasts, the one place that's worked out. A Bell
 * stops on its own (unless the teacher keeps Bells ringing until dismissed):
 * its sound starts no new pass after `seconds` (5 s), and it shows until that
 * last pass ends (`shownSeconds`, from the voice itself). Everything else
 * rings and shows for an Alarm's minute, until dismissed.
 * @param {Ring['source']} source @param {import('./clock-settings.js').SoundName} sound
 * @param {{ untilDismissed?: boolean }} bells the Bells settings
 * @returns {{ seconds?: number, shownSeconds: number, stopsOnItsOwn: boolean }}
 */
function lengthOf(source, sound, bells) {
  if (source !== 'bell' || bells.untilDismissed) return { shownSeconds: ALARM_MAX_SECONDS, stopsOnItsOwn: false };
  return {
    seconds: BELL_AUTO_DISMISS_SECONDS,
    shownSeconds: ringLength(sound, BELL_AUTO_DISMISS_SECONDS),
    stopsOnItsOwn: true,
  };
}

/**
 * The sound player's options for a Ring of that length.
 * @param {{ seconds?: number }} length @returns {{ repeat: true, seconds?: number }}
 */
const playOptions = ({ seconds }) => ({ repeat: true, ...(seconds === undefined ? {} : { seconds }) });

/**
 * The settings as Rings read them, or null before a Division is chosen (then nothing rings).
 * @param {ClockSettings} settings @returns {import('./clock-settings.js').RingSettings | null}
 */
const ringSettings = (settings) => (settings.division ? { ...settings, division: settings.division } : null);

/**
 * What's ringing, one entry per Ring. The page compares entries by identity
 * to tell a new Ring from the one it shows (the test Ring's words are the
 * same each time).
 * @typedef {{ readonly words: RingWords }} RingingNow
 */

/**
 * The Rings of one page.
 * @param {{ realNow: () => number, speed: number, schoolYears: import('./school-years.js').SchoolYear[] }} clock
 *   `realNow` is the real clock (epoch ms), `speed` how many clock seconds pass per real second.
 */
export function createRinging({ realNow, speed, schoolYears }) {
  /** @type {{ words: RingWords, until: number, timer: boolean }[]} Oldest first; `until` is real time. */
  let stack = [];
  /** @type {import('./timer.js').RangTimer | null} The Timer that rang (its ring shows 0:00 of it until it stops). */
  let rangTimer = null;
  /** The end (clock time) of the sound window last handed over. */
  let windowEnd = -Infinity;

  /**
   * @param {RingWords} words @param {number} seconds how long it shows (real time)
   * @param {{ lateMs?: number, timer?: boolean }} [options] it started `lateMs` (real time) ago
   */
  function start(words, seconds, { lateMs = 0, timer = false } = {}) {
    stack.push({ words, until: realNow() - lateMs + seconds * 1000, timer });
  }

  return {
    /**
     * The coming Rings, [now - grace, now + lookahead) in clock time, as the
     * sound player takes them, on its audio clock (`audioNow` is its current
     * time; null when it isn't playing: the window still rolls forward but
     * nothing is handed over). No Division, no Rings.
     * @param {Date} now @param {ClockSettings} settings @param {number | null} audioNow
     * @returns {SoundRing[]}
     */
    soundWindow(now, settings, audioNow) {
      const t = now.getTime();
      windowEnd = t + LOOKAHEAD_MS * speed;
      const rings = ringSettings(settings);
      if (audioNow === null || !rings) return [];
      return ringsInWindow(new Date(t - GRACE_MS * speed), new Date(windowEnd), schoolYears, rings).map((ring) => ({
        key: ringKey(ring),
        at: audioNow + (ring.at.getTime() - t) / 1000 / speed,
        sound: ring.sound,
        ...playOptions(lengthOf(ring.source, ring.sound, settings.bells)),
      }));
    },

    /**
     * Move on from the last tick to `now`: let go of the Rings whose time is
     * up, then start the ones that came due since (a Timer's Ring remembers
     * the Timer). Rings missed while the tab slept or stalled don't ring
     * late, but are still in `rang`, so a one-time Clock Alarm is turned off.
     * `soundWindowDue` says the sound window needs redoing: after a stall, so
     * the player drops what was missed too, and halfway through the window.
     * @param {Date} lastTick @param {Date} now @param {ClockSettings} settings
     * @param {import('./ring-words.js').RingText} text how the Rings are put into words
     * @returns {{ rang: Ring[], soundWindowDue: boolean }} `rang`: every Ring in [lastTick, now)
     */
    advance(lastTick, now, settings, text) {
      const t = realNow();
      stack = stack.filter((ring) => t < ring.until);
      const staleBefore = now.getTime() - STALE_MS * speed;
      const soundWindowDue = lastTick.getTime() < staleBefore
        || now.getTime() >= windowEnd - (LOOKAHEAD_MS * speed) / 2;
      const rings = ringSettings(settings);
      if (!rings) return { rang: [], soundWindowDue };
      const rang = ringsInWindow(lastTick, now, schoolYears, rings);
      for (const ring of rang) {
        if (ring.at.getTime() < staleBefore) continue;
        if (ring.source === 'timer') rangTimer = { totalMs: ring.totalMs, name: ring.name ?? null };
        const length = lengthOf(ring.source, ring.sound, settings.bells);
        start(ringWords(ring, text), length.shownSeconds, {
          // A Bell that stops on its own does so when its sound ends, counted
          // from when it came due as its sound is, even in a throttled tab.
          lateMs: length.stopsOnItsOwn ? (now.getTime() - ring.at.getTime()) / speed : 0,
          timer: ring.source === 'timer',
        });
      }
      return { rang, soundWindowDue };
    },

    /**
     * Ring a test Bell now, as a Bell rings under these Bells settings.
     * @param {import('./clock-settings.js').BellsSettings} bells
     * @returns {{ sound: import('./clock-settings.js').SoundName, repeat: true, seconds?: number }} what to play
     */
    testRing(bells) {
      const length = lengthOf('bell', bells.sound, bells);
      start(TEST_RING_WORDS, length.shownSeconds);
      return { sound: bells.sound, ...playOptions(length) };
    },

    /** Stop everything ringing. */
    dismiss() {
      stack = [];
    },

    /** The newest Ring still ringing, or null. @returns {RingingNow | null} */
    current() {
      return stack.length > 0 ? stack[stack.length - 1] : null;
    },

    /**
     * The Timer as it shows at `now`: running, paused, or rung and still
     * ringing (0:00 of the Timer that rang); null when it doesn't show.
     * @param {import('./timer.js').TimerState} timer @param {Date} now
     */
    shownTimer(timer, now) {
      const showing = timerStatus(timer, now.getTime()).status !== 'idle' || stack.some((ring) => ring.timer);
      return showing ? timerRingView(timer, now.getTime(), rangTimer) : null;
    },
  };
}

/** @typedef {ReturnType<typeof createRinging>} Ringing */
