// @ts-check
// The database the schedule layout check (schedule-check.mjs) renders the
// schedule pages from: the page reads it through a fake Firebase module
// (schedule-check-firebase.js), so no emulator or network is needed. Pure, so
// it's unit-tested.
import { getBusinessDaysBetween, createLocalDate, DEFAULT_CLASS_START_DATE } from '../business-days.js';

/** The day every render happens on (a Tuesday); the browser's clock is fixed to it. */
export const TODAY = '2026-11-03';
/** Every Class's Date Offset: small, as after a few snow days. */
export const DATE_OFFSET = 3;

/** Long enough to need truncating in a phone's Lesson cluster. */
export const LONG_TITLE = 'Debugging nested loops with trace tables and print statements, part two';

const LESSON_TITLES = {
  intro: 'Intro to loops',
  vars: 'Variables',
  quiz: 'Quiz review',
  lab: 'Robot lab',
  long: LONG_TITLE,
};

/**
 * Each Class's Lessons by day, counted from today (0 is today, -2 two days
 * before). Days with no Lessons aren't stored, as in the real database.
 * Lesson Planning shows today and the two days after:
 * - `short`: only days with 0 or 1 Lessons, one of them the long title, so its
 *   whole table must fit a portrait phone (ticket 02's promise);
 * - `busy`: a day with several Lessons, whose row may scroll sideways inside
 *   its pane but never the page;
 * - `empty`: no Lessons at all.
 * @type {Record<string, Record<number, (keyof typeof LESSON_TITLES)[]>>}
 */
export const SCHEDULES = {
  short: { [-2]: ['intro'], 0: ['long'], 2: ['vars'] },
  busy: { [-2]: ['intro'], 0: ['intro', 'vars', 'quiz', 'lab', 'long'], 1: ['quiz'] },
  empty: {},
};

const CLASS_NAMES = { short: 'Period 1 CS Principles', busy: 'Period 2 Robotics', empty: 'Period 3 Advisory' };

/**
 * Today's Day Index with DATE_OFFSET (date-utils.js's getTodayDayIndex:
 * business days since the start date, minus the offset): a real-sized,
 * three-digit index, as the pages show in a school year.
 * @param {string} [today] YYYY-MM-DD
 */
export function todayIndex(today = TODAY) {
  return getBusinessDaysBetween(DEFAULT_CLASS_START_DATE, createLocalDate(today)) - DATE_OFFSET;
}

/**
 * The whole database: `classes`, `schedule` (by Day Index) and the Lessons under `content`.
 * @param {string} [today] YYYY-MM-DD
 */
export function buildFixtureDb(today = TODAY) {
  const base = todayIndex(today);
  const ids = /** @type {(keyof typeof SCHEDULES)[]} */ (Object.keys(SCHEDULES));
  /** @param {Record<number, string[]>} days */
  const byDayIndex = (days) => Object.fromEntries(Object.entries(days).map(([day, lessons]) => [base + Number(day), lessons]));
  return {
    classes: Object.fromEntries(ids.map((id, i) => [id, { name: CLASS_NAMES[id], displayOrder: i + 1, dateOffset: DATE_OFFSET }])),
    schedule: Object.fromEntries(ids.filter((id) => Object.keys(SCHEDULES[id]).length).map((id) => [id, byDayIndex(SCHEDULES[id])])),
    content: Object.fromEntries(Object.entries(LESSON_TITLES).map(([id, title]) => [id, { title, content: `# ${title}` }])),
  };
}
