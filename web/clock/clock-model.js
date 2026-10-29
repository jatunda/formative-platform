// @ts-check
// The School Clock's model: every rule about what a moment means lives here.
// Pure: give it a time and the School Year registry, get a description back.
// Times are local wall-clock (see school-years.js): every Date is built from
// local year/month/day/hour/minute, so a daylight-saving change needs no
// special handling and a countdown always ends on the wall-clock minute.

/** @typedef {import('./school-years.js').SchoolYear} SchoolYear */
/** @typedef {import('./school-years.js').Segment} Segment */
/** @typedef {import('./school-years.js').SegmentKind} SegmentKind */
/** @typedef {import('./school-years.js').Division} Division */

/**
 * A Segment placed on a real date.
 * @typedef {{ name: string, kind: SegmentKind, start: Date, end: Date }} TimedSegment
 */

/**
 * The Next School Day: its Day Label and its first Segment.
 * @typedef {{ dayLabel: string, firstSegment: TimedSegment }} NextSchoolDay
 */

/**
 * @typedef {{
 *   dayLabel: string | null,
 *   state: 'segment' | 'passing' | 'beforeSchool' | 'afterSchool' | 'dayOff' | 'experienceWeek' | 'summer' | 'unknown',
 *   current: TimedSegment | null,
 *   passing: { start: Date, end: Date } | null,
 *   upNext: TimedSegment | null,
 *   timeLeftMs: number | null,
 *   timeElapsedMs: number | null,
 *   nextSchoolDay: NextSchoolDay | null,
 *   untilNextSchoolDayMs: number | null,
 *   schoolEndedAt: Date | null,
 *   sinceSchoolEndedMs: number | null,
 *   summerDay: number | null,
 * }} Moment
 * - `segment`: inside `current`; time left/elapsed are within it.
 * - `passing`: in the gap `passing` before `upNext`; time left/elapsed are
 *   within the gap. Segments that touch have no Passing Period between them.
 * - `beforeSchool`: `upNext` is the first Segment; time left counts down to it.
 * - `afterSchool`: time elapsed counts from the last Segment's end.
 * - `dayOff`: not a School Day; `dayLabel` says why (e.g. "Weekend").
 * - `experienceWeek`: in session for this Division, but with no Segments.
 * - `summer`: from the end of a School Year's last School Day's last Segment
 *   until the next School Year begins; `summerDay` counts from 1 on that last
 *   School Day. Without a registered next year it lasts until a year after
 *   the last one began.
 * - `unknown`: nothing is known about this date's Segments; just tell time.
 *
 * Off-Hours (every state but `segment`, `passing` and `unknown`) also gives:
 * - `nextSchoolDay`: the soonest School Day whose first Segment hasn't started
 *   (today, before school), skipping weekends, days off and Experience Week;
 *   null when no registered year has one. `untilNextSchoolDayMs` counts to it.
 * - `schoolEndedAt`: the last Segment's end of the most recent School Day that
 *   has ended (today, after school); null before the first one ever.
 *   `sinceSchoolEndedMs` counts from it.
 *
 * A Calendar Exception for the moment's Division wins over one for both
 * Divisions, which wins over the Weekday Default.
 */

/**
 * What one date is, for one Division.
 * `bellSchedule` is the School Day's key in `SchoolYear.bellSchedules`.
 * @typedef {{ kind: 'school', dayLabel: string, bellSchedule: string, segments: TimedSegment[] }
 *   | { kind: 'dayOff', dayLabel: string }
 *   | { kind: 'experienceWeek' }
 *   | { kind: 'unknown' }} Day
 */

const EXPERIENCE_WEEK_LABEL = 'HS Experience Week';

/** @type {Omit<Moment, 'dayLabel' | 'state'>} */
const NOTHING = {
  current: null,
  passing: null,
  upNext: null,
  timeLeftMs: null,
  timeElapsedMs: null,
  nextSchoolDay: null,
  untilNextSchoolDayMs: null,
  schoolEndedAt: null,
  sinceSchoolEndedMs: null,
  summerDay: null,
};

/** @param {Date} d */
function isoDate(d) {
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** @param {string} iso "YYYY-MM-DD" */
function localMidnight(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * The same wall-clock date `n` days later (earlier if negative).
 * @param {Date} day
 * @param {number} n
 */
function addDays(day, n) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + n);
}

