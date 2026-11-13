import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  PAGES, SIZES, TAP_EXCEPTIONS, KNOWN_FAILURES, tapTargetProblem, describeFailure, classify, parseArgs,
} from '../../scripts/schedule-check-matrix.js';
import { buildFixtureDb, todayIndex, TODAY, DATE_OFFSET, SCHEDULES, LONG_TITLE } from '../../scripts/schedule-check-fixtures.js';
import { getBusinessDaysBetween, createLocalDate, DEFAULT_CLASS_START_DATE } from '../../business-days.js';

/** A tap target with no exceptions unless given. */
const target = (width, height, exceptions = []) => ({ label: 'x', width, height, exceptions });
const menu = TAP_EXCEPTIONS.findIndex((e) => e.selector.includes('action-menu-btn'));
const icon = TAP_EXCEPTIONS.findIndex((e) => e.selector.includes('schedule-icon-btn'));

describe('tapTargetProblem', () => {
  it('passes a 44 x 44 target and fails one short in either direction', () => {
    expect(tapTargetProblem(target(44, 44), 800)).toBeNull();
    expect(tapTargetProblem(target(43, 44), 800)).toMatch(/43x44px \(needs 44x44\)/);
    expect(tapTargetProblem(target(100, 22), 800)).toMatch(/100x22px/);
  });

  it('rounds to the half pixel, so 43.8px counts as 44', () => {
    expect(tapTargetProblem(target(43.8, 44), 800)).toBeNull();
  });

  it('lets the ⋮ button be 32px wide and the icons 40px on a phone, but not narrower', () => {
    expect(tapTargetProblem(target(32, 44, [menu]), 375)).toBeNull();
    expect(tapTargetProblem(target(40, 44, [icon]), 375)).toBeNull();
    expect(tapTargetProblem(target(31, 44, [menu]), 375)).toMatch(/needs 32x44/);
    expect(tapTargetProblem(target(39, 44, [icon]), 375)).toMatch(/needs 40x44/);
  });

  it('keeps an exception to phones: on a tablet those controls need the full 44px', () => {
    expect(tapTargetProblem(target(40, 44, [icon]), 800)).toMatch(/needs 44x44/);
  });

  it('never excuses a short target', () => {
    expect(tapTargetProblem(target(40, 30, [icon]), 375)).toMatch(/needs 40x44/);
  });

  it('gives every exception a reason', () => {
    for (const e of TAP_EXCEPTIONS) expect(e.reason.length).toBeGreaterThan(20);
  });
});

/** A clean render, with `change` applied. */
const checked = (change = {}) => ({
  scrollWidth: 375, viewportWidth: 375, touch: true, coarse: true,
  shortTables: [{ name: 'P1', lessonsPerDay: 1, contentWidth: 359, paneWidth: 359 }],
  targets: [target(44, 44)], errors: [], violations: [], ...change,
});

describe('describeFailure', () => {
  it('finds nothing wrong with a clean render', () => {
    expect(describeFailure(checked())).toEqual([]);
  });

  it('reports a page wider than the viewport', () => {
    expect(describeFailure(checked({ scrollWidth: 400 }))).toEqual(['page scrolls sideways (400px wide in 375px)']);
  });

  it('reports a short day wider than its pane (ticket 02)', () => {
    const shortTables = [{ name: 'P1', lessonsPerDay: 1, contentWidth: 600, paneWidth: 359 }];
    expect(describeFailure(checked({ shortTables }))).toEqual(['P1: days of at most 1 Lesson(s) are 600px wide in a 359px pane']);
  });

  it('reports a browser whose pointer does not match the size', () => {
    expect(describeFailure(checked({ coarse: false }))).toEqual(['expected a coarse pointer (the browser setup is wrong)']);
    expect(describeFailure(checked({ touch: false, coarse: true, targets: null }))).toEqual(['expected a fine pointer (the browser setup is wrong)']);
  });

  it('reports small tap targets, page errors and axe violations', () => {
    const r = checked({ targets: [target(20, 20)], errors: ['boom'], violations: ['region: 2 node(s)'] });
    expect(describeFailure(r)).toEqual([expect.stringMatching(/20x20px/), 'boom', 'region: 2 node(s)']);
  });
});

describe('classify', () => {
  const known = [
    { failure: 'tap target "Delete', touch: true, maxWidth: 600, note: '' },
    { failure: 'color-contrast:', pages: ['planning'], note: '' },
  ];
  const render = (page, width, touch, failures) => ({ page, width, touch, failures });

  it('sorts each failure into known or unexpected by page, pointer and width', () => {
    const { renders, stale } = classify([
      render('planning', 375, true, ['tap target "Delete day 2"', 'color-contrast: 1 node(s)', 'boom']),
      render('full-busy', 800, true, ['tap target "Delete day 2"', 'color-contrast: 1 node(s)']),
    ], known);
    expect(renders[0].known).toEqual(['tap target "Delete day 2"', 'color-contrast: 1 node(s)']);
    expect(renders[0].unexpected).toEqual(['boom']);
    expect(renders[1].unexpected).toEqual(['tap target "Delete day 2"', 'color-contrast: 1 node(s)']);
    expect(stale).toEqual([]);
  });

  it('calls a known failure stale when no render it covers shows it', () => {
    const { stale } = classify([render('planning', 375, true, [])], known);
    expect(stale).toEqual(known);
  });

  it("doesn't call a known failure stale when the run covers none of its renders", () => {
    const { stale } = classify([render('full-busy', 1280, false, [])], known);
    expect(stale).toEqual([]);
  });

  it('gives every known failure a note', () => {
    for (const k of KNOWN_FAILURES) expect(k.note.length).toBeGreaterThan(10);
  });
});

