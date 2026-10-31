// @ts-check
// The bar along the bottom of the School Clock: one element that is both the
// Day Strip and the progress bar. "Whole day" shows the day's Segments in
// proportion, the current one filling left to right with a Now marker above
// it; "just this Segment" is the current Segment (or Passing Period) alone,
// full width. During Off-Hours both show the Next School Day's Segments
// (today's, before school); in Summer, Experience Week and on an unknown date
// there is no bar. Pure: a moment from the clock model and the settings give
// what to draw (positions in percent of the bar's width).
import { segmentsOn } from './clock-model.js';

/** @typedef {import('./clock-model.js').Moment} Moment */
/** @typedef {import('./clock-model.js').TimedSegment} TimedSegment */

/**
 * One block of the bar.
 * @typedef {{
 *   name: string, short: string, label: string,
 *   kind: import('./school-years.js').SegmentKind | 'passing',
 *   start: Date, end: Date,
 *   state: 'past' | 'now' | 'next' | 'later',
 *   left: number, width: number,
 * }} BarBlock
 * - `short`: the name for a tight block ("P3", "Nutr."); never shorter.
 * - `label`: the Period's Period Label ('' for none, and for every Break and Assembly).
 * - `state`: `next` is the Segment after a Passing Period.
 * - `left` / `width`: percent of the bar.
 */

/**
 * @typedef {{
 *   setting: 'day' | 'segment',
 *   day: 'today' | 'next',
 *   date: Date,
 *   dayLabel: string,
 *   blocks: BarBlock[],
 *   done: number | null,
 *   nowAt: number | null,
 *   end: Date,
 * }} Bar
 * - `setting`: whole day or just this Segment (Off-Hours are always whole day).
 * - `day`: today's Segments, or the Next School Day's (`date`, `dayLabel`).
 * - `done`: percent of the current block elapsed (null with nothing current).
 * - `nowAt`: where the Now marker sits, in percent (null with nothing current).
 * - `end`: the time under the bar's right end.
 */

/**
 * A Segment's name for a tight block: "Period 3" is "P3", "Nutrition" is
 * "Nutr." (never "Nut"); every other name stays whole.
 * @param {string} name
 */
function shortName(name) {
  if (name.startsWith('Period ')) return `P${name.slice('Period '.length)}`;
  return name === 'Nutrition' ? 'Nutr.' : name;
}

/**
 * The bar at `now`, or null when it's hidden.
 * @param {Date} now
 * @param {Moment} moment `describeMoment(now, ...)`
 * @param {import('./school-years.js').SchoolYear[]} schoolYears
 * @param {{ division: import('./school-years.js').Division, dayStrip: boolean, periodLabels: Record<string, string> }} settings
 *   `dayStrip`: whole day (true) or just this Segment (false).
 * @returns {Bar | null}
 */
export function describeBar(now, moment, schoolYears, { division, dayStrip, periodLabels }) {
  if (moment.state === 'summer' || moment.state === 'experienceWeek') return null;
  const t = now.getTime();
  const live = moment.state === 'segment' || moment.state === 'passing';
  const first = live ? null : moment.nextSchoolDay?.firstSegment;
  if (!live && !first) return null;
  const day = first?.start ?? now;
  const segments = segmentsOn(day, schoolYears, division);
  const dayLabel = first ? /** @type {import('./clock-model.js').NextSchoolDay} */ (moment.nextSchoolDay).dayLabel
    : /** @type {string} */ (moment.dayLabel);

  /** @param {{ name: string, kind: BarBlock['kind'], start: Date, end: Date }} s @param {BarBlock['state']} state */
  const block = (s, state, left = 0, width = 100) => ({
    name: s.name,
    short: shortName(s.name),
    label: s.kind === 'period' ? (periodLabels[s.name]?.trim() ?? '') : '',
    kind: s.kind,
    start: s.start,
    end: s.end,
    state,
    left,
    width,
  });
  const passing = moment.passing && { name: 'Passing Period', kind: /** @type {const} */ ('passing'), ...moment.passing };
  const active = moment.current ?? passing;
  const done = active ? ((t - active.start.getTime()) / (active.end.getTime() - active.start.getTime())) * 100 : null;
  /** @type {Omit<Bar, 'setting' | 'blocks' | 'nowAt' | 'end'>} */
  const base = {
    day: sameDate(day, now) ? 'today' : 'next',
    date: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
    dayLabel,
    done,
  };

  if (!dayStrip && active) {
    return { ...base, setting: 'segment', blocks: [block(active, 'now')], nowAt: done, end: active.end };
  }

  const t0 = segments[0].start.getTime();
  const t1 = segments[segments.length - 1].end.getTime();
  /** @param {Date} d */
  const pct = (d) => ((d.getTime() - t0) / (t1 - t0)) * 100;
  /** @param {TimedSegment} s @returns {BarBlock['state']} */
  const stateOf = (s) => {
    if (!live) return 'later';
    if (t >= s.end.getTime()) return 'past';
    if (t >= s.start.getTime()) return 'now';
    // During a Passing Period, the Segment it leads to is up next.
    return passing && s.start.getTime() === passing.end.getTime() ? 'next' : 'later';
  };
  const blocks = segments.map((s) => block(s, stateOf(s), pct(s.start), pct(s.end) - pct(s.start)));
  if (passing) blocks.push(block(passing, 'now', pct(passing.start), pct(passing.end) - pct(passing.start)));
  return {
    ...base,
    setting: 'day',
    blocks,
    nowAt: live ? pct(now) : null,
    end: segments[segments.length - 1].end,
  };
}

/** @param {Date} a @param {Date} b */
function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
