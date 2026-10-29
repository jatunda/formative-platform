// @ts-check
// The classroom timer, as plain data saved with the device's settings. A
// running timer is only its end time and a paused one only its time left, so
// the time left is always worked out from the current time: a reload, a
// throttled tab or a sleeping laptop never makes it drift.

/**
 * The timer fields of `ClockSettings`. At most one is non-null: `timerEndsAt`
 * (epoch ms) while it runs, `timerPausedMs` (time left) while it's paused.
 * @typedef {{ timerEndsAt: number | null, timerPausedMs: number | null }} TimerState
 */

import { formatDuration } from './format.js';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
/** The longest timer a teacher can type. */
export const MAX_DURATION_MS = 24 * 60 * MINUTE;
/** The one-tap timers, in minutes. */
export const PRESET_MINUTES = Object.freeze([1, 2, 5, 10]);
const QUICK_PICKS = 3;

/**
 * The quick picks after a custom duration is used: it moves to the front and
 * only the last 3 distinct ones are kept. A preset is already one tap away,
 * so typing one leaves the list as it was (same array back).
 * @param {number[]} recent most recent first @param {number} ms
 * @returns {number[]}
 */
export function rememberDuration(recent, ms) {
  if (PRESET_MINUTES.some((minutes) => minutes * MINUTE === ms)) return recent;
  return [ms, ...recent.filter((d) => d !== ms)].slice(0, QUICK_PICKS);
}

/**
 * A duration as a button label: "5 min" for whole minutes, else "7:30" / "1:05:05".
 * @param {number} ms
 */
export function durationLabel(ms) {
  return ms % MINUTE === 0 ? `${ms / MINUTE} min` : formatDuration(ms);
}

/**
 * A typed custom duration: minutes ("7", "1.5"), minutes:seconds ("7:30")
 * or hours:minutes:seconds ("1:05:00"), to whole seconds, from 1 s to 24 h.
 * @param {string} text
 * @returns {{ ok: true, ms: number } | { ok: false, error: string }}
 */
export function parseDuration(text) {
  const s = text.trim();
  let ms;
  let match;
  if (/^\d+(\.\d+)?$/.test(s)) {
    ms = Number(s) * MINUTE;
  } else if ((match = /^(?:(\d+):([0-5]\d)|(\d+):([0-5]\d):([0-5]\d))$/.exec(s))) {
    ms = match[1] !== undefined
      ? Number(match[1]) * MINUTE + Number(match[2]) * SECOND
      : (Number(match[3]) * 60 + Number(match[4])) * MINUTE + Number(match[5]) * SECOND;
  } else {
    return { ok: false, error: 'Type minutes (like 7) or minutes:seconds (like 7:30).' };
  }
  ms = Math.round(ms / SECOND) * SECOND;
  if (ms < SECOND) return { ok: false, error: 'The timer needs at least 1 second.' };
  if (ms > MAX_DURATION_MS) return { ok: false, error: 'The timer can run for 24 hours at most.' };
  return { ok: true, ms };
}

/**
 * A timer of `durationMs` starting at `now` (replacing any timer already set).
 * @param {number} durationMs @param {number} now epoch ms
 * @returns {TimerState}
 */
export function startTimer(durationMs, now) {
  return { timerEndsAt: now + durationMs, timerPausedMs: null };
}

/**
 * Stop the clock on a running timer, keeping its time left (same timer back
 * when it isn't running).
 * @param {TimerState} timer @param {number} now epoch ms
 * @returns {TimerState}
 */
export function pauseTimer(timer, now) {
  if (timer.timerEndsAt === null) return timer;
  return { timerEndsAt: null, timerPausedMs: Math.max(0, timer.timerEndsAt - now) };
}

/**
 * Start a paused timer again from its time left (same timer back when it
 * isn't paused).
 * @param {TimerState} timer @param {number} now epoch ms
 * @returns {TimerState}
 */
export function resumeTimer(timer, now) {
  if (timer.timerPausedMs === null) return timer;
  return startTimer(timer.timerPausedMs, now);
}

/** No timer at all. @returns {TimerState} */
export function cancelTimer() {
  return { timerEndsAt: null, timerPausedMs: null };
}

/**
 * The timer with its end cleared once that end has passed (same timer back
 * otherwise). Strictly past: the rings window `[lastTick, now)` only reaches
 * a timer ending exactly at `now` on the next tick, so it stays until then.
 * @param {TimerState} timer @param {number} now epoch ms
 * @returns {TimerState}
 */
export function settleTimer(timer, now) {
  return timer.timerEndsAt !== null && timer.timerEndsAt < now ? cancelTimer() : timer;
}

/**
 * Where the timer stands at `now`.
 * @param {TimerState} timer @param {number} now epoch ms
 * @returns {{ status: 'idle' | 'running' | 'paused', remainingMs: number | null }}
 */
export function timerStatus(timer, now) {
  if (timer.timerEndsAt !== null) return { status: 'running', remainingMs: Math.max(0, timer.timerEndsAt - now) };
  if (timer.timerPausedMs !== null) return { status: 'paused', remainingMs: timer.timerPausedMs };
  return { status: 'idle', remainingMs: null };
}
