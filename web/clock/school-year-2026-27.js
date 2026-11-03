// @ts-check
// 2026–27 School Year, from the district's "2026-27 Day and Bell Schedules
// for MS and HS" PDF (published 7/30/26; bell schedule updated 7/27/26).
// Hand-edited (ADR 0014).
//
// Corrections confirmed with Eric override the PDF (see the spec's "2026–27
// data corrections"):
// - Pep Rally Period 5 is 11:45–12:25 (the PDF's 11:15–11:55 is a typo).
// - Pep Rally overrides "All" on 9/11/26, 1/29/27 and 4/16/27.
// - Semester 2 finals (5/25–27) use the Semester 1 order and times.
// - NSO (8/17) and "Done!" (5/28) are days off labelled "No School".
// - HS Experience Week (1/19–22) is HS only; MS is on All Day.
//
// 1/6/27 is in the Key Dates twice ("Dec 21 through Jan 6: Christmas Break"
// and "Jan 6: Teacher In-service"); it is labelled Teacher In-Service.
// Weekends inside a break keep the "Weekend" Day Label.

/** @typedef {import('./school-years.js').Segment} Segment */
/** @typedef {import('./school-years.js').CalendarException} CalendarException */

/**
 * @param {string} name
 * @param {string} start
 * @param {string} end
 * @returns {Segment}
 */
const period = (name, start, end) => ({ name, kind: 'period', start, end });
/**
 * @param {string} name
 * @param {string} start
 * @param {string} end
 * @returns {Segment}
 */
const brk = (name, start, end) => ({ name, kind: 'break', start, end });
/**
 * @param {string} name
 * @param {string} start
 * @param {string} end
 * @returns {Segment}
 */
const assembly = (name, start, end) => ({ name, kind: 'assembly', start, end });

/**
 * @param {string} bellSchedule
 * @param {string[]} dates
 * @returns {CalendarException[]}
 */
const onBellSchedule = (bellSchedule, dates) =>
  dates.map((date) => ({ date, kind: 'bellSchedule', bellSchedule }));

/**
 * @param {string} dayLabel
 * @param {string[]} dates
 * @returns {CalendarException[]}
 */
const daysOff = (dayLabel, dates) => dates.map((date) => ({ date, kind: 'dayOff', dayLabel }));

