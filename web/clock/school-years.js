// @ts-check
// Registry of every known School Year, and the shape of one School Year's
// static data (ADR 0014). Each School Year is one hand-edited module (e.g.
// school-year-2026-27.js) that exports a SchoolYear; add it to SCHOOL_YEARS
// below and the clock model needs no change.
//
// Times are local wall-clock strings, so daylight-saving changes need no
// special handling: the clock model builds Dates in local time from them.

import { SCHOOL_YEAR_2026_27 } from './school-year-2026-27.js';

/** @typedef {'period' | 'break' | 'assembly'} SegmentKind */

/** @typedef {'MS' | 'HS'} Division */

/**
 * One named span of a Bell Schedule.
 * @typedef {{
 *   name: string,
 *   kind: SegmentKind,
 *   start: string,
 *   end: string,
 * }} Segment
 * `start` and `end` are 24-hour "HH:MM" local wall-clock times.
 */

/**
 * A named, ordered set of Segments. `segments` is the list both Divisions
 * follow; `byDivision` gives a Division its own list where they differ (a
 * Division missing from `byDivision` follows `segments`).
 * @typedef {{
 *   name: string,
 *   segments: Segment[],
 *   byDivision?: Partial<Record<Division, Segment[]>>,
 * }} BellSchedule
 */

/**
 * A date whose day differs from its Weekday Default. `division` limits it to
 * one Division (e.g. HS Experience Week); omit it to apply to both.
 * @typedef {{ date: string, division?: Division } & (
 *   | { kind: 'bellSchedule', bellSchedule: string }
 *   | { kind: 'dayOff', dayLabel: string }
 *   | { kind: 'experienceWeek' }
 * )} CalendarException
 * `date` is "YYYY-MM-DD"; `bellSchedule` is a key of SchoolYear.bellSchedules.
 */

/**
 * @typedef {{
 *   id: string,
 *   start: string,
 *   end: string,
 *   bellSchedules: Record<string, BellSchedule>,
 *   weekdayDefaults: Record<1 | 2 | 3 | 4 | 5, string>,
 *   calendarExceptions: CalendarException[],
 * }} SchoolYear
 * `start`/`end` are inclusive "YYYY-MM-DD" dates. `weekdayDefaults` maps
 * Monday (1) through Friday (5) to a key of `bellSchedules`.
 */

/** @type {SchoolYear[]} */
export const SCHOOL_YEARS = [SCHOOL_YEAR_2026_27];
