import { describe, it, expect } from 'vitest';
import { formatClockTime, formatDuration, formatDate } from '../../clock/format.js';

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
