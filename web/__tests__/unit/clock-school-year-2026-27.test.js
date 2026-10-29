import { describe, it, expect } from 'vitest';
import { describeMoment } from '../../clock/clock-model.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';
import { SCHOOL_YEAR_2026_27 as YEAR } from '../../clock/school-year-2026-27.js';

// Expected values are copied by hand from the district's "2026-27 Day and Bell
// Schedules for MS and HS" PDF, with the spec's "2026–27 data corrections"
// applied (they override the PDF).

/** Segments as [name, kind, start, end] rows, for readable expectations. */
const rows = (segments) => segments.map((s) => [s.name, s.kind, s.start, s.end]);
const P = 'period';
const B = 'break';
const A = 'assembly';

/** The Segment list a Division follows on a Bell Schedule. */
const plan = (key, division) => {
  const bellSchedule = YEAR.bellSchedules[key];
  return rows(bellSchedule.byDivision?.[division] ?? bellSchedule.segments);
};

/** The Segment list a Division follows on a real date, read through the model. */
function dayPlan(y, m, d, division) {
  const moment = describeMoment(new Date(y, m - 1, d, 0, 1), SCHOOL_YEARS, { division });
  if (moment.state !== 'beforeSchool') return { dayLabel: moment.dayLabel, state: moment.state };
  return { dayLabel: moment.dayLabel, first: moment.upNext.name };
}
const dayLabel = (y, m, d, division = 'HS') =>
  describeMoment(new Date(y, m - 1, d, 12, 0), SCHOOL_YEARS, { division }).dayLabel;
const segmentAt = (y, m, d, h, min, division) =>
  describeMoment(new Date(y, m - 1, d, h, min), SCHOOL_YEARS, { division }).current?.name;

