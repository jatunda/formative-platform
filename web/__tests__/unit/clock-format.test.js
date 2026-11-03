import { describe, it, expect } from 'vitest';
import { formatClockTime, formatDuration, formatDate, formatShortDate, formatLongDuration, formatSegmentName } from '../../clock/format.js';

describe('formatClockTime (12-hour)', () => {
  it.each([
    [new Date(2026, 9, 27, 8, 5), '8:05 AM'],
    [new Date(2026, 9, 27, 0, 0), '12:00 AM'],
    [new Date(2026, 9, 27, 12, 0), '12:00 PM'],
    [new Date(2026, 9, 27, 15, 10), '3:10 PM'],
  ])('shows %s as %s', (date, text) => {
    expect(formatClockTime(date)).toBe(text);
  });

  it('can include seconds', () => {
    expect(formatClockTime(new Date(2026, 9, 27, 13, 4, 9), { seconds: true })).toBe('1:04:09 PM');
  });
});

describe('formatClockTime (24-hour)', () => {
  it.each([
    [new Date(2026, 9, 27, 8, 5), '08:05'],
    [new Date(2026, 9, 27, 0, 0), '00:00'],
    [new Date(2026, 9, 27, 12, 0), '12:00'],
    [new Date(2026, 9, 27, 15, 10), '15:10'],
    [new Date(2026, 9, 27, 23, 59), '23:59'],
  ])('shows %s as %s', (date, text) => {
    expect(formatClockTime(date, { use24Hour: true })).toBe(text);
  });

  it('can include seconds', () => {
    expect(formatClockTime(new Date(2026, 9, 27, 13, 4, 9), { seconds: true, use24Hour: true })).toBe('13:04:09');
  });
});

describe('formatSegmentName', () => {
  const period3 = { name: 'Period 3', kind: 'period' };

  it('adds the Period Label to a Period', () => {
    expect(formatSegmentName(period3, { 'Period 3': 'AP CSA' })).toBe('Period 3 · AP CSA');
  });

  it('leaves a Period with no label, or a blank one, as its name', () => {
    expect(formatSegmentName(period3, {})).toBe('Period 3');
    expect(formatSegmentName(period3, { 'Period 3': '   ' })).toBe('Period 3');
  });

  it('never labels a Break or an Assembly, even one sharing a labelled name', () => {
    expect(formatSegmentName({ name: 'Lunch', kind: 'break' }, { Lunch: 'Duty' })).toBe('Lunch');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [9 * 1000, '0:09'],
    [42 * 60 * 1000 + 17 * 1000, '42:17'],
    [60 * 60 * 1000 + 2 * 60 * 1000 + 3 * 1000, '1:02:03'],
    [1999, '0:01'],
  ])('shows %i ms as %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});

describe('formatDate', () => {
  it('shows the weekday, month, day and year', () => {
    expect(formatDate(new Date(2027, 0, 20, 9, 50))).toBe('Wed, Jan 20, 2027');
  });
});

describe('formatShortDate', () => {
  it('shows the weekday, month and day', () => {
    expect(formatShortDate(new Date(2026, 10, 30, 8, 30))).toBe('Mon, Nov 30');
  });
});

describe('formatLongDuration', () => {
  const HOUR = 60 * 60 * 1000;
  it.each([
    [42 * 60 * 1000 + 17 * 1000, '42:17'],
    [23 * HOUR + 59 * 60 * 1000 + 59 * 1000, '23:59:59'],
    [24 * HOUR, '1d 0h'],
    [2 * 24 * HOUR + 14 * HOUR + 59 * 60 * 1000, '2d 14h'],
  ])('shows %i ms as %s', (ms, text) => {
    expect(formatLongDuration(ms)).toBe(text);
  });
});

describe('durations with seconds off', () => {
  const SEC = 1000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  it.each([
    [42 * MIN + 59 * SEC, '42 min'],
    [MIN, '1 min'],
    [HOUR + 5 * MIN + 30 * SEC, '1h 05m'],
    [23 * HOUR + 59 * MIN + 59 * SEC, '23h 59m'],
  ])('shows %i ms as whole minutes, rounded down: %s', (ms, text) => {
    expect(formatDuration(ms, { seconds: false })).toBe(text);
    expect(formatLongDuration(ms, { seconds: false })).toBe(text);
  });

  it('still shows seconds in the last minute', () => {
    expect(formatDuration(59 * SEC + 999, { seconds: false })).toBe('0:59');
    expect(formatLongDuration(5 * SEC, { seconds: false })).toBe('0:05');
  });

  it('leaves a day or more as days and hours', () => {
    expect(formatLongDuration(2 * 24 * HOUR + 14 * HOUR + 59 * MIN, { seconds: false })).toBe('2d 14h');
  });

  it('shows seconds by default', () => {
    expect(formatDuration(42 * MIN + 17 * SEC)).toBe('42:17');
  });
});