/** @type {import('./school-years.js').SchoolYear} */
export const SCHOOL_YEAR_2026_27 = {
  id: '2026-27',
  start: '2026-08-17',
  end: '2027-05-28',
  bellSchedules: {
    all: {
      name: 'All Day',
      segments: [
        period('Period 1', '08:30', '09:20'),
        period('Period 2', '09:25', '10:10'),
        brk('Nutrition', '10:10', '10:25'),
        period('Period 3', '10:30', '11:15'),
        period('Period 4', '11:20', '12:05'),
        period('Period 5', '12:10', '12:55'),
        brk('Lunch', '12:55', '13:30'),
        period('Period 6', '13:35', '14:20'),
        period('Period 7', '14:25', '15:10'),
      ],
    },
    even: {
      name: 'Even Day',
      // HS's order; MS differs.
      segments: [
        period('Period 2', '08:30', '09:55'),
        brk('Nutrition', '09:55', '10:10'),
        assembly('Chapel', '10:15', '10:55'),
        period('Period 4', '11:00', '12:25'),
        period('Seminar', '12:30', '13:05'),
        brk('Lunch', '13:05', '13:40'),
        period('Period 6', '13:45', '15:10'),
      ],
      byDivision: {
        MS: [
          period('Period 2', '08:30', '09:55'),
          brk('Nutrition', '09:55', '10:10'),
          period('Period 4', '10:15', '11:40'),
          assembly('Chapel', '11:45', '12:25'),
          period('Seminar', '12:30', '13:05'),
          brk('Lunch', '13:05', '13:40'),
          period('Period 6', '13:45', '15:10'),
        ],
      },
    },
    odd: {
      name: 'Odd Day',
      segments: [
        period('Period 1', '08:30', '09:55'),
        brk('Nutrition', '09:55', '10:10'),
        period('Period 3', '10:15', '11:40'),
        period('Period 5', '11:45', '13:10'),
        brk('Lunch', '13:10', '13:40'),
        period('Period 7', '13:45', '15:10'),
      ],
    },
    lateStartEven: {
      name: 'Late Start Even',
      segments: [
        period('Period 2', '09:30', '11:05'),
        period('Period 4', '11:10', '12:35'),
        period('Seminar', '12:40', '13:10'),
        brk('Lunch', '13:10', '13:40'),
        period('Period 6', '13:45', '15:10'),
      ],
    },
    finals23: {
      name: 'Finals',
      segments: [
        period('Period 2', '08:30', '09:50'),
        brk('Nutrition', '09:50', '10:10'),
        period('Period 3', '10:10', '11:30'),
      ],
    },
    finals456: {
      name: 'Finals',
      segments: [
        period('Period 4', '08:30', '09:50'),
        brk('Nutrition', '09:50', '10:10'),
        period('Period 5', '10:10', '11:30'),
        brk('Nutrition', '11:30', '11:45'),
        period('Period 6', '11:45', '13:05'),
      ],
    },
    finals17: {
      name: 'Finals',
      segments: [
        period('Period 1', '08:30', '09:50'),
        brk('Nutrition', '09:50', '10:10'),
        period('Period 7', '10:10', '11:30'),
      ],
    },
    convocation: {
      name: 'All School Convocation',
      segments: [
        period('Period 1', '08:30', '09:10'),
        period('Period 2', '09:15', '09:55'),
        assembly('Convocation', '10:00', '10:40'),
        brk('Nutrition', '10:40', '10:55'),
        period('Period 3', '11:00', '11:40'),
        period('Period 4', '11:45', '12:25'),
        period('Period 5', '12:30', '13:10'),
        brk('Lunch', '13:10', '13:40'),
        period('Period 6', '13:45', '14:25'),
        period('Period 7', '14:30', '15:10'),
      ],
    },
    pepRally: {
      name: 'Pep Rally',
      // HS's order; MS differs.
      segments: [
        period('Period 1', '08:30', '09:10'),
        period('Period 2', '09:15', '09:55'),
        brk('Nutrition', '09:55', '10:10'),
        period('Period 3', '10:15', '10:55'),
        period('Period 4', '11:00', '11:40'),
        period('Period 5', '11:45', '12:25'),
        assembly('Pep Rally', '12:30', '13:10'),
        brk('Lunch', '13:10', '13:40'),
        period('Period 6', '13:45', '14:25'),
        period('Period 7', '14:30', '15:10'),
      ],
      byDivision: {
        MS: [
          period('Period 1', '08:30', '09:10'),
          period('Period 2', '09:15', '09:55'),
          brk('Nutrition', '09:55', '10:10'),
          period('Period 3', '10:15', '10:55'),
          period('Period 4', '11:00', '11:40'),
          period('Period 5', '11:45', '12:25'),
          period('Period 6', '12:30', '13:10'),
          brk('Lunch', '13:10', '13:40'),
          period('Period 7', '13:45', '14:25'),
          assembly('Pep Rally', '14:30', '15:10'),
        ],
      },
    },
    hsSuperSeminar: {
      name: 'HS Super Seminar Even',
      segments: [
        period('Period 2', '08:30', '09:55'),
        brk('Nutrition', '09:55', '10:10'),
        period('Period 4', '10:15', '11:40'),
        period('Super Seminar', '11:45', '13:05'),
        brk('Lunch', '13:05', '13:40'),
        period('Period 6', '13:45', '15:10'),
      ],
    },
  },
  weekdayDefaults: { 1: 'all', 2: 'all', 3: 'even', 4: 'odd', 5: 'all' },
  calendarExceptions: [
    // Days off, with their Day Labels from the Key Dates.
    ...daysOff('No School', ['2026-08-17', '2027-05-28']),
    ...daysOff('Labor Day', ['2026-09-07']),
    ...daysOff('Teacher In-Service', ['2026-10-09', '2026-11-20', '2027-01-06', '2027-03-12']),
    ...daysOff('Thanksgiving Break', ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']),
    ...daysOff('Christmas Break', [
      '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25',
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01',
      '2027-01-04', '2027-01-05',
    ]),
    ...daysOff('MLK Jr. Day', ['2027-01-18']),
    ...daysOff('Presidents Day Winter Break', ['2027-02-12', '2027-02-15']),
    ...daysOff('Easter Break', ['2027-03-26', '2027-03-29', '2027-03-30', '2027-03-31', '2027-04-01', '2027-04-02']),
    ...daysOff('School Holiday', ['2027-04-26']),

    ...onBellSchedule('lateStartEven', [
      '2026-09-02', '2026-09-30', '2026-11-04', '2026-12-02',
      '2027-02-03', '2027-03-03', '2027-04-07', '2027-05-19',
    ]),

    // Wednesdays and Thursdays on All. 1/20–21/27 are for MS, during HS
    // Experience Week (Tue 1/19 and Fri 1/22 are All by default).
    ...onBellSchedule('all', [
      '2026-08-19', '2026-08-20', '2026-10-07', '2026-10-08', '2026-11-12',
      '2027-01-07', '2027-01-20', '2027-01-21', '2027-03-10', '2027-03-11',
    ]),

    ...onBellSchedule('convocation', ['2026-11-11']),
    ...onBellSchedule('pepRally', ['2026-09-11', '2027-01-29', '2027-04-16']),

    ...onBellSchedule('finals23', ['2026-12-16', '2027-05-25']),
    ...onBellSchedule('finals456', ['2026-12-17', '2027-05-26']),
    ...onBellSchedule('finals17', ['2026-12-18', '2027-05-27']),

    // HS only.
    ...['2027-01-19', '2027-01-20', '2027-01-21', '2027-01-22'].map(
      (date) => /** @type {CalendarException} */ ({ date, division: 'HS', kind: 'experienceWeek' }),
    ),
    { date: '2027-04-28', division: 'HS', kind: 'bellSchedule', bellSchedule: 'hsSuperSeminar' },
  ],
};
