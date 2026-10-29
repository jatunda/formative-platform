// @ts-check
// Text formatting for the School Clock. Every clock time on the page goes
// through formatClockTime, so the 24-hour setting (ticket 10) has one place to
// live. Durations ("42:17 left") are separate and never affected by it.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** @param {number} n */
const pad2 = (n) => String(n).padStart(2, '0');

/**
 * A time of day, e.g. "8:05 AM" or with seconds "1:04:09 PM".
 * @param {Date} date
 * @param {{ seconds?: boolean }} [options]
 * @returns {string}
 */
export function formatClockTime(date, { seconds = false } = {}) {
  const h = date.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const secs = seconds ? `:${pad2(date.getSeconds())}` : '';
  return `${hour12}:${pad2(date.getMinutes())}${secs} ${h < 12 ? 'AM' : 'PM'}`;
}

/**
 * A length of time as "M:SS", or "H:MM:SS" from an hour up. Whole seconds,
 * rounded down.
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/**
 * A countdown that may run for days: like formatDuration under a day, then
 * whole days and hours, e.g. "2d 14h" (rounded down).
 * @param {number} ms
 * @returns {string}
 */
export function formatLongDuration(ms) {
  const totalHours = Math.floor(ms / 3600000);
  if (totalHours < 24) return formatDuration(ms);
  return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`;
}

/**
 * A date without the year, e.g. "Mon, Nov 30".
 * @param {Date} date
 * @returns {string}
 */
export function formatShortDate(date) {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/**
 * A date, e.g. "Wed, Jan 20, 2027".
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