describe('2026–27 Bell Schedules', () => {
  it('All Day (MS/HS)', () => {
    expect(YEAR.bellSchedules.all.name).toBe('All Day');
    expect(YEAR.bellSchedules.all.byDivision).toBeUndefined();
    expect(plan('all')).toEqual([
      ['Period 1', P, '08:30', '09:20'],
      ['Period 2', P, '09:25', '10:10'],
      ['Nutrition', B, '10:10', '10:25'],
      ['Period 3', P, '10:30', '11:15'],
      ['Period 4', P, '11:20', '12:05'],
      ['Period 5', P, '12:10', '12:55'],
      ['Lunch', B, '12:55', '13:30'],
      ['Period 6', P, '13:35', '14:20'],
      ['Period 7', P, '14:25', '15:10'],
    ]);
  });

  it('Even Day: MS has Period 4 before Chapel, HS has Chapel before Period 4', () => {
    expect(YEAR.bellSchedules.even.name).toBe('Even Day');
    expect(plan('even', 'MS')).toEqual([
      ['Period 2', P, '08:30', '09:55'],
      ['Nutrition', B, '09:55', '10:10'],
      ['Period 4', P, '10:15', '11:40'],
      ['Chapel', A, '11:45', '12:25'],
      ['Seminar', P, '12:30', '13:05'],
      ['Lunch', B, '13:05', '13:40'],
      ['Period 6', P, '13:45', '15:10'],
    ]);
    expect(plan('even', 'HS')).toEqual([
      ['Period 2', P, '08:30', '09:55'],
      ['Nutrition', B, '09:55', '10:10'],
      ['Chapel', A, '10:15', '10:55'],
      ['Period 4', P, '11:00', '12:25'],
      ['Seminar', P, '12:30', '13:05'],
      ['Lunch', B, '13:05', '13:40'],
      ['Period 6', P, '13:45', '15:10'],
    ]);
  });

  it('Odd Day (MS/HS)', () => {
    expect(YEAR.bellSchedules.odd.name).toBe('Odd Day');
    expect(YEAR.bellSchedules.odd.byDivision).toBeUndefined();
    expect(plan('odd')).toEqual([
      ['Period 1', P, '08:30', '09:55'],
      ['Nutrition', B, '09:55', '10:10'],
      ['Period 3', P, '10:15', '11:40'],
      ['Period 5', P, '11:45', '13:10'],
      ['Lunch', B, '13:10', '13:40'],
      ['Period 7', P, '13:45', '15:10'],
    ]);
  });

  it('Late Start Even (MS/HS)', () => {
    expect(YEAR.bellSchedules.lateStartEven.name).toBe('Late Start Even');
    expect(YEAR.bellSchedules.lateStartEven.byDivision).toBeUndefined();
    expect(plan('lateStartEven')).toEqual([
      ['Period 2', P, '09:30', '11:05'],
      ['Period 4', P, '11:10', '12:35'],
      ['Seminar', P, '12:40', '13:10'],
      ['Lunch', B, '13:10', '13:40'],
      ['Period 6', P, '13:45', '15:10'],
    ]);
  });

  it('the three Finals layouts', () => {
    for (const key of ['finals23', 'finals456', 'finals17']) expect(YEAR.bellSchedules[key].name).toBe('Finals');
    expect(plan('finals23')).toEqual([
      ['Period 2', P, '08:30', '09:50'],
      ['Nutrition', B, '09:50', '10:10'],
      ['Period 3', P, '10:10', '11:30'],
    ]);
    expect(plan('finals456')).toEqual([
      ['Period 4', P, '08:30', '09:50'],
      ['Nutrition', B, '09:50', '10:10'],
      ['Period 5', P, '10:10', '11:30'],
      ['Nutrition', B, '11:30', '11:45'],
      ['Period 6', P, '11:45', '13:05'],
    ]);
    expect(plan('finals17')).toEqual([
      ['Period 1', P, '08:30', '09:50'],
      ['Nutrition', B, '09:50', '10:10'],
      ['Period 7', P, '10:10', '11:30'],
    ]);
  });

  it('All School Convocation (MS/HS)', () => {
    expect(YEAR.bellSchedules.convocation.name).toBe('All School Convocation');
    expect(YEAR.bellSchedules.convocation.byDivision).toBeUndefined();
    expect(plan('convocation')).toEqual([
      ['Period 1', P, '08:30', '09:10'],
      ['Period 2', P, '09:15', '09:55'],
      ['Convocation', A, '10:00', '10:40'],
      ['Nutrition', B, '10:40', '10:55'],
      ['Period 3', P, '11:00', '11:40'],
      ['Period 4', P, '11:45', '12:25'],
      ['Period 5', P, '12:30', '13:10'],
      ['Lunch', B, '13:10', '13:40'],
      ['Period 6', P, '13:45', '14:25'],
      ['Period 7', P, '14:30', '15:10'],
    ]);
  });

  it('Pep Rally: Period 5 at 11:45–12:25 (PDF typo corrected); the Pep Rally slot differs by Division', () => {
    expect(YEAR.bellSchedules.pepRally.name).toBe('Pep Rally');
    const morning = [
      ['Period 1', P, '08:30', '09:10'],
      ['Period 2', P, '09:15', '09:55'],
      ['Nutrition', B, '09:55', '10:10'],
      ['Period 3', P, '10:15', '10:55'],
      ['Period 4', P, '11:00', '11:40'],
      ['Period 5', P, '11:45', '12:25'],
    ];
    expect(plan('pepRally', 'HS')).toEqual([
      ...morning,
      ['Pep Rally', A, '12:30', '13:10'],
      ['Lunch', B, '13:10', '13:40'],
      ['Period 6', P, '13:45', '14:25'],
      ['Period 7', P, '14:30', '15:10'],
    ]);
    expect(plan('pepRally', 'MS')).toEqual([
      ...morning,
      ['Period 6', P, '12:30', '13:10'],
      ['Lunch', B, '13:10', '13:40'],
      ['Period 7', P, '13:45', '14:25'],
      ['Pep Rally', A, '14:30', '15:10'],
    ]);
  });

  it('HS Super Seminar Even', () => {
    expect(YEAR.bellSchedules.hsSuperSeminar.name).toBe('HS Super Seminar Even');
    expect(plan('hsSuperSeminar', 'HS')).toEqual([
      ['Period 2', P, '08:30', '09:55'],
      ['Nutrition', B, '09:55', '10:10'],
      ['Period 4', P, '10:15', '11:40'],
      ['Super Seminar', P, '11:45', '13:05'],
      ['Lunch', B, '13:05', '13:40'],
      ['Period 6', P, '13:45', '15:10'],
    ]);
  });

  it('has exactly these Bell Schedules', () => {
    expect(Object.keys(YEAR.bellSchedules).sort()).toEqual(
      ['all', 'convocation', 'even', 'finals17', 'finals23', 'finals456', 'hsSuperSeminar', 'lateStartEven', 'odd', 'pepRally'],
    );
  });
});

