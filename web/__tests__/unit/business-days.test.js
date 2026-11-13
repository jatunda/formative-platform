import { describe, it, expect } from 'vitest';
import {
  addBusinessDays, createLocalDate, doNowsHeading, getBusinessDaysBetween, listedBusinessDay,
  localDateString, monthNameDayLabel, shortDateLabel,
} from '../../business-days.js';

describe('localDateString', () => {
  it("writes a date's local calendar day as YYYY-MM-DD, zero-padded", () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDateString(new Date(2026, 10, 12, 0, 0))).toBe('2026-11-12');
  });

  it('reads back through createLocalDate', () => {
    expect(createLocalDate(localDateString(new Date(2026, 1, 28)))).toEqual(new Date(2026, 1, 28));
  });
});

// November 2026: Mon 9, Tue 10, Wed 11, Thu 12, Fri 13, Sat 14, Sun 15, Mon 16.
const nov = (day) => new Date(2026, 10, day, 10, 30);

describe('doNowsHeading', () => {
  it("names a business day's own date, with no leading zeros or year", () => {
    expect(doNowsHeading(nov(11))).toBe('Do Now - November 11');
    expect(doNowsHeading(new Date(2026, 0, 5))).toBe('Do Now - January 5');
  });

  it("names Friday's date on Saturday and Sunday, the day whose Do Nows are listed", () => {
    expect(doNowsHeading(nov(14))).toBe('Do Now - November 13');
    expect(doNowsHeading(nov(15))).toBe('Do Now - November 13');
    expect(doNowsHeading(nov(16))).toBe('Do Now - November 16');
  });

  it("lists the same business day as Today's Day Index on a weekend", () => {
    // Day 0 is Mon 11/9, so Fri 11/13 is Day Index 4, and so is the weekend.
    for (const day of [13, 14, 15]) {
      expect(getBusinessDaysBetween('2026-11-09', nov(day))).toBe(4);
      expect(listedBusinessDay(nov(day))).toEqual(addBusinessDays(new Date(2026, 10, 9), 4));
    }
  });
});

describe('monthNameDayLabel', () => {
  it('spells out the month of the real calendar date, with no weekday, leading zero or year', () => {
    expect(monthNameDayLabel(nov(14))).toBe('November 14');
    expect(monthNameDayLabel(new Date(2027, 0, 5))).toBe('January 5');
  });
});

describe('shortDateLabel', () => {
  it('gives the weekday and month/day of the real calendar date, weekends included', () => {
    expect(shortDateLabel(nov(12))).toBe('Thu 11/12');
    expect(shortDateLabel(nov(14))).toBe('Sat 11/14');
  });
});
