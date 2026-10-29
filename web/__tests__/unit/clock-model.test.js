import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { describeMoment } from '../../clock/clock-model.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';

const MIN = 60 * 1000;

// Tue 2026-10-27 is an ordinary All Day (Weekday Default for Tuesday).
const tue = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);

describe('describeMoment on an ordinary All Day', () => {
  it('names the Day Label and the current Period with its start, end, time left and elapsed', () => {
    const moment = describeMoment(tue(10, 37, 0), SCHOOL_YEARS);

    expect(moment.dayLabel).toBe('All Day');
    expect(moment.state).toBe('segment');
    expect(moment.current).toEqual({
      name: 'Period 3',
      kind: 'period',
      start: tue(10, 30),
      end: tue(11, 15),
    });
    expect(moment.timeLeftMs).toBe(38 * MIN);
    expect(moment.timeElapsedMs).toBe(7 * MIN);
  });

  it('says what is up next during a Segment, and nothing after the last one of the day', () => {
    expect(describeMoment(tue(10, 37), SCHOOL_YEARS).upNext).toEqual({
      name: 'Period 4', kind: 'period', start: tue(11, 20), end: tue(12, 5),
    });
    expect(describeMoment(tue(15, 0), SCHOOL_YEARS).current.name).toBe('Period 7');
    expect(describeMoment(tue(15, 0), SCHOOL_YEARS).upNext).toBeNull();
  });

  it('goes straight from Period 2 into Nutrition with no Passing Period where they touch', () => {
    const lastSecondOfPeriod2 = describeMoment(tue(10, 9, 59), SCHOOL_YEARS);
    expect(lastSecondOfPeriod2.state).toBe('segment');
    expect(lastSecondOfPeriod2.current.name).toBe('Period 2');
    expect(lastSecondOfPeriod2.timeLeftMs).toBe(1000);

    const firstMomentOfNutrition = describeMoment(tue(10, 10), SCHOOL_YEARS);
    expect(firstMomentOfNutrition.state).toBe('segment');
    expect(firstMomentOfNutrition.current).toEqual({
      name: 'Nutrition',
      kind: 'break',
      start: tue(10, 10),
      end: tue(10, 25),
    });
    expect(firstMomentOfNutrition.timeElapsedMs).toBe(0);
  });

  it('counts down the 5-minute Passing Period from Nutrition to Period 3 and says what is up next', () => {
    const moment = describeMoment(tue(10, 27, 20), SCHOOL_YEARS);

    expect(moment.state).toBe('passing');
    expect(moment.current).toBeNull();
    expect(moment.passing).toEqual({ start: tue(10, 25), end: tue(10, 30) });
    expect(moment.upNext).toEqual({
      name: 'Period 3',
      kind: 'period',
      start: tue(10, 30),
      end: tue(11, 15),
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
      start: tue(8, 30),
      end: tue(9, 20),
    });
    expect(moment.timeLeftMs).toBe(60 * MIN);
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
    // Before year A; the gap between A and B is Summer (see below).
    const moment = describeMoment(new Date(2030, 6, 1, 10, 0), years);
    expect(moment).toEqual({
      dayLabel: null,
      state: 'unknown',
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

describe('describeMoment with Calendar Exceptions', () => {
  const seg = (name, kind, start, end) => ({ name, kind, start, end });
  // Mon 2030-09-09 .. Sat 2030-09-14 in a tiny made-up School Year.
  const year = {
    id: 'X',
    start: '2030-08-19',
    end: '2031-05-30',
    bellSchedules: {
      plain: { name: 'Plain Day', segments: [seg('Period 1', 'period', '09:00', '10:00')] },
      rally: { name: 'Rally Day', segments: [seg('Rally', 'assembly', '09:00', '09:30')] },
    },
    weekdayDefaults: { 1: 'plain', 2: 'plain', 3: 'plain', 4: 'plain', 5: 'plain' },
    calendarExceptions: [
      { date: '2030-09-09', kind: 'bellSchedule', bellSchedule: 'rally' },
      { date: '2030-09-10', kind: 'dayOff', dayLabel: 'School Holiday' },
      { date: '2030-09-11', division: 'HS', kind: 'experienceWeek' },
      { date: '2030-09-12', kind: 'bellSchedule', bellSchedule: 'plain' },
      { date: '2030-09-12', division: 'MS', kind: 'bellSchedule', bellSchedule: 'rally' },
    ],
  };
  const years = [year];
  const at = (day, h = 9, m = 10) => new Date(2030, 8, day, h, m);

  it("follows an exception's Bell Schedule instead of the Weekday Default", () => {
    const moment = describeMoment(at(9), years);
    expect(moment.dayLabel).toBe('Rally Day');
    expect(moment.current.name).toBe('Rally');
  });

  it("labels an exception's day off with its Day Label", () => {
    const moment = describeMoment(at(10), years);
    expect(moment.dayLabel).toBe('School Holiday');
    expect(moment.state).toBe('dayOff');
    expect(moment.current).toBeNull();
  });

  it('names Experience Week, with no Segments, for its Division only', () => {
    const hs = describeMoment(at(11), years, { division: 'HS' });
    expect(hs.dayLabel).toBe('HS Experience Week');
    expect(hs.state).toBe('experienceWeek');
    expect(hs.current).toBeNull();
    expect(hs.upNext).toBeNull();

    const ms = describeMoment(at(11), years, { division: 'MS' });
    expect(ms.dayLabel).toBe('Plain Day');
    expect(ms.current.name).toBe('Period 1');
  });

  it("prefers a Division's own exception over one for both Divisions", () => {
    expect(describeMoment(at(12), years, { division: 'MS' }).dayLabel).toBe('Rally Day');
    expect(describeMoment(at(12), years, { division: 'HS' }).dayLabel).toBe('Plain Day');
  });

  it('can make a weekend a School Day', () => {
    const saturdayYear = {
      ...year,
      calendarExceptions: [{ date: '2030-09-14', kind: 'bellSchedule', bellSchedule: 'plain' }],
    };
    expect(describeMoment(at(14), [saturdayYear]).dayLabel).toBe('Plain Day');
  });
});

describe('describeMoment in Off-Hours, days off and Summer', () => {
  const seg = (name, kind, start, end) => ({ name, kind, start, end });
  const HOUR = 60 * MIN;
  // A tiny made-up School Year, Mon 2030-09-02 .. Fri 2030-09-27.
  //   Mon 9/2 Labor Day · Mon 9/9 Late Day · Wed 9/11–Thu 9/12 HS Experience Week
  //   Fri 9/13 School Holiday · Thu 9/26–Fri 9/27 No School, so Wed 9/25 is
  //   the last School Day (ends 11:00).
  const yearS = {
    id: 'S',
    start: '2030-09-02',
    end: '2030-09-27',
    bellSchedules: {
      plain: {
        name: 'Plain Day',
        segments: [seg('Period 1', 'period', '09:00', '10:00'), seg('Period 2', 'period', '10:10', '11:00')],
      },
      late: { name: 'Late Day', segments: [seg('Period 1', 'period', '10:00', '11:00')] },
    },
    weekdayDefaults: { 1: 'plain', 2: 'plain', 3: 'plain', 4: 'plain', 5: 'plain' },
    calendarExceptions: [
      { date: '2030-09-02', kind: 'dayOff', dayLabel: 'Labor Day' },
      { date: '2030-09-09', kind: 'bellSchedule', bellSchedule: 'late' },
      { date: '2030-09-11', division: 'HS', kind: 'experienceWeek' },
      { date: '2030-09-12', division: 'HS', kind: 'experienceWeek' },
      { date: '2030-09-13', kind: 'dayOff', dayLabel: 'School Holiday' },
      { date: '2030-09-26', kind: 'dayOff', dayLabel: 'No School' },
      { date: '2030-09-27', kind: 'dayOff', dayLabel: 'No School' },
    ],
  };
  // The following made-up School Year: Mon 10/14 is No School, Tue 10/15 the first day.
  const yearT = {
    id: 'T',
    start: '2030-10-14',
    end: '2030-10-31',
    bellSchedules: yearS.bellSchedules,
    weekdayDefaults: yearS.weekdayDefaults,
    calendarExceptions: [{ date: '2030-10-14', kind: 'dayOff', dayLabel: 'No School' }],
  };
  const years = [yearS, yearT];
  const sep = (d, h = 0, m = 0) => new Date(2030, 8, d, h, m);
  const oct = (d, h = 0, m = 0) => new Date(2030, 9, d, h, m);

  describe('the Next School Day', () => {
    it("after school, is the next day with classes, giving its Day Label and first Segment's start", () => {
      // Fri 9/6 after school: the weekend is skipped, Mon 9/9 is a Late Day.
      const moment = describeMoment(sep(6, 12), years);
      expect(moment.state).toBe('afterSchool');
      expect(moment.nextSchoolDay).toEqual({
        dayLabel: 'Late Day',
        firstSegment: { name: 'Period 1', kind: 'period', start: sep(9, 10), end: sep(9, 11) },
      });
      expect(moment.untilNextSchoolDayMs).toBe(70 * HOUR);
    });

    it('skips Experience Week and days off for HS, but not the days MS has classes', () => {
      // Tue 9/10 after school. HS: Wed–Thu Experience Week, Fri holiday, weekend → Mon 9/16.
      const hs = describeMoment(sep(10, 12), years, { division: 'HS' });
      expect(hs.nextSchoolDay.firstSegment.start).toEqual(sep(16, 9));
      expect(hs.nextSchoolDay.dayLabel).toBe('Plain Day');

      const ms = describeMoment(sep(10, 12), years, { division: 'MS' });
      expect(ms.nextSchoolDay.firstSegment.start).toEqual(sep(11, 9));
    });

    it('before school, is today', () => {
      const moment = describeMoment(sep(9, 8), years);
      expect(moment.state).toBe('beforeSchool');
      expect(moment.nextSchoolDay.firstSegment.start).toEqual(sep(9, 10));
      expect(moment.untilNextSchoolDayMs).toBe(2 * HOUR);
    });

    it('is not given during school', () => {
      const inPeriod = describeMoment(sep(10, 9, 30), years);
      expect(inPeriod.nextSchoolDay).toBeNull();
      expect(inPeriod.untilNextSchoolDayMs).toBeNull();
      expect(inPeriod.schoolEndedAt).toBeNull();
      expect(inPeriod.sinceSchoolEndedMs).toBeNull();
      expect(describeMoment(sep(10, 10, 5), years).nextSchoolDay).toBeNull();
    });
  });

  describe('since school ended', () => {
    it("before school, counts from the previous School Day's last Segment, across the weekend", () => {
      // Mon 9/9 8:00 → since Fri 9/6 11:00.
      const moment = describeMoment(sep(9, 8), years);
      expect(moment.schoolEndedAt).toEqual(sep(6, 11));
      expect(moment.sinceSchoolEndedMs).toBe(69 * HOUR);
    });

    it("after school, counts from today's last Segment", () => {
      const moment = describeMoment(sep(6, 12, 30), years);
      expect(moment.schoolEndedAt).toEqual(sep(6, 11));
      expect(moment.sinceSchoolEndedMs).toBe(90 * MIN);
    });

    it('is unknown before the first School Day of every known year', () => {
      const laborDay = describeMoment(sep(2, 12), years);
      expect(laborDay.schoolEndedAt).toBeNull();
      expect(laborDay.sinceSchoolEndedMs).toBeNull();
    });
  });

  describe('days off and Experience Week', () => {
    it('labels a day off with its Day Label and points at the Next School Day', () => {
      const moment = describeMoment(sep(2, 12), years);
      expect(moment.state).toBe('dayOff');
      expect(moment.dayLabel).toBe('Labor Day');
      expect(moment.nextSchoolDay.firstSegment.start).toEqual(sep(3, 9));
      expect(moment.untilNextSchoolDayMs).toBe(21 * HOUR);
    });

    it('labels a weekend "Weekend", counting since the last School Day before it', () => {
      // Sat 9/14 for HS: the last School Day was Tue 9/10.
      const moment = describeMoment(sep(14, 11), years, { division: 'HS' });
      expect(moment.dayLabel).toBe('Weekend');
      expect(moment.state).toBe('dayOff');
      expect(moment.schoolEndedAt).toEqual(sep(10, 11));
      expect(moment.nextSchoolDay.firstSegment.start).toEqual(sep(16, 9));
    });

    it('gives Experience Week its own state with no Segments, and counts on past it', () => {
      const moment = describeMoment(sep(11, 9, 30), years, { division: 'HS' });
      expect(moment.state).toBe('experienceWeek');
      expect(moment.dayLabel).toBe('HS Experience Week');
      expect(moment.current).toBeNull();
      expect(moment.upNext).toBeNull();
      expect(moment.schoolEndedAt).toEqual(sep(10, 11));
      expect(moment.nextSchoolDay.firstSegment.start).toEqual(sep(16, 9));
    });
  });

  describe('Summer', () => {
    it("starts the moment the last Segment of the year's last School Day ends", () => {
      expect(describeMoment(sep(25, 10, 59), years).state).toBe('segment');

      const moment = describeMoment(sep(25, 11), years);
      expect(moment.state).toBe('summer');
      expect(moment.dayLabel).toBe('Summer');
      expect(moment.summerDay).toBe(1);
      expect(moment.schoolEndedAt).toEqual(sep(25, 11));
      expect(moment.current).toBeNull();
    });

    it('counts the days of Summer, through the No School days left in the year and past its end', () => {
      expect(describeMoment(sep(26, 9), years).summerDay).toBe(2);
      expect(describeMoment(sep(27, 23, 59), years).summerDay).toBe(3);
      expect(describeMoment(oct(5, 0, 0), years).summerDay).toBe(11);
      expect(describeMoment(oct(5, 0, 0), years).dayLabel).toBe('Summer');
    });

    it('counts down to the first day once the next School Year is registered', () => {
      const moment = describeMoment(oct(13, 9), years);
      expect(moment.state).toBe('summer');
      expect(moment.nextSchoolDay.firstSegment.start).toEqual(oct(15, 9));
      expect(moment.untilNextSchoolDayMs).toBe(48 * HOUR);
    });

    it('ends when the next School Year begins', () => {
      const moment = describeMoment(oct(14, 9), years);
      expect(moment.state).toBe('dayOff');
      expect(moment.dayLabel).toBe('No School');
      expect(moment.summerDay).toBeNull();
      expect(moment.schoolEndedAt).toEqual(sep(25, 11));
    });

    it('has no countdown before the next School Year is registered, and lasts a year from when the last one began', () => {
      const moment = describeMoment(oct(13, 9), [yearS]);
      expect(moment.state).toBe('summer');
      expect(moment.summerDay).toBe(19);
      expect(moment.nextSchoolDay).toBeNull();
      expect(moment.untilNextSchoolDayMs).toBeNull();

      expect(describeMoment(new Date(2031, 8, 1, 12), [yearS]).state).toBe('summer');
      expect(describeMoment(new Date(2031, 8, 2, 0), [yearS]).state).toBe('unknown');
    });
  });

  it('does not depend on the order School Years are registered in', () => {
    const reversed = [yearT, yearS];
    const summer = describeMoment(oct(13, 9), reversed);
    expect(summer.state).toBe('summer');
    expect(summer.nextSchoolDay.firstSegment.start).toEqual(oct(15, 9));
    const nextYear = describeMoment(oct(15, 8), reversed);
    expect(nextYear.state).toBe('beforeSchool');
    expect(nextYear.schoolEndedAt).toEqual(sep(25, 11));
  });

  it('knows nothing on a date before every School Year', () => {
    const moment = describeMoment(new Date(2030, 7, 1, 10), years);
    expect(moment.state).toBe('unknown');
    expect(moment.dayLabel).toBeNull();
    expect(moment.nextSchoolDay).toBeNull();
    expect(moment.schoolEndedAt).toBeNull();
    expect(moment.summerDay).toBeNull();
  });
});

describe('describeMoment across the 2026-11-01 daylight-saving change (Los Angeles)', () => {
  const HOUR = 60 * MIN;
  let savedTz;
  beforeAll(() => {
    savedTz = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
  });
  afterAll(() => {
    if (savedTz === undefined) delete process.env.TZ;
    else process.env.TZ = savedTz;
  });

  it('counts down to 8:30 AM Monday on the wall clock, an hour longer in real time', () => {
    // Sat 10/31 noon (PDT) → Mon 11/2 8:30 (PST): 44.5 wall-clock hours, 45.5 real.
    const moment = describeMoment(new Date(2026, 9, 31, 12, 0), SCHOOL_YEARS);
    const start = moment.nextSchoolDay.firstSegment.start;
    expect([start.getDate(), start.getHours(), start.getMinutes()]).toEqual([2, 8, 30]);
    expect(moment.untilNextSchoolDayMs).toBe(45.5 * HOUR);
  });

  it("counts since Friday's 3:10 PM across the change", () => {
    // Fri 10/30 15:10 (PDT) → Mon 11/2 7:30 (PST): 64h20m wall-clock, 65h20m real.
    const moment = describeMoment(new Date(2026, 10, 2, 7, 30), SCHOOL_YEARS);
    const ended = moment.schoolEndedAt;
    expect([ended.getDate(), ended.getHours(), ended.getMinutes()]).toEqual([30, 15, 10]);
    expect(moment.sinceSchoolEndedMs).toBe(65 * HOUR + 20 * MIN);
  });
});