/**
 * Whole calendar days from `a`'s date to `b`'s date, regardless of DST.
 * @param {Date} a
 * @param {Date} b
 */
function daysBetween(a, b) {
  const utc = (/** @type {Date} */ d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(b) - utc(a)) / 86400000);
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
 * What `day` is for `division`.
 * @param {Date} day
 * @param {SchoolYear[]} schoolYears
 * @param {Division} division
 * @returns {Day}
 */
function planDay(day, schoolYears, division) {
  const date = isoDate(day);
  const year = schoolYears.find((y) => y.start <= date && date <= y.end);
  if (!year) return { kind: 'unknown' };
  const forDate = year.calendarExceptions.filter((e) => e.date === date);
  const exception =
    forDate.find((e) => e.division === division) ?? forDate.find((e) => e.division === undefined);
  if (exception?.kind === 'dayOff') return { kind: 'dayOff', dayLabel: exception.dayLabel };
  if (exception?.kind === 'experienceWeek') return { kind: 'experienceWeek' };
  const weekday = day.getDay();
  let key;
  if (exception) key = exception.bellSchedule;
  else if (weekday === 0 || weekday === 6) return { kind: 'dayOff', dayLabel: 'Weekend' };
  else key = year.weekdayDefaults[/** @type {1 | 2 | 3 | 4 | 5} */ (weekday)];
  const bellSchedule = year.bellSchedules[key];
  if (!bellSchedule) return { kind: 'unknown' };
  const plan = bellSchedule.byDivision?.[division] ?? bellSchedule.segments;
  const segments = plan.map((s) => ({
    name: s.name,
    kind: s.kind,
    start: atWallClock(day, s.start),
    end: atWallClock(day, s.end),
  }));
  return { kind: 'school', dayLabel: bellSchedule.name, bellSchedule: key, segments };
}

/**
 * The soonest School Day on or after `day` whose first Segment starts after `t`.
 * @param {Date} day
 * @param {number} t
 * @param {SchoolYear[]} schoolYears
 * @param {Division} division
 * @returns {NextSchoolDay | null}
 */
function findNextSchoolDay(day, t, schoolYears, division) {
  const lastDate = schoolYears.reduce((max, y) => (y.end > max ? y.end : max), '');
  for (let d = day; isoDate(d) <= lastDate; d = addDays(d, 1)) {
    const plan = planDay(d, schoolYears, division);
    if (plan.kind === 'school' && t < plan.segments[0].start.getTime()) {
      return { dayLabel: plan.dayLabel, firstSegment: plan.segments[0] };
    }
  }
  return null;
}

/**
 * The end of the last Segment of the latest School Day, on or before `day`,
 * that has ended by `t`.
 * @param {Date} day
 * @param {number} t
 * @param {SchoolYear[]} schoolYears
 * @param {Division} division
 * @param {string} [firstDate] search no earlier than this "YYYY-MM-DD"
 * @returns {Date | null}
 */
function findSchoolEnded(day, t, schoolYears, division, firstDate) {
  const earliest = firstDate ?? schoolYears.reduce((min, y) => (y.start < min ? y.start : min), '9999');
  for (let d = day; isoDate(d) >= earliest; d = addDays(d, -1)) {
    const plan = planDay(d, schoolYears, division);
    if (plan.kind !== 'school') continue;
    const end = plan.segments[plan.segments.length - 1].end;
    if (end.getTime() <= t) return end;
  }
  return null;
}

/**
 * The day after a School Year without a registered successor stops being
 * Summer: one year after it began.
 * @param {SchoolYear} year
 */
