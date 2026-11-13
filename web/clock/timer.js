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
 * `timerName` is the teacher's name for it ("Quiz"), null or missing for none.
 * @typedef {{ timerEndsAt: number | null, timerPausedMs: number | null, timerTotalMs?: number | null,
 *   timerName?: string | null }} TimerState
 */

/**
 * A quick pick: a recent timer length (ms), with the name it was last given.
 * @typedef {{ ms: number, name?: string }} QuickPick
 */

import { formatDuration } from './format.js';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
/** The longest timer a teacher can type. */
export const MAX_DURATION_MS = 24 * 60 * MINUTE;
/** The one-tap timers, in minutes. */
export const PRESET_MINUTES = Object.freeze([1, 2, 5, 10]);
/** How many recent custom durations are kept as quick picks. */
export const QUICK_PICKS = 5;
/** The longest name a timer can have. */
export const MAX_NAME_LENGTH = 40;

/** @param {number} ms */
const isPreset = (ms) => PRESET_MINUTES.some((minutes) => minutes * MINUTE === ms);

/**
 * `pick` moved to the front of the quick picks (replacing any of its length),
 * keeping only the last `QUICK_PICKS` (5).
 * @param {QuickPick[]} recent @param {QuickPick} pick
 */
const toFront = (recent, pick) => [pick, ...recent.filter((p) => p.ms !== pick.ms)].slice(0, QUICK_PICKS);

/**
 * The quick picks after a custom duration is used: it moves to the front
 * (keeping its name) and only the last 5 distinct ones are kept. A preset is
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
export const quickPickName = (recent, ms) => recent.find((p) => p.ms === ms)?.name ?? null;

/**
 * The quick picks after the timer of `ms` is named `name` (null clears it):
 * its quick pick moves to the front with the name. A named preset gets one
 * too (the name is what's new); cleared, it goes, as a plain preset has none.
 * @param {QuickPick[]} recent @param {number} ms @param {string | null} name
 * @returns {QuickPick[]}
 */
export function nameQuickPick(recent, ms, name) {
  if (name) return toFront(recent, { ms, name });
  if (isPreset(ms)) return recent.filter((p) => p.ms !== ms);
  return recent.map((p) => (p.ms === ms ? { ms } : p));
}

/**
 * A typed name, trimmed and cut to 40 characters; null when it's empty.
 * @param {string} text
 */
export function cleanTimerName(text) {
  const name = text.trim().slice(0, MAX_NAME_LENGTH).trim();
  return name || null;
}

/**
 * The settings change that names the timer (an empty name clears it): the
 * timer, and its length's quick pick when its length is known.
 * @param {TimerState & { quickPicks: QuickPick[] }} settings @param {string} text
 * @returns {{ timerName: string | null, quickPicks?: QuickPick[] }}
 */