describe('2026–27 calendar', () => {
  it('runs from NSO (8/17/26) to "Done!" (5/28/27)', () => {
    expect(YEAR.start).toBe('2026-08-17');
    expect(YEAR.end).toBe('2027-05-28');
  });

  it('uses the Weekday Defaults: All on Mon, Tue, Fri; Even on Wed; Odd on Thu', () => {
    // Week of 10/26/26.
    expect(dayLabel(2026, 10, 26)).toBe('All Day');
    expect(dayLabel(2026, 10, 27)).toBe('All Day');
    expect(dayLabel(2026, 10, 28)).toBe('Even Day');
    expect(dayLabel(2026, 10, 29)).toBe('Odd Day');
    expect(dayLabel(2026, 10, 30)).toBe('All Day');
  });

  it('labels every day off from the Key Dates', () => {
    const daysOff = {
      'No School': ['2026-08-17', '2027-05-28'],
      'Labor Day': ['2026-09-07'],
      'Teacher In-Service': ['2026-10-09', '2026-11-20', '2027-01-06', '2027-03-12'],
      'Thanksgiving Break': ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'],
      'Christmas Break': [
        '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25',
        '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01',
        '2027-01-04', '2027-01-05',
      ],
      'MLK Jr. Day': ['2027-01-18'],
      'Presidents Day Winter Break': ['2027-02-12', '2027-02-15'],
      'Easter Break': ['2027-03-26', '2027-03-29', '2027-03-30', '2027-03-31', '2027-04-01', '2027-04-02'],
      'School Holiday': ['2027-04-26'],
    };
    const expected = Object.entries(daysOff)
      .flatMap(([label, dates]) => dates.map((date) => [date, label]))
      .sort();
    const actual = YEAR.calendarExceptions
      .filter((e) => e.kind === 'dayOff')
      .map((e) => [e.date, e.dayLabel])
      .sort();
    expect(actual).toEqual(expected);
    for (const division of ['MS', 'HS']) {
      // "Done!" (5/28) falls after the last School Day, so the clock calls it Summer.
      for (const [date, label] of expected.filter(([date]) => date !== '2027-05-28')) {
        const [y, m, d] = date.split('-').map(Number);
        const moment = describeMoment(new Date(y, m - 1, d, 10, 0), SCHOOL_YEARS, { division });
        expect([date, moment.state, moment.dayLabel]).toEqual([date, 'dayOff', label]);
      }
    }
  });

  it('starts Summer when the last Finals block of Thu 5/27/27 ends, so "Done!" is Day 2 of Summer', () => {
    for (const division of ['MS', 'HS']) {
      expect(describeMoment(new Date(2027, 4, 27, 11, 29), SCHOOL_YEARS, { division }).state).toBe('segment');
      expect(describeMoment(new Date(2027, 4, 27, 11, 30), SCHOOL_YEARS, { division }).summerDay).toBe(1);
      expect(describeMoment(new Date(2027, 4, 28, 10, 0), SCHOOL_YEARS, { division }).summerDay).toBe(2);
    }
  });

  it('applies every Bell Schedule exception, for both Divisions unless noted', () => {
    const both = YEAR.calendarExceptions
      .filter((e) => e.kind === 'bellSchedule' && e.division === undefined)
      .map((e) => [e.date, e.bellSchedule])
      .sort();
    expect(both).toEqual(
      [
        // Late Start Even.
        ...['2026-09-02', '2026-09-30', '2026-11-04', '2026-12-02', '2027-02-03', '2027-03-03', '2027-04-07', '2027-05-19']
          .map((d) => [d, 'lateStartEven']),
        // Wednesdays and Thursdays switched to All (1/20–21 for MS, under HS Experience Week).
        ...['2026-08-19', '2026-08-20', '2026-10-07', '2026-10-08', '2026-11-12', '2027-01-07', '2027-01-20', '2027-01-21', '2027-03-10', '2027-03-11']
          .map((d) => [d, 'all']),
        ['2026-11-11', 'convocation'],
        ['2026-09-11', 'pepRally'],
        ['2027-01-29', 'pepRally'],
        ['2027-04-16', 'pepRally'],
        ['2026-12-16', 'finals23'],
        ['2026-12-17', 'finals456'],
        ['2026-12-18', 'finals17'],
        ['2027-05-25', 'finals23'],
        ['2027-05-26', 'finals456'],
        ['2027-05-27', 'finals17'],
      ].sort(),
    );
  });

  it('has only the HS-only exceptions: Experience Week and Super Seminar', () => {
    const scoped = YEAR.calendarExceptions
      .filter((e) => e.division !== undefined)
      .map((e) => [e.date, e.division, e.kind === 'bellSchedule' ? e.bellSchedule : e.kind])
      .sort();
    expect(scoped).toEqual([
      ['2027-01-19', 'HS', 'experienceWeek'],
      ['2027-01-20', 'HS', 'experienceWeek'],
      ['2027-01-21', 'HS', 'experienceWeek'],
      ['2027-01-22', 'HS', 'experienceWeek'],
      ['2027-04-28', 'HS', 'hsSuperSeminar'],
    ]);
  });
});