function summerLimit(year) {
  return `${Number(year.start.slice(0, 4)) + 1}${year.start.slice(4)}`;
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
  const t = now.getTime();
  const today = localMidnight(date);

  /** Off-Hours fields, for any state outside school. */
  const offHours = () => {
    const nextSchoolDay = findNextSchoolDay(today, t, schoolYears, division);
    const schoolEndedAt = findSchoolEnded(today, t, schoolYears, division);
    return {
      nextSchoolDay,
      untilNextSchoolDayMs: nextSchoolDay ? nextSchoolDay.firstSegment.start.getTime() - t : null,
      schoolEndedAt,
      sinceSchoolEndedMs: schoolEndedAt ? t - schoolEndedAt.getTime() : null,
    };
  };

  // Summer: the latest School Year begun by today has had its last School Day.
  const latest = schoolYears
    .filter((y) => y.start <= date)
    .reduce((a, y) => (!a || y.start > a.start ? y : a), /** @type {SchoolYear | null} */ (null));
  if (latest) {
    const lastEnd = findSchoolEnded(localMidnight(latest.end), Infinity, schoolYears, division, latest.start);
    const hasNextYear = schoolYears.some((y) => y.start > date);
    const inSummer =
      lastEnd !== null &&
      lastEnd.getTime() <= t &&
      (date <= latest.end || hasNextYear || date < summerLimit(latest));
    if (inSummer) {
      return {
        ...NOTHING,
        dayLabel: 'Summer',
        state: 'summer',
        ...offHours(),
        summerDay: daysBetween(lastEnd, now) + 1,
      };
    }
  }

  const plan = planDay(today, schoolYears, division);
  if (plan.kind === 'unknown') return { dayLabel: null, state: 'unknown', ...NOTHING };
  if (plan.kind === 'dayOff') return { ...NOTHING, dayLabel: plan.dayLabel, state: 'dayOff', ...offHours() };
  if (plan.kind === 'experienceWeek') {
    return { ...NOTHING, dayLabel: EXPERIENCE_WEEK_LABEL, state: 'experienceWeek', ...offHours() };
  }

  const { dayLabel, segments } = plan;
  const current = segments.find((s) => s.start.getTime() <= t && t < s.end.getTime());
  if (current) {
    return {
      ...NOTHING,
      dayLabel,
      state: 'segment',
      current,
      timeLeftMs: current.end.getTime() - t,
      timeElapsedMs: t - current.start.getTime(),
    };
  }
  const nextIndex = segments.findIndex((s) => t < s.start.getTime());
  if (nextIndex === 0) {
    const first = segments[0];
    return {
      ...NOTHING,
      dayLabel,
      state: 'beforeSchool',
      upNext: first,
      timeLeftMs: first.start.getTime() - t,
      ...offHours(),
    };
  }
  if (nextIndex === -1) {
    const last = segments[segments.length - 1];
    return {
      ...NOTHING,
      dayLabel,
      state: 'afterSchool',
      timeElapsedMs: t - last.end.getTime(),
      ...offHours(),
    };
  }
  const upNext = segments[nextIndex];
  const passing = { start: segments[nextIndex - 1].end, end: upNext.start };
  return {
    ...NOTHING,
    dayLabel,
    state: 'passing',
    passing,
    upNext,
    timeLeftMs: passing.end.getTime() - t,
    timeElapsedMs: t - passing.start.getTime(),
  };
}

/** @typedef {import('./clock-settings.js').RingSettings} RingSettings */
/** @typedef {import('./clock-settings.js').SoundName} SoundName */

/**
 * One moment something rings.
 * @typedef {{ at: Date, source: 'bell', sound: SoundName, starts: TimedSegment | null, ends: TimedSegment | null }} BellRing
 *   `starts`/`ends`: the Segment starting/ending at this Bell (one Bell where
 *   one ends as the next begins).
 */

/** @typedef {import('./clock-settings.js').ClockAlarm} ClockAlarm */

/** @typedef {{ at: Date, source: 'clockAlarm', sound: SoundName, alarm: ClockAlarm }} ClockAlarmRing */

/** @typedef {import('./clock-settings.js').PeriodAlarm} PeriodAlarm */

/** @typedef {{ at: Date, source: 'periodAlarm', sound: SoundName, alarm: PeriodAlarm, period: TimedSegment }} PeriodAlarmRing */

/**
 * @typedef {{ at: Date, source: 'timer', sound: SoundName }} TimerRing
 */

/**
 * @typedef {BellRing | ClockAlarmRing | PeriodAlarmRing | TimerRing} Ring
 * `source` says what rang; Alarm rings carry the `alarm` that rang.
 */

/**
 * When a Period Alarm rings in `period`, or null if the Period is too short
 * for its anchor.
 * @param {PeriodAlarm} alarm
 * @param {TimedSegment} period
 * @returns {Date | null}
 */
function periodAlarmTime(alarm, period) {
  const start = period.start.getTime();
  const end = period.end.getTime();
  const { anchor } = alarm;
  let t;
  if (anchor.from === 'start') t = start + anchor.minutes * 60000;
  else if (anchor.from === 'end') t = end - anchor.minutes * 60000;
  else t = start + (end - start) / 2;
  return start <= t && t <= end ? new Date(t) : null;
}

