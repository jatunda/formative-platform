// @ts-check
// The School Clock's model: every rule about what a moment means lives here.
// Pure: give it a time and the School Year registry, get a description back.
// Times are local wall-clock (see school-years.js).

/** @typedef {import('./school-years.js').SchoolYear} SchoolYear */
/** @typedef {import('./school-years.js').Segment} Segment */
/** @typedef {import('./school-years.js').SegmentKind} SegmentKind */
/** @typedef {import('./school-years.js').Division} Division */

/**
 * A Segment placed on a real date.
 * @typedef {{ name: string, kind: SegmentKind, start: Date, end: Date }} TimedSegment
 */

/**
 * @typedef {{
 *   dayLabel: string | null,
 *   state: 'segment' | 'passing' | 'beforeSchool' | 'afterSchool' | 'dayOff' | 'unknown',
 *   current: TimedSegment | null,
 *   passing: { start: Date, end: Date } | null,
 *   upNext: TimedSegment | null,
 *   timeLeftMs: number | null,
 *   timeElapsedMs: number | null,
 * }} Moment
 * - `segment`: inside `current`; time left/elapsed are within it.
 * - `passing`: in the gap `passing` before `upNext`; time left/elapsed are
 *   within the gap. Segments that touch have no Passing Period between them.
 * - `beforeSchool`: `upNext` is the first Segment; time left counts down to it.
 * - `afterSchool`: time elapsed counts from the last Segment's end.
 * - `dayOff`: not a School Day; `dayLabel` says why (e.g. "Weekend").
 * - `unknown`: nothing is known about this date's Segments; just tell time.
 */

/** @type {Omit<Moment, 'dayLabel' | 'state'>} */
const NOTHING = {
  current: null,
  passing: null,
  upNext: null,
  timeLeftMs: null,
  timeElapsedMs: null,
};

/** @param {Date} d */
function isoDate(d) {
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * @param {Date} day
 * @param {string} hhmm
 */
function atWallClock(day, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

/**
 * Describe where the school day stands at `now`.
 * @param {Date} now
 * @param {SchoolYear[]} schoolYears the registry (school-years.js)
 * @param {{ division?: Division }} [settings] device settings; Division defaults to HS
 * @returns {Moment}
 */
export function describeMoment(now, schoolYears, { division = 'HS' } = {}) {
  const date = isoDate(now);
  const year = schoolYears.find((y) => y.start <= date && date <= y.end);
  if (!year) return { dayLabel: null, state: 'unknown', ...NOTHING };
  const weekday = now.getDay();
  if (weekday === 0 || weekday === 6) return { dayLabel: 'Weekend', state: 'dayOff', ...NOTHING };
  const bellSchedule = year.bellSchedules[year.weekdayDefaults[/** @type {1 | 2 | 3 | 4 | 5} */ (weekday)]];
  if (!bellSchedule) return { dayLabel: null, state: 'unknown', ...NOTHING };
  const plan = bellSchedule.byDivision?.[division] ?? bellSchedule.segments;
  const segments = plan.map((s) => ({
    name: s.name,
    kind: s.kind,
    start: atWallClock(now, s.start),
    end: atWallClock(now, s.end),
  }));
  const t = now.getTime();
  const dayLabel = bellSchedule.name;
  const current = segments.find((s) => s.start.getTime() <= t && t < s.end.getTime());
  if (current) {
    return {
      dayLabel,
      state: 'segment',
      current,
      passing: null,
      upNext: null,
      timeLeftMs: current.end.getTime() - t,
      timeElapsedMs: t - current.start.getTime(),
    };
  }
  const nextIndex = segments.findIndex((s) => t < s.start.getTime());
  if (nextIndex === 0) {
    const first = segments[0];
    return {
      dayLabel,
      state: 'beforeSchool',
      current: null,
      passing: null,
      upNext: first,
      timeLeftMs: first.start.getTime() - t,
      timeElapsedMs: null,
    };
  }
  if (nextIndex === -1) {
    const last = segments[segments.length - 1];
    return {
      dayLabel,
      state: 'afterSchool',
      current: null,
      passing: null,
      upNext: null,
      timeLeftMs: null,
      timeElapsedMs: t - last.end.getTime(),
    };
  }
  const upNext = segments[nextIndex];
  const passing = { start: segments[nextIndex - 1].end, end: upNext.start };
  return {
    dayLabel,
    state: 'passing',
    current: null,
    passing,
    upNext,
    timeLeftMs: passing.end.getTime() - t,
    timeElapsedMs: t - passing.start.getTime(),
  };
}
