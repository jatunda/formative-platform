import { describe, it, expect } from 'vitest';
import { describeMoment } from '../../clock/clock-model.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';

const MIN = 60 * 1000;

// Tue 2026-10-27 is an ordinary All Day (Weekday Default for Tuesday).
const tue = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);

describe('describeMoment on an ordinary All Day', () => {
  it('names the Day Label and the current Period with its start, end, time left and elapsed', () => {
    const moment = describeMoment(tue(10, 12, 0), SCHOOL_YEARS);

    expect(moment.dayLabel).toBe('All Day');
    expect(moment.state).toBe('segment');
    expect(moment.current).toEqual({
      name: 'Period 3',
      kind: 'period',
      start: tue(10, 5),
      end: tue(10, 55),
    });
    expect(moment.timeLeftMs).toBe(43 * MIN);
    expect(moment.timeElapsedMs).toBe(7 * MIN);
  });

  it('goes straight from Period 2 into Nutrition with no Passing Period where they touch', () => {
    const lastSecondOfPeriod2 = describeMoment(tue(9, 44, 59), SCHOOL_YEARS);
    expect(lastSecondOfPeriod2.state).toBe('segment');
    expect(lastSecondOfPeriod2.current.name).toBe('Period 2');
    expect(lastSecondOfPeriod2.timeLeftMs).toBe(1000);

    const firstMomentOfNutrition = describeMoment(tue(9, 45), SCHOOL_YEARS);
    expect(firstMomentOfNutrition.state).toBe('segment');
    expect(firstMomentOfNutrition.current).toEqual({
      name: 'Nutrition',
      kind: 'break',
      start: tue(9, 45),
      end: tue(10, 0),
    });
    expect(firstMomentOfNutrition.timeElapsedMs).toBe(0);
  });

  it('counts down the 5-minute Passing Period from Nutrition to Period 3 and says what is up next', () => {
    const moment = describeMoment(tue(10, 2, 20), SCHOOL_YEARS);

    expect(moment.state).toBe('passing');
    expect(moment.current).toBeNull();
    expect(moment.passing).toEqual({ start: tue(10, 0), end: tue(10, 5) });
    expect(moment.upNext).toEqual({
      name: 'Period 3',
      kind: 'period',
      start: tue(10, 5),
      end: tue(10, 55),
    });
    expect(moment.timeLeftMs).toBe(2 * MIN + 40 * 1000);
    expect(moment.timeElapsedMs).toBe(2 * MIN + 20 * 1000);
  });

  it('is before school until Period 1 starts, counting down to it', () => {
    const moment = describeMoment(tue(7, 30), SCHOOL_YEARS);

    expect(moment.dayLabel).toBe('All Day');
    expect(moment.state).toBe('beforeSchool');
    expect(moment.current).toBeNull();
    expect(moment.passing).toBeNull();
    expect(moment.upNext).toEqual({
      name: 'Period 1',
      kind: 'period',
      start: tue(8, 0),
      end: tue(8, 50),
    });
    expect(moment.timeLeftMs).toBe(30 * MIN);
    expect(moment.timeElapsedMs).toBeNull();
  });

  it('is after school from the moment Period 7 ends, counting time since', () => {
    const atLastBell = describeMoment(tue(15, 10), SCHOOL_YEARS);
    expect(atLastBell.state).toBe('afterSchool');

    const moment = describeMoment(tue(16, 0), SCHOOL_YEARS);
    expect(moment.dayLabel).toBe('All Day');
    expect(moment.state).toBe('afterSchool');
    expect(moment.current).toBeNull();
    expect(moment.upNext).toBeNull();
    expect(moment.timeLeftMs).toBeNull();
    expect(moment.timeElapsedMs).toBe(50 * MIN);
  });
});

describe('describeMoment across School Years and Divisions', () => {
  const seg = (name, kind, start, end) => ({ name, kind, start, end });
  /** Two tiny made-up School Years, to show the registry needs no logic change. */
  const yearA = {
    id: 'A',
    start: '2030-08-19',
    end: '2031-05-30',
    bellSchedules: {
      plain: { name: 'Plain Day', segments: [seg('Period 1', 'period', '09:00', '10:00')] },
    },
    weekdayDefaults: { 1: 'plain', 2: 'plain', 3: 'plain', 4: 'plain', 5: 'plain' },
    calendarExceptions: [],
  };
  const yearB = {
    id: 'B',
    start: '2031-08-18',
    end: '2032-05-28',
    bellSchedules: {
      split: {
        name: 'Split Day',
        segments: [seg('Period 1', 'period', '08:00', '09:00')],
        byDivision: { MS: [seg('Chapel', 'assembly', '08:00', '08:40')] },
      },
    },
    weekdayDefaults: { 1: 'split', 2: 'split', 3: 'split', 4: 'split', 5: 'missing' },
    calendarExceptions: [],
  };
  const years = [yearA, yearB];

  it('uses the School Year whose dates contain the moment', () => {
    // Mon 2030-09-09 is in year A; Mon 2031-09-08 is in year B.
    expect(describeMoment(new Date(2030, 8, 9, 9, 30), years).dayLabel).toBe('Plain Day');
    expect(describeMoment(new Date(2031, 8, 8, 8, 30), years).dayLabel).toBe('Split Day');
  });

  it("follows a Division's own Segment list, falling back to the shared one", () => {
    const monday = new Date(2031, 8, 8, 8, 30);
    expect(describeMoment(monday, years, { division: 'MS' }).current.name).toBe('Chapel');
    expect(describeMoment(monday, years, { division: 'HS' }).current.name).toBe('Period 1');
    expect(describeMoment(monday, years).current.name).toBe('Period 1');
  });

  it('says nothing about Segments on a date outside every School Year', () => {
    const moment = describeMoment(new Date(2031, 6, 1, 10, 0), years);
    expect(moment).toEqual({
      dayLabel: null,
      state: 'unknown',
      current: null,
      passing: null,
      upNext: null,
      timeLeftMs: null,
      timeElapsedMs: null,
    });
  });

  it('says nothing about Segments when the day names a Bell Schedule the year lacks', () => {
    // Fri 2031-09-12 defaults to 'missing'.
    expect(describeMoment(new Date(2031, 8, 12, 8, 30), years).state).toBe('unknown');
  });

  it('labels a weekend inside a School Year as a day off', () => {
    const saturday = describeMoment(new Date(2030, 8, 14, 10, 0), years);
    expect(saturday.dayLabel).toBe('Weekend');
    expect(saturday.state).toBe('dayOff');
    expect(saturday.current).toBeNull();
    expect(describeMoment(new Date(2030, 8, 15, 10, 0), years).state).toBe('dayOff');
  });

  it('treats the first and last dates of a School Year as inside it', () => {
    // Mon 2030-08-19 and Fri 2031-05-30.
    expect(describeMoment(new Date(2030, 7, 19, 9, 30), years).dayLabel).toBe('Plain Day');
    expect(describeMoment(new Date(2031, 4, 30, 9, 30), years).dayLabel).toBe('Plain Day');
  });
});
