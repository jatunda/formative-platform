import { describe, it, expect } from 'vitest';
import { describeMoment } from '../../clock/clock-model.js';
import { barSetting, dayStripOf, describeBar } from '../../clock/day-bar.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';

// Tue 2026-10-27 is an All Day: Period 1 8:30–9:20 … Period 7 14:25–15:10.
const tue = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);
const ALL_DAY = [
  'Period 1', 'Period 2', 'Nutrition', 'Period 3', 'Period 4', 'Period 5', 'Lunch', 'Period 6', 'Period 7',
];

/** The bar at `now`, for HS with the given settings. */
function barAt(now, settings = {}) {
  const division = settings.division ?? 'HS';
  const moment = describeMoment(now, SCHOOL_YEARS, { division });
  return describeBar(now, moment, SCHOOL_YEARS, { division, dayStrip: true, periodLabels: {}, showPeriodEnd: false, ...settings });
}
const states = (bar) => Object.fromEntries(bar.blocks.map((b) => [b.name, b.state]));

describe('the bar on whole day', () => {
  it("shows today's Segments, the past ones past and the current one now, with its fill and the Now marker", () => {
    const bar = barAt(tue(10, 39));
    expect(bar.setting).toBe('day');
    expect(bar.day).toBe('today');
    expect(bar.blocks.map((b) => b.name)).toEqual(ALL_DAY);
    expect(states(bar)).toMatchObject({ 'Period 2': 'past', Nutrition: 'past', 'Period 3': 'now', 'Period 4': 'later' });
    // Period 3 runs 10:30–11:15: 9 of its 45 minutes are done.
    expect(bar.done).toBeCloseTo(20);
    // The day runs 8:30–15:10 (400 minutes); 10:39 is 129 minutes in.
    expect(bar.nowAt).toBeCloseTo((129 / 400) * 100);
    expect(bar.end).toEqual(tue(15, 10));
  });

  it('places each block in proportion to its length', () => {
    const [first] = barAt(tue(10, 39)).blocks;
    expect(first.left).toBeCloseTo(0);
    expect(first.width).toBeCloseTo((50 / 400) * 100);
  });

  it('tells Periods, Breaks and Assemblies apart by kind', () => {
    const kinds = Object.fromEntries(barAt(tue(10, 39)).blocks.map((b) => [b.name, b.kind]));
    expect(kinds).toMatchObject({ 'Period 1': 'period', Nutrition: 'break', Lunch: 'break' });
    // Fri 2026-09-11 is a Pep Rally day.
    const rally = barAt(new Date(2026, 8, 11, 10, 0));
    expect(rally.blocks.find((b) => b.name === 'Pep Rally').kind).toBe('assembly');
  });

  it("gives Periods their Period Label, and never a Break's", () => {
    const bar = barAt(tue(10, 39), { periodLabels: { 'Period 3': ' AP CSA ', Nutrition: 'Snack' } });
    const labels = Object.fromEntries(bar.blocks.map((b) => [b.name, b.label]));
    expect(labels).toMatchObject({ 'Period 3': 'AP CSA', 'Period 4': '', Nutrition: '' });
  });

  it('gives each block a short name for tight spaces, never cutting Nutrition to "Nut"', () => {
    const shorts = Object.fromEntries(barAt(tue(10, 39)).blocks.map((b) => [b.name, b.short]));
    expect(shorts).toMatchObject({ 'Period 3': 'P3', Nutrition: 'Nutr.', Lunch: 'Lunch' });
  });

  it('fills a Passing Period as its own gap block and highlights the next block', () => {
    // Period 1 ends 9:20, Period 2 starts 9:25.
    const bar = barAt(tue(9, 22));
    expect(bar.blocks.map((b) => b.name)).toEqual([...ALL_DAY, 'Passing Period']);
    const gap = bar.blocks.find((b) => b.kind === 'passing');
    expect(gap).toMatchObject({ state: 'now', start: tue(9, 20), end: tue(9, 25) });
    expect(gap.left).toBeCloseTo((50 / 400) * 100);
    expect(gap.width).toBeCloseTo((5 / 400) * 100);
    expect(states(bar)).toMatchObject({ 'Period 1': 'past', 'Period 2': 'next', 'Period 3': 'later' });
    expect(bar.done).toBeCloseTo(40);
  });

  it("follows the teacher's Division", () => {
    // Even Days order the Periods differently for MS and HS (Wed 2026-10-28).
    const wed = new Date(2026, 9, 28, 9, 0);
    const hs = barAt(wed).blocks.map((b) => b.name);
    const ms = barAt(wed, { division: 'MS' }).blocks.map((b) => b.name);
    expect(hs).not.toEqual(ms);
  });
});