export function nameTimer(settings, text) {
  const timerName = cleanTimerName(text);
  const total = settings.timerTotalMs;
  return total ? { timerName, quickPicks: nameQuickPick(settings.quickPicks, total, timerName) } : { timerName };
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
 * named `name` if given.
 * @param {number} durationMs @param {number} now epoch ms @param {string | null} [name]
 * @returns {TimerState}
 */
export function startTimer(durationMs, now, name = null) {
  return { timerEndsAt: now + durationMs, timerPausedMs: null, timerTotalMs: durationMs, timerName: name };
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
    timerTotalMs: timer.timerTotalMs ?? null, timerName: timer.timerName ?? null,
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
  return { ...startTimer(timer.timerPausedMs, now, timer.timerName ?? null), timerTotalMs: timer.timerTotalMs ?? null };
}

/** No timer at all. @returns {TimerState} */
export function cancelTimer() {
  return { timerEndsAt: null, timerPausedMs: null, timerTotalMs: null, timerName: null };
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
 * @param {number | null | undefined} totalMs @param {string | null} [name]
 */
export function fullTimerName(totalMs, name = null) {
  if (!totalMs) return name || 'Timer';
  const byLength = `${formatDuration(totalMs)} timer`;
  return name ? `${name} · ${byLength}` : byLength;
}

/**
 * A quick pick as the picker lists it: its length, then its name if it has
 * one ("20:00 · Quiz", "7:30").
 * @param {QuickPick} pick
 */
export function quickPickText({ ms, name }) {
  return name ? `${formatDuration(ms)} · ${name}` : formatDuration(ms);
}

/**
 * A timer that has rung and is gone: its length (null if unknown) and name
 * (null for none). Its ring shows 0:00 of it until dismissed.
 * @typedef {{ totalMs: number | null, name: string | null }} RangTimer
 */

/**
 * A timer's name as a title in two parts: `lead`, the teacher's name for it
 * ('' for none), which is cut short or wrapped where space runs out, and
 * `tail`, the rest, which always shows in full (" · 20:00", "20:00 timer ·
 * paused").
 * @typedef {{ lead: string, tail: string }} TimerTitle
 */

/**
 * What the timer's ring shows: the time left (`remainingMs`, rounded up to the
 * second, and `left`, always with seconds); its `title` on the ring ("Quiz ·
 * 5:00", or "5:00 timer" with no name) and its `heading` in the mini player
 * ("Quiz · 5:00 timer"), each with " · paused" while paused; the teacher's
 * `name` for it (null for none); its `fullName` ("Quiz · 5:00 timer"); the
 * share left; and the digits' accessible name (`label`: "5:00 timer, running,
 * 4:12 to go"). With no timer it's the one that `rang`, done.
 * @param {TimerState} timer @param {number} now epoch ms
 * @param {RangTimer | null} [rang]
 * @returns {{ status: 'running' | 'paused' | 'done', remainingMs: number, left: string, title: TimerTitle,
 *   heading: TimerTitle, name: string | null, fullName: string, progress: number, label: string }}
 */
export function timerRingView(timer, now, rang = null) {
  const { status, remainingMs } = timerStatus(timer, now);
  const done = status === 'idle';
  const totalMs = done ? rang?.totalMs ?? null : timer.timerTotalMs;
  const name = done ? rang?.name ?? null : timer.timerName ?? null;
  const fullName = fullTimerName(totalMs, name);
  const roundedMs = done ? 0 : Math.ceil(/** @type {number} */ (remainingMs) / SECOND) * SECOND;
  const left = formatDuration(roundedMs);
  const paused = status === 'paused' ? ' · paused' : '';
  /** A title of the name, then `length` when the length is known. @param {string} length @returns {TimerTitle} */
  const titled = (length) => (name
    ? { lead: name, tail: `${totalMs ? ` · ${length}` : ''}${paused}` }
    : { lead: '', tail: `${fullName}${paused}` });
  return {
    status: done ? 'done' : status,
    remainingMs: roundedMs,
    left,
    title: titled(totalMs ? formatDuration(totalMs) : ''),
    heading: titled(fullTimerName(totalMs)),
    name,
    fullName,
    progress: done ? 0 : timerProgress(timer, now),
    label: done ? `${fullName}, time's up` : `${fullName}, ${status}, ${left} to go`,
  };
}

/** @typedef {ReturnType<typeof timerRingView>} TimerView */

/**
 * This tab's Timer, from the settings it loaded. In simulated time (`?at=`)
 * the Timer belongs to this tab alone: the tab starts with none, and the real
 * Timer saved by other tabs is never loaded, cleared or overwritten (every
 * save puts it back as it was loaded). In real time the Timer is the saved one.
 * @template {TimerState} S
 * @param {S} loaded the settings as loaded @param {{ simulated: boolean }} options
 * @returns {{ settings: S, toSave: (settings: S) => S, settle: (settings: S, now: number) => S }}
 *   `settings`: what the tab starts with; `toSave`: the settings to save;
 *   `settle`: the settings with a Timer whose end has passed cleared (it has
 *   rung by then), the same object back when nothing changes.
 */
export function createTabTimer(loaded, { simulated }) {
  /** @type {TimerState} */
  const saved = {
    timerEndsAt: loaded.timerEndsAt, timerPausedMs: loaded.timerPausedMs, timerTotalMs: loaded.timerTotalMs,
    timerName: loaded.timerName,
  };
  return {
    settings: simulated ? { ...loaded, ...cancelTimer() } : loaded,
    toSave: (settings) => (simulated ? { ...settings, ...saved } : settings),
    settle: (settings, now) => (settleTimer(settings, now) === settings ? settings : { ...settings, ...cancelTimer() }),
  };
}
