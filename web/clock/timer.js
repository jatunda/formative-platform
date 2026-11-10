// @ts-check
// The classroom timer, as plain data saved with the device's settings. A
// running timer is only its end time and a paused one only its time left, so
// the time left is always worked out from the current time: a reload, a
// throttled tab or a sleeping laptop never makes it drift.

/**
 * The timer fields of `ClockSettings`. At most one of the first two is
 * non-null: `timerEndsAt` (epoch ms) while it runs, `timerPausedMs` (time
 * left) while it's paused. `timerTotalMs` is the length it was started with
 * (the ring's whole), kept through pauses; null or missing when unknown.
 * `timerLabel` is the teacher's name for it ("Quiz"), null or missing for none.
 * @typedef {{ timerEndsAt: number | null, timerPausedMs: number | null, timerTotalMs?: number | null,
 *   timerLabel?: string | null }} TimerState
 */

/**
 * A quick pick: a recent timer length (ms), with the name it was last given.
 * @typedef {{ ms: number, label?: string }} QuickPick
 */

import { formatDuration } from './format.js';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
/** The longest timer a teacher can type. */
export const MAX_DURATION_MS = 24 * 60 * MINUTE;
/** The one-tap timers, in minutes. */
export const PRESET_MINUTES = Object.freeze([1, 2, 5, 10]);
/** How many recent custom durations are kept as quick picks. */
export const QUICK_PICKS = 3;
/** The longest name a timer can have. */
export const MAX_NAME_LENGTH = 40;

/** @param {number} ms */
const isPreset = (ms) => PRESET_MINUTES.some((minutes) => minutes * MINUTE === ms);

/**
 * `pick` moved to the front of the quick picks (replacing any of its length),
 * keeping only the last 3.
 * @param {QuickPick[]} recent @param {QuickPick} pick
 */
const toFront = (recent, pick) => [pick, ...recent.filter((p) => p.ms !== pick.ms)].slice(0, QUICK_PICKS);

/**
 * The quick picks after a custom duration is used: it moves to the front
 * (keeping its name) and only the last 3 distinct ones are kept. A preset is
 * already one tap away, so typing one leaves the list as it was (same array back).
 * @param {QuickPick[]} recent most recent first @param {number} ms
 * @returns {QuickPick[]}
 */
export function rememberQuickPick(recent, ms) {
  if (isPreset(ms)) return recent;
  return toFront(recent, recent.find((p) => p.ms === ms) ?? { ms });
}

/**
 * The name saved with a duration's quick pick, or null.
 * @param {QuickPick[]} recent @param {number} ms
 */
export const quickPickLabel = (recent, ms) => recent.find((p) => p.ms === ms)?.label ?? null;

/**
 * The quick picks after the timer of `ms` is named `label` (null clears it):
 * its quick pick moves to the front with the name. A named preset gets one
 * too (the name is what's new); cleared, it goes, as a plain preset has none.
 * @param {QuickPick[]} recent @param {number} ms @param {string | null} label
 * @returns {QuickPick[]}
 */
export function nameQuickPick(recent, ms, label) {
  if (label) return toFront(recent, { ms, label });
  if (isPreset(ms)) return recent.filter((p) => p.ms !== ms);
  return recent.map((p) => (p.ms === ms ? { ms } : p));
}

/**
 * A typed name, trimmed and cut to 40 characters; null when it's empty.
 * @param {string} text
 */
export function cleanTimerLabel(text) {
  const label = text.trim().slice(0, MAX_NAME_LENGTH).trim();
  return label || null;
}

/**
 * The settings change that names the timer (an empty name clears it): the
 * timer, and its length's quick pick when its length is known.
 * @param {TimerState & { quickPicks: QuickPick[] }} settings @param {string} text
 * @returns {{ timerLabel: string | null, quickPicks?: QuickPick[] }}
 */
export function nameTimer(settings, text) {
  const timerLabel = cleanTimerLabel(text);
  const total = settings.timerTotalMs;
  return total ? { timerLabel, quickPicks: nameQuickPick(settings.quickPicks, total, timerLabel) } : { timerLabel };
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
  return inRange(ms);
}

/**
 * A duration rounded to whole seconds, if a timer can run that long.
 * @param {number} ms
 * @returns {{ ok: true, ms: number } | { ok: false, error: string }}
 */
function inRange(ms) {
  const rounded = Math.round(ms / SECOND) * SECOND;
  if (rounded < SECOND) return { ok: false, error: 'The timer needs at least 1 second.' };
  if (rounded > MAX_DURATION_MS) return { ok: false, error: 'The timer can run for 24 hours at most.' };
  return { ok: true, ms: rounded };
}

/**
 * The picker's custom row: a Minutes field and a Seconds field. With the
 * seconds left empty, the minutes field takes anything `parseDuration` does
 * ("7", "1.5", "7:30"); with seconds, the minutes are whole (or empty, for 0).
 * @param {string} minutes @param {string} seconds
 * @returns {{ ok: true, ms: number } | { ok: false, error: string }}
 */