describe('the bar on just this Segment', () => {
  it('is the current Segment alone, full width, ending when it ends', () => {
    const bar = barAt(tue(10, 39), { dayStrip: false, periodLabels: { 'Period 3': 'AP CSA' } });
    expect(bar.setting).toBe('segment');
    expect(bar.blocks).toEqual([expect.objectContaining({
      name: 'Period 3', label: 'AP CSA', state: 'now', left: 0, width: 100, start: tue(10, 30), end: tue(11, 15),
    })]);
    expect(bar.done).toBeCloseTo(20);
    expect(bar.nowAt).toBeCloseTo(20);
    expect(bar.end).toEqual(tue(11, 15));
  });

  it('is the Passing Period alone during one', () => {
    const bar = barAt(tue(9, 22), { dayStrip: false });
    expect(bar.blocks).toEqual([expect.objectContaining({ name: 'Passing Period', kind: 'passing', state: 'now' })]);
    expect(bar.end).toEqual(tue(9, 25));
  });
});

describe('the bar during Off-Hours', () => {
  it("shows today's Segments before school, none of them current and no Now marker", () => {
    const bar = barAt(tue(7, 50));
    expect(bar).toMatchObject({ setting: 'day', day: 'today', dayLabel: 'All Day', nowAt: null, done: null });
    expect(bar.blocks.map((b) => b.name)).toEqual(ALL_DAY);
    expect(new Set(bar.blocks.map((b) => b.state))).toEqual(new Set(['later']));
  });

  it('shows the Next School Day after school, with its date and Day Label', () => {
    // Tue 10/27 after school: Wed 10/28 is an Even Day.
    const bar = barAt(tue(16, 0));
    expect(bar).toMatchObject({ day: 'next', dayLabel: 'Even Day', date: new Date(2026, 9, 28), nowAt: null });
    expect(bar.blocks[0].start.getDate()).toBe(28);
  });

  it('shows the Next School Day on a weekend', () => {
    // Sat 10/31 → Mon 11/2.
    const bar = barAt(new Date(2026, 9, 31, 12, 0));
    expect(bar).toMatchObject({ day: 'next', date: new Date(2026, 10, 2) });
  });

});

describe('the bar during Off-Hours on just this Segment: a countdown to the Next School Day', () => {
  const countdownAt = (now, settings = {}) => barAt(now, { dayStrip: false, ...settings });

  it('after school is one block from the end of school to the next first Segment, filling as time passes', () => {
    // Tue 10/27 ends 15:10; Wed 10/28 (Even Day) starts with Period 2 at 8:30.
    const bar = countdownAt(tue(16, 0));
    expect(bar).toMatchObject({ setting: 'segment', day: 'next', dayLabel: 'Even Day', date: new Date(2026, 9, 28) });
    expect(bar.blocks).toHaveLength(1);
    expect(bar.blocks[0]).toMatchObject({
      name: 'Until Period 2', short: 'Until P2', kind: 'countdown', state: 'now', left: 0, width: 100,
      start: tue(15, 10), end: new Date(2026, 9, 28, 8, 30), showEnd: false,
    });
    expect(bar.end).toEqual(new Date(2026, 9, 28, 8, 30));
    // 50 of the 1040 minutes from 15:10 to 8:30 are done.
    expect(bar.done).toBeCloseTo((50 / 1040) * 100);
    expect(bar.nowAt).toBeCloseTo((50 / 1040) * 100);
    expect(bar.offHours).toBe(true);
  });

  it("before school counts from the previous School Day's end, under today's heading", () => {
    // Mon 10/26 (All Day) ended 15:10; Tue 10/27 starts 8:30: 17h20m. At 7:50, 40 minutes are left.
    const bar = countdownAt(tue(7, 50));
    expect(bar).toMatchObject({ setting: 'segment', day: 'today', dayLabel: 'All Day' });
    expect(bar.blocks[0]).toMatchObject({ name: 'Until Period 1', start: new Date(2026, 9, 26, 15, 10), end: tue(8, 30) });
    expect(bar.done).toBeCloseTo((1000 / 1040) * 100);
  });

  it('on a day off counts from the last School Day, across the weekend', () => {
    // Fri 10/30 ends 15:10 → Mon 11/2 starts 8:30: 66h20m, as clocks fall back on Sun 11/1. Sat noon is 20h50m in.
    const bar = countdownAt(new Date(2026, 9, 31, 12, 0));
    expect(bar).toMatchObject({ setting: 'segment', day: 'next', date: new Date(2026, 10, 2) });
    expect(bar.blocks[0].start).toEqual(new Date(2026, 9, 30, 15, 10));
    expect(bar.done).toBeCloseTo((1250 / 3980) * 100);
  });

  it("gives the countdown the first Segment's Period Label", () => {
    expect(countdownAt(tue(16, 0), { periodLabels: { 'Period 2': 'AP CSA' } }).blocks[0].label).toBe('AP CSA');
  });

  it('starts from midnight on the first day of the School Year, when no earlier School Day is known', () => {
    // The year starts Mon 8/17 (No School); Tue 8/18 is the first School Day.
    const bar = countdownAt(new Date(2026, 7, 17, 12, 0));
    expect(bar.blocks[0].start).toEqual(new Date(2026, 7, 17));
    expect(bar.done).toBeCloseTo((12 / 32.5) * 100);
    expect(countdownAt(new Date(2026, 7, 18, 8, 0)).blocks[0].start).toEqual(new Date(2026, 7, 17));
  });

  it("starts from midnight on the year's first day too when an earlier School Year is known", () => {
    const lastYear = { ...SCHOOL_YEARS[0], id: '2025-26', start: '2025-08-18', end: '2026-05-29', calendarExceptions: [] };
    const years = [lastYear, ...SCHOOL_YEARS];
    const now = new Date(2026, 7, 17, 12, 0);
    const moment = describeMoment(now, years, { division: 'HS' });
    expect(moment.schoolEndedAt).not.toBeNull();
    const bar = describeBar(now, moment, years, { division: 'HS', dayStrip: false, periodLabels: {}, showPeriodEnd: false });
    expect(bar.blocks[0].start).toEqual(new Date(2026, 7, 17));
  });

  it('leaves whole day as it was', () => {
    expect(barAt(tue(16, 0))).toMatchObject({ setting: 'day', offHours: true });
    expect(barAt(tue(10, 39)).offHours).toBe(false);
    expect(countdownAt(tue(10, 39)).offHours).toBe(false);
  });
});

