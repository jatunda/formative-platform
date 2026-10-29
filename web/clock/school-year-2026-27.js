// @ts-check
// 2026–27 School Year, from the district's "2026-27 Day and Bell Schedules
// for MS and HS" PDF. Hand-edited (ADR 0014).
//
// So far only the All Day Bell Schedule and the Weekday Defaults are filled
// in. The Even and Odd Bell Schedules and every Calendar Exception arrive
// with the full 2026–27 data (ticket 07); until then a Wednesday or Thursday
// names a Bell Schedule that isn't here yet.

/** @type {import('./school-years.js').SchoolYear} */
export const SCHOOL_YEAR_2026_27 = {
  id: '2026-27',
  start: '2026-08-17',
  end: '2027-05-28',
  bellSchedules: {
    all: {
      name: 'All Day',
      segments: [
        { name: 'Period 1', kind: 'period', start: '08:00', end: '08:50' },
        { name: 'Period 2', kind: 'period', start: '08:55', end: '09:45' },
        { name: 'Nutrition', kind: 'break', start: '09:45', end: '10:00' },
        { name: 'Period 3', kind: 'period', start: '10:05', end: '10:55' },
        { name: 'Period 4', kind: 'period', start: '11:00', end: '11:50' },
        { name: 'Lunch', kind: 'break', start: '11:50', end: '12:30' },
        { name: 'Period 5', kind: 'period', start: '12:35', end: '13:25' },
        { name: 'Period 6', kind: 'period', start: '13:30', end: '14:20' },
        { name: 'Period 7', kind: 'period', start: '14:25', end: '15:10' },
      ],
    },
  },
  weekdayDefaults: { 1: 'all', 2: 'all', 3: 'even', 4: 'odd', 5: 'all' },
  calendarExceptions: [],
};
