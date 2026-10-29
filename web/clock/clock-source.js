// @ts-check
// The page's clock source. Normally real time; with `?at=<local date-time>`
// (e.g. ?at=2027-01-20T09:50) it starts at that moment and ticks forward, and
// `&speed=<n>` makes it run n times faster (60 = a minute per real second).
// Invalid values are ignored. `&speed=` only applies alongside `?at=`.

/**
 * @typedef {{ now: () => number, simulated: boolean }} ClockSource
 * `now()` returns epoch milliseconds; `simulated` is true while `?at=` is in use.
 */

const AT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Parse "YYYY-MM-DDTHH:MM[:SS]" as a local time, or null if it isn't a real one.
 * @param {string | null} value
 * @returns {number | null}
 */
function parseLocalDateTime(value) {
  const match = AT_PATTERN.exec(value ?? '');
  if (!match) return null;
  const [y, mo, d, h, mi, s] = match.slice(1).map((part) => Number(part ?? 0));
  const date = new Date(y, mo - 1, d, h, mi, s);
  const roundTrips =
    date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d &&
    date.getHours() === h && date.getMinutes() === mi && date.getSeconds() === s;
  return roundTrips ? date.getTime() : null;
}

/**
 * @param {string | null} value
 * @returns {number}
 */
function parseSpeed(value) {
  const speed = Number(value);
  return value && Number.isFinite(speed) && speed > 0 ? speed : 1;
}

/**
 * @param {{ search?: string, realNow?: () => number }} [options]
 *   `search` is `location.search`; `realNow` is the real clock.
 * @returns {ClockSource}
 */
export function createClockSource({ search = '', realNow = Date.now } = {}) {
  const params = new URLSearchParams(search);
  const at = parseLocalDateTime(params.get('at'));
  if (at === null) return { now: realNow, simulated: false };
  const speed = parseSpeed(params.get('speed'));
  const realStart = realNow();
  return {
    now: () => at + (realNow() - realStart) * speed,
    simulated: true,
  };
}