describe('parseArgs', () => {
  it('defaults to every page at every size, with screenshots', () => {
    const opts = parseArgs([]);
    expect(opts.pages.map((p) => p.name)).toEqual(Object.keys(PAGES));
    expect(opts.sizes).toEqual(SIZES);
    expect(opts.shots).toBe(true);
  });

  it('checks the three sizes the check promises: two touch, one mouse', () => {
    expect(SIZES.map((s) => `${s.label}:${s.touch}`)).toEqual(['375x667:true', '800x1280:true', '1280x800:false']);
  });

  it('takes repeated --page and --size, and --no-shots', () => {
    const opts = parseArgs(['--page', 'planning', '--page', 'full-busy', '--size', '1280x800', '--size', '390x844', '--no-shots']);
    expect(opts.pages).toEqual([{ name: 'planning', url: PAGES.planning }, { name: 'full-busy', url: PAGES['full-busy'] }]);
    expect(opts.sizes).toEqual([SIZES[2], { label: '390x844', width: 390, height: 844, touch: true }]);
    expect(opts.shots).toBe(false);
  });

  it('treats a size 1024px or wider as a mouse screen', () => {
    expect(parseArgs(['--size', '1440x900']).sizes[0].touch).toBe(false);
  });

  it('rejects unknown options, pages and malformed sizes', () => {
    expect(() => parseArgs(['--zoom'])).toThrow(/Unknown option --zoom/);
    expect(() => parseArgs(['--page', 'nope'])).toThrow(/Unknown page nope/);
    expect(() => parseArgs(['--size', 'big'])).toThrow(/WIDTHxHEIGHT, not big/);
    expect(() => parseArgs(['--size'])).toThrow(/not nothing/);
  });
});

describe('buildFixtureDb', () => {
  const db = buildFixtureDb();
  const today = todayIndex();

  it("puts today at a real-sized Day Index: business days since the start, less the Date Offset", () => {
    expect(today).toBe(getBusinessDaysBetween(DEFAULT_CLASS_START_DATE, createLocalDate(TODAY)) - DATE_OFFSET);
    expect(String(today)).toHaveLength(3);
    for (const c of Object.values(db.classes)) expect(c.dateOffset).toBe(DATE_OFFSET);
  });

  it("stores each Class's days by Day Index around today, leaving empty days out", () => {
    expect(db.schedule.short).toEqual({ [today - 2]: ['intro'], [today]: ['long'], [today + 2]: ['vars'] });
    expect(db.schedule.empty).toBeUndefined();
  });

  it('gives Lesson Planning days with 0, 1 and several Lessons, and a long title', () => {
    const window = [0, 1, 2];
    const counts = Object.values(SCHEDULES).flatMap((days) => window.map((d) => days[d]?.length ?? 0));
    expect(counts).toContain(0);
    expect(counts).toContain(1);
    expect(Math.max(...counts)).toBeGreaterThan(3);
    expect(db.content.long.title).toBe(LONG_TITLE);
  });

  it('keeps the short Class to days of at most one Lesson', () => {
    for (const lessons of Object.values(SCHEDULES.short)) expect(lessons.length).toBeLessThanOrEqual(1);
  });

  it('only schedules Lessons it has', () => {
    for (const days of Object.values(db.schedule)) {
      for (const id of Object.values(days).flat()) expect(db.content[id]).toBeDefined();
    }
  });

  it('orders the Classes for display', () => {
    expect(Object.values(db.classes).map((c) => c.displayOrder)).toEqual([1, 2, 3]);
  });
});

describe('the fake Firebase module', () => {
  afterEach(() => {
    delete globalThis.__scheduleCheckDb;
    vi.resetModules();
  });

  /** A fresh copy of the module over `db`. */
  async function fake(db) {
    globalThis.__scheduleCheckDb = db;
    vi.resetModules();
    return import('../../scripts/schedule-check-firebase.js');
  }

  it('reads paths from the fixture, null where nothing is stored', async () => {
    const fb = await fake({ classes: { a: { name: 'A' } } });
    const db = fb.getDatabase(fb.initializeApp({}));
    fb.connectDatabaseEmulator(db, 'localhost', 9000);
    const snap = await fb.get(fb.ref(db, 'classes/a'));
    expect(snap.key).toBe('a');
    expect(snap.exists()).toBe(true);
    expect(snap.val()).toEqual({ name: 'A' });
    const missing = await fb.get(fb.ref(db, 'classes/b/name'));
    expect(missing.exists()).toBe(false);
    expect(missing.val()).toBeNull();
  });

  it('starts empty without a fixture', async () => {
    globalThis.__scheduleCheckDb = undefined;
    vi.resetModules();
    const fb = await import('../../scripts/schedule-check-firebase.js');
    expect((await fb.get(fb.ref({}, 'classes'))).val()).toBeNull();
  });

  it('writes with set and update, null deleting', async () => {
    const fb = await fake({ classes: { a: { dateOffset: 1 } } });
    await fb.set(fb.ref({}, 'classes/a/dateOffset'), 4);
    await fb.update(fb.ref({}), { 'schedule/a/3': ['x'], 'classes/a/name': 'A' });
    await fb.set(fb.ref({}, 'classes/a/name'), null);
    expect((await fb.get(fb.ref({}, 'classes/a'))).val()).toEqual({ dateOffset: 4 });
    expect((await fb.get(fb.ref({}, 'schedule/a'))).val()).toEqual({ 3: ['x'] });
  });

  it("returns copies, so a page changing a value doesn't change the store", async () => {
    const fb = await fake({ a: { b: 1 } });
    (await fb.get(fb.ref({}, 'a'))).val().b = 2;
    expect((await fb.get(fb.ref({}, 'a/b'))).val()).toBe(1);
  });
});