describe('2026–27 spot checks on real dates', () => {
  it('2026-11-11 is the All School Convocation, for both Divisions', () => {
    for (const division of ['MS', 'HS']) {
      expect(dayLabel(2026, 11, 11, division)).toBe('All School Convocation');
      expect(segmentAt(2026, 11, 11, 10, 20, division)).toBe('Convocation');
    }
  });

  it('2026-12-17 Finals has Periods 4, 5 and 6', () => {
    expect(dayLabel(2026, 12, 17)).toBe('Finals');
    expect(segmentAt(2026, 12, 17, 9, 0)).toBe('Period 4');
    expect(segmentAt(2026, 12, 17, 11, 0)).toBe('Period 5');
    expect(segmentAt(2026, 12, 17, 12, 0)).toBe('Period 6');
  });

  it('Semester 2 finals (5/25–27) follow the Semester 1 order', () => {
    expect(segmentAt(2027, 5, 25, 9, 0)).toBe('Period 2');
    expect(segmentAt(2027, 5, 26, 12, 0)).toBe('Period 6');
    expect(segmentAt(2027, 5, 27, 11, 0)).toBe('Period 7');
  });

  it('2027-01-20 is Experience Week for HS and All Day for MS', () => {
    expect(dayPlan(2027, 1, 20, 'HS')).toEqual({ dayLabel: 'HS Experience Week', state: 'experienceWeek' });
    expect(dayPlan(2027, 1, 20, 'MS')).toEqual({ dayLabel: 'All Day', first: 'Period 1' });
  });

  it('2027-04-28 is HS Super Seminar for HS and Even for MS', () => {
    expect(dayLabel(2027, 4, 28, 'HS')).toBe('HS Super Seminar Even');
    expect(segmentAt(2027, 4, 28, 12, 0, 'HS')).toBe('Super Seminar');
    expect(dayLabel(2027, 4, 28, 'MS')).toBe('Even Day');
    expect(segmentAt(2027, 4, 28, 12, 0, 'MS')).toBe('Chapel');
  });

  it('2026-11-25 is Thanksgiving Break', () => {
    expect(dayPlan(2026, 11, 25, 'HS')).toEqual({ dayLabel: 'Thanksgiving Break', state: 'dayOff' });
  });

  it('Pep Rally days put the Pep Rally at 12:30 for HS and at 2:30 for MS', () => {
    for (const [m, d] of [[9, 11], [1, 29], [4, 16]]) {
      const y = m >= 8 ? 2026 : 2027;
      expect(dayLabel(y, m, d)).toBe('Pep Rally');
      expect(segmentAt(y, m, d, 12, 45, 'HS')).toBe('Pep Rally');
      expect(segmentAt(y, m, d, 12, 45, 'MS')).toBe('Period 6');
      expect(segmentAt(y, m, d, 14, 45, 'MS')).toBe('Pep Rally');
    }
  });

  it('a Late Start Even day starts at 9:30', () => {
    expect(dayPlan(2026, 9, 2, 'MS')).toEqual({ dayLabel: 'Late Start Even', first: 'Period 2' });
    expect(segmentAt(2026, 9, 2, 9, 29)).toBeUndefined();
    expect(segmentAt(2026, 9, 2, 9, 30)).toBe('Period 2');
  });

  it('the first day of classes (8/18/26) is All Day, and a Wednesday switched to All is too', () => {
    expect(dayLabel(2026, 8, 18)).toBe('All Day');
    expect(dayLabel(2026, 8, 19)).toBe('All Day');
  });
});
