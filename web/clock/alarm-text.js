// @ts-check
// The Alarm editor's words and form values, kept apart from its DOM: the
// one-line summary of an Alarm in the Settings list ("5 min before the end ·
// Periods 1–7 · Block Days · Chime"), the Bell Schedules a teacher can tick,
// and turning what was typed (hour, minute, minutes) into an Alarm's fields.
import { BLOCK_DAYS } from './clock-settings.js';
import { formatClockTime, formatShortDate } from './format.js';
import { anchorText, repeatText } from './ring-words.js';
import { SOUND_NAMES } from './sound.js';

/** @typedef {import('./clock-settings.js').Alarm} Alarm */
/** @typedef {import('./clock-settings.js').PeriodAnchor} PeriodAnchor */

/**
 * One Bell Schedule a teacher can tick: its name and every Bell Schedule key
 * with that name (the three Finals days are one choice).
 * @typedef {{ name: string, keys: string[] }} BellScheduleChoice
 */

/**
 * Every Bell Schedule in `schoolYears`, one choice per name, in the order
 * they're first listed.
 * @param {{ bellSchedules: Record<string, { name: string }> }[]} schoolYears
 * @returns {BellScheduleChoice[]}
 */
export function bellScheduleChoices(schoolYears) {
  /** @type {Map<string, string[]>} */
  const byName = new Map();
  for (const year of schoolYears) {
    for (const [key, { name }] of Object.entries(year.bellSchedules)) {
      const keys = byName.get(name) ?? [];
      if (!keys.includes(key)) keys.push(key);
      byName.set(name, keys);
    }
  }
  return [...byName].map(([name, keys]) => ({ name, keys }));
}

/** Whether `keys` is exactly the Block Days. @param {string[]} keys */
export const isBlockDays = (keys) => keys.length === BLOCK_DAYS.length && BLOCK_DAYS.every((k) => keys.includes(k));

/**
 * The Bell Schedules an Alarm is limited to, in words: "Block Days", or the
 * names ("All Day, Finals"); '' for every Bell Schedule.
 * @param {string[] | null} keys @param {BellScheduleChoice[]} choices
 */
function bellSchedulesText(keys, choices) {
  if (keys === null) return '';
  if (isBlockDays(keys)) return 'Block Days';
  return choices.filter((c) => c.keys.some((k) => keys.includes(k))).map((c) => c.name).join(', ');
}

/**
 * The Periods a Period Alarm applies to, in words: runs of three or more
 * numbered Periods are shortened ("Periods 1–7"), the rest named ("Period 3,
 * Period 6, Seminar").
 * @param {string[]} periods
 */
export function periodsText(periods) {
  const numbers = periods.map((p) => /^Period (\d+)$/.exec(p)).filter((m) => m !== null)
    .map((m) => Number(m[1])).sort((a, b) => a - b);
  /** @type {string[]} */
  const parts = [];
  for (let i = 0; i < numbers.length;) {
    let j = i;
    while (j + 1 < numbers.length && numbers[j + 1] === numbers[j] + 1) j += 1;
    if (j - i >= 2) parts.push(`Periods ${numbers[i]}–${numbers[j]}`);
    else for (let k = i; k <= j; k += 1) parts.push(`Period ${numbers[k]}`);
    i = j + 1;
  }
  return [...parts, ...periods.filter((p) => !/^Period \d+$/.test(p))].join(', ');
}

/** Where a Period Alarm rings, starting the line: "Minute 5", "Halfway". @param {PeriodAnchor} anchor */
const anchorHint = (anchor) => {
  const words = anchorText(anchor);
  return words[0].toUpperCase() + words.slice(1);
};

/** A "HH:MM" time of day as the page writes clock times. @param {string} time @param {boolean} use24Hour */
const timeText = (time, use24Hour) => {
  const [h, m] = time.split(':').map(Number);
  return formatClockTime(new Date(2000, 0, 1, h, m), { use24Hour });
};

/** A "YYYY-MM-DD" date as a local Date. @param {string} date */
const localDate = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * The Alarm's line under its name in the Settings list:
 * "7:55 AM · every School Day · School bell", "Halfway · Period 3, Period 6 · Beep".
 * @param {Alarm} alarm
 * @param {{ use24Hour: boolean, choices: BellScheduleChoice[] }} options
 */
export function alarmHint(alarm, { use24Hour, choices }) {
  const when = alarm.kind === 'clock'
    ? [timeText(alarm.time, use24Hour),
      alarm.repeat === 'once' ? `once, ${formatShortDate(localDate(/** @type {string} */ (alarm.date)))}` : repeatText(alarm)]
    : [anchorHint(alarm.anchor), periodsText(alarm.periods)];
  return [...when, bellSchedulesText(alarm.bellSchedules, choices), SOUND_NAMES[alarm.sound]].filter(Boolean).join(' · ');
}

/** An Alarm's name in the list: its label, else its kind. @param {Alarm} alarm */
export const alarmName = (alarm) => alarm.label || (alarm.kind === 'clock' ? 'Clock Alarm' : 'Period Alarm');

/** An id no Alarm in `alarms` has yet: "alarm-1", "alarm-2", … @param {Alarm[]} alarms */
export function nextAlarmId(alarms) {
  const ids = new Set(alarms.map((a) => a.id));
  let n = 1;
  while (ids.has(`alarm-${n}`)) n += 1;
  return `alarm-${n}`;
}

/** @param {number} n */
const pad2 = (n) => String(n).padStart(2, '0');

/** A whole number typed in a field, or null. @param {string} text */
const wholeNumber = (text) => (/^\s*\d{1,3}\s*$/.test(text) ? Number(text) : null);

/**
 * A typed time of day as "HH:MM", or null if it isn't one. `pm` is null on a
 * 24-hour clock (hour 0–23), else whether PM was picked (hour 1–12).
 * @param {string} hourText @param {string} minuteText @param {boolean | null} pm
 * @returns {string | null}
 */
export function parseTime(hourText, minuteText, pm) {
  const hour = wholeNumber(hourText);
  const minute = wholeNumber(minuteText);
  if (hour === null || minute === null || minute > 59) return null;
  if (pm === null) return hour <= 23 ? `${pad2(hour)}:${pad2(minute)}` : null;
  if (hour < 1 || hour > 12) return null;
  return `${pad2((hour % 12) + (pm ? 12 : 0))}:${pad2(minute)}`;
}

/**
 * A "HH:MM" time split for the form's fields: on a 12-hour clock the hour is
 * 1–12 and `pm` says which half of the day.
 * @param {string} time @param {boolean} use24Hour
 */
export function timeFields(time, use24Hour) {
  const [h, m] = time.split(':').map(Number);
  return {
    hour: use24Hour ? pad2(h) : String(h % 12 === 0 ? 12 : h % 12),
    minute: pad2(m),
    pm: h >= 12,
  };
}

/** Minutes typed for a Period Alarm (1–240), or null. @param {string} text */
export function parseMinutes(text) {
  const minutes = wholeNumber(text);
  return minutes !== null && minutes >= 1 && minutes <= 240 ? minutes : null;
}

/**
 * The day a "once" Clock Alarm at `time` rings: today if that time is still
 * to come, else tomorrow, as "YYYY-MM-DD".
 * @param {string} time @param {Date} now
 */
export function onceDate(time, now) {
  const [h, m] = time.split(':').map(Number);
  const passed = h * 60 + m <= now.getHours() * 60 + now.getMinutes();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (passed ? 1 : 0));
  return `${day.getFullYear()}-${pad2(day.getMonth() + 1)}-${pad2(day.getDate())}`;
}