export function parseMinutesSeconds(minutes, seconds) {
  const m = minutes.trim();
  const s = seconds.trim();
  if (s === '') return m === '' ? { ok: false, error: 'Type the minutes (and seconds) to time.' } : parseDuration(m);
  if (!/^\d{1,2}$/.test(s) || Number(s) > 59) return { ok: false, error: 'Seconds go from 0 to 59.' };
  if (!/^\d*$/.test(m)) return { ok: false, error: 'Use whole minutes with seconds, like 7 : 30.' };
  return inRange(Number(m) * MINUTE + Number(s) * SECOND);
}

/**
 * A timer of `durationMs` starting at `now` (replacing any timer already set),
 * named `label` if given.
 * @param {number} durationMs @param {number} now epoch ms @param {string | null} [label]
 * @returns {TimerState}
 */
export function startTimer(durationMs, now, label = null) {
  return { timerEndsAt: now + durationMs, timerPausedMs: null, timerTotalMs: durationMs, timerLabel: label };
}

/**
 * Stop the clock on a running timer, keeping its time left (same timer back
 * when it isn't running).
 * @param {TimerState} timer @param {number} now epoch ms
 * @returns {TimerState}
 */
export function pauseTimer(timer, now) {
  if (timer.timerEndsAt === null) return timer;
  return {
    timerEndsAt: null, timerPausedMs: Math.max(0, timer.timerEndsAt - now),
    timerTotalMs: timer.timerTotalMs ?? null, timerLabel: timer.timerLabel ?? null,
  };
}

/**
 * Start a paused timer again from its time left (same timer back when it
 * isn't paused).
 * @param {TimerState} timer @param {number} now epoch ms
 * @returns {TimerState}
 */
export function resumeTimer(timer, now) {
  if (timer.timerPausedMs === null) return timer;
  return { ...startTimer(timer.timerPausedMs, now, timer.timerLabel ?? null), timerTotalMs: timer.timerTotalMs ?? null };
}

/** No timer at all. @returns {TimerState} */
export function cancelTimer() {
  return { timerEndsAt: null, timerPausedMs: null, timerTotalMs: null, timerLabel: null };
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
 * The timer's time left in words, always with seconds: "4:59 left",
 * "Paused · 4:00 left", or '' with no timer. Rounded up, so a 5 min timer
 * reads 5:00 when it starts and 0:00 as it rings.
 * @param {TimerState} timer @param {number} now epoch ms
 * @returns {string}
 */
export function timerText(timer, now) {
  const { status, remainingMs } = timerStatus(timer, now);
  if (remainingMs === null) return '';
  const left = `${formatDuration(Math.ceil(remainingMs / SECOND) * SECOND)} left`;
  return status === 'paused' ? `Paused · ${left}` : left;
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

/**
 * The share of the timer's length still left, 0–1, for its ring: exact (not
 * rounded to the second), so the ring moves a little every tick. Full when the
 * length is unknown; 0 with no timer.
 * @param {TimerState} timer @param {number} now epoch ms
 */
export function timerProgress(timer, now) {
  const { remainingMs } = timerStatus(timer, now);
  if (remainingMs === null) return 0;
  const total = timer.timerTotalMs;
  if (!total) return 1;
  return Math.min(1, Math.max(0, remainingMs / total));
}

/**
 * A timer's name, said the way people say it: "5:00 timer", or just "Timer"
 * when its length is unknown; with the teacher's name for it first, "Quiz ·
 * 5:00 timer" (or just "Quiz").
 * @param {number | null | undefined} totalMs @param {string | null} [label]
 */
export function timerName(totalMs, label = null) {
  if (!totalMs) return label || 'Timer';
  const name = `${formatDuration(totalMs)} timer`;
  return label ? `${label} · ${name}` : name;
}

/**
 * What the timer's ring shows: the time left (always with seconds, rounded
 * up), its title (the teacher's name for it, else "5:00 timer"), that name
 * itself (null for none), its whole name ("Quiz · 5:00 timer"), the share
 * left, and the digits' accessible name
 * ("5:00 timer, running, 4:12 to go"). `rangTotalMs` and `rangLabel` are the
 * length and name of a timer that has rung and is gone (it shows 0:00 until
 * dismissed).
 * @param {TimerState} timer @param {number} now epoch ms
 * @param {{ rangTotalMs?: number | null, rangLabel?: string | null }} [rung]
 * @returns {{ status: 'running' | 'paused' | 'done', left: string, title: string, timerLabel: string | null,
 *   name: string, progress: number, label: string }}
 */
export function timerRingView(timer, now, { rangTotalMs = null, rangLabel = null } = {}) {
  const { status, remainingMs } = timerStatus(timer, now);
  const done = status === 'idle';
  const totalMs = done ? rangTotalMs : timer.timerTotalMs;
  const label = done ? rangLabel : timer.timerLabel ?? null;
  const name = timerName(totalMs, label);
  const left = formatDuration(done ? 0 : Math.ceil(/** @type {number} */ (remainingMs) / SECOND) * SECOND);
  return {
    status: done ? 'done' : status,
    left,
    title: label || timerName(totalMs),
    timerLabel: label,
    name,
    progress: done ? 0 : timerProgress(timer, now),
    label: done ? `${name}, time's up` : `${name}, ${status}, ${left} to go`,
  };
}