/**
 * Whether an Alarm limited to some Bell Schedules may ring on `plan`'s day.
 * @param {import('./clock-settings.js').Alarm} alarm
 * @param {Day} plan
 */
function inScope(alarm, plan) {
  return alarm.bellSchedules === null || (plan.kind === 'school' && alarm.bellSchedules.includes(plan.bellSchedule));
}

/**
 * When a Clock Alarm rings on `day`, if it does.
 * @param {ClockAlarm} alarm
 * @param {Date} day
 * @param {Day} plan
 * @returns {Date | null}
 */
function clockAlarmTime(alarm, day, plan) {
  const onItsDay = alarm.repeat === 'once' ? alarm.date === isoDate(day) : plan.kind === 'school';
  return onItsDay && inScope(alarm, plan) ? atWallClock(day, alarm.time) : null;
}

/**
 * The Bells of one School Day: start and end of every Period and Break, one
 * per moment.
 * @param {TimedSegment[]} segments
 * @param {SoundName} sound
 * @returns {BellRing[]}
 */
function bellsOf(segments, sound) {
  /** @type {Map<number, BellRing>} */
  const byTime = new Map();
  const at = (/** @type {Date} */ date) => {
    const t = date.getTime();
    if (!byTime.has(t)) byTime.set(t, { at: date, source: 'bell', sound, starts: null, ends: null });
    return /** @type {BellRing} */ (byTime.get(t));
  };
  for (const s of segments) {
    if (s.kind === 'assembly') continue;
    at(s.start).starts = s;
    at(s.end).ends = s;
  }
  return [...byTime.values()];
}

/**
 * The Alarms after `rings` have rung: a "once" Clock Alarm that rang is
 * turned off, except in simulated time, so trying out a moment never changes
 * a teacher's real Alarms. Returns `alarms` itself when nothing changes.
 * @param {import('./clock-settings.js').Alarm[]} alarms
 * @param {Ring[]} rings
 * @param {{ simulated: boolean }} options
 * @returns {import('./clock-settings.js').Alarm[]}
 */
export function alarmsAfterRinging(alarms, rings, { simulated }) {
  if (simulated) return alarms;
  const rang = new Set(rings.flatMap((r) => (r.source === 'clockAlarm' && r.alarm.repeat === 'once' ? [r.alarm.id] : [])));
  if (rang.size === 0) return alarms;
  return alarms.map((a) => (rang.has(a.id) ? { ...a, enabled: false } : a));
}

/**
 * Every ring in the half-open window [start, end): Bells, Clock Alarms,
 * Period Alarms and the timer's end, in time order.
 * @param {Date} start
 * @param {Date} end
 * @param {SchoolYear[]} schoolYears the registry (school-years.js)
 * @param {RingSettings} settings
 * @returns {Ring[]}
 */
export function ringsInWindow(start, end, schoolYears, settings) {
  const division = settings.division ?? 'HS';
  const from = start.getTime();
  const to = end.getTime();
  /** @type {Ring[]} */
  const rings = [];
  for (let day = localMidnight(isoDate(start)); day.getTime() < to; day = addDays(day, 1)) {
    const plan = planDay(day, schoolYears, division);
    if (plan.kind === 'school' && settings.bells.on) rings.push(...bellsOf(plan.segments, settings.bells.sound));
    for (const alarm of settings.alarms) {
      if (!alarm.enabled) continue;
      if (alarm.kind === 'clock') {
        const at = clockAlarmTime(alarm, day, plan);
        if (at) rings.push({ at, source: 'clockAlarm', sound: alarm.sound, alarm });
      } else if (plan.kind === 'school' && inScope(alarm, plan)) {
        for (const period of plan.segments) {
          if (period.kind !== 'period' || !alarm.periods.includes(period.name)) continue;
          const at = periodAlarmTime(alarm, period);
          if (at) rings.push({ at, source: 'periodAlarm', sound: alarm.sound, alarm, period });
        }
      }
    }
  }
  if (settings.timerEndsAt != null) {
    rings.push({ at: new Date(settings.timerEndsAt), source: 'timer', sound: settings.timerSound ?? 'beep' });
  }
  return rings
    .filter((r) => from <= r.at.getTime() && r.at.getTime() < to)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}