describe("the current block's end time (Show period end time)", () => {
  const ending = (bar) => bar.blocks.filter((b) => b.showEnd).map((b) => b.name);

  it('when off, no block shows its end', () => {
    expect(ending(barAt(tue(10, 39)))).toEqual([]);
  });

  it('when on, only the current block shows its end, whatever its kind', () => {
    expect(ending(barAt(tue(10, 39), { showPeriodEnd: true }))).toEqual(['Period 3']);
    expect(ending(barAt(tue(10, 15), { showPeriodEnd: true }))).toEqual(['Nutrition']);
  });

  it("is never the Passing Period's gap, nor the block up next after it", () => {
    expect(ending(barAt(tue(9, 22), { showPeriodEnd: true }))).toEqual([]);
  });

  it('changes nothing on just this Segment, whose end already shows under the bar', () => {
    expect(ending(barAt(tue(10, 39), { showPeriodEnd: true, dayStrip: false }))).toEqual([]);
  });

  it('changes nothing in Off-Hours, when nothing is current', () => {
    expect(ending(barAt(tue(7, 50), { showPeriodEnd: true }))).toEqual([]);
    expect(ending(barAt(tue(16, 0), { showPeriodEnd: true }))).toEqual([]);
  });
});

describe('the bar is hidden', () => {
  it('in Experience Week', () => {
    // HS Experience Week is Tue 1/19 – Fri 1/22 2027.
    expect(barAt(new Date(2027, 0, 20, 10, 0))).toBeNull();
    // MS is on an All Day then.
    expect(barAt(new Date(2027, 0, 20, 10, 0), { division: 'MS' })).not.toBeNull();
  });

  it('in Summer, even once the next School Year is known', () => {
    const july = new Date(2027, 6, 1, 10, 0);
    expect(barAt(july)).toBeNull();
    const nextYear = { ...SCHOOL_YEARS[0], id: '2027-28', start: '2027-08-01', end: '2028-06-30', calendarExceptions: [] };
    const years = [...SCHOOL_YEARS, nextYear];
    const moment = describeMoment(july, years, { division: 'HS' });
    expect(moment.nextSchoolDay).not.toBeNull();
    expect(describeBar(july, moment, years, { division: 'HS', dayStrip: true, periodLabels: {}, showPeriodEnd: false })).toBeNull();
  });

  it('on a date the clock knows nothing about', () => {
    expect(barAt(new Date(2040, 0, 1, 10, 0))).toBeNull();
  });
});

describe('the bar setting and the saved dayStrip', () => {
  it('names whole day for dayStrip on and just this Segment for off, and back', () => {
    expect(barSetting(true)).toBe('day');
    expect(barSetting(false)).toBe('segment');
    expect(dayStripOf('day')).toBe(true);
    expect(dayStripOf('segment')).toBe(false);
  });
});
