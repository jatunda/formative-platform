import { describe, it, expect } from 'vitest';
import { describeMoment } from '../../clock/clock-model.js';
import { displayText, headingText } from '../../clock/display-text.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';

// Tue 2026-10-27 is an All Day: Period 3 10:30–11:15, Lunch 12:55–13:30, Period 7 ends 15:10.
const tue = (h, m) => new Date(2026, 9, 27, h, m);

/** The main screen's words at `now`, for HS with the given settings. */
function wordsAt(now, settings = {}) {
  const moment = describeMoment(now, SCHOOL_YEARS, { division: 'HS' });
  return displayText(now, moment, { use24Hour: false, periodLabels: {}, showPeriodEnd: false, ...settings });
}

describe('the line under the Readouts saying when this Segment ends', () => {
  it('says when the current Period ends with the setting on', () => {
    expect(wordsAt(tue(10, 39), { showPeriodEnd: true }).ends).toBe('11:15 AM');
  });

  it('follows the 24-hour setting', () => {
    expect(wordsAt(tue(14, 30), { showPeriodEnd: true, use24Hour: true }).ends).toBe('15:10');
  });

  it('says when a Break ends too', () => {
    expect(wordsAt(tue(13, 0), { showPeriodEnd: true }).ends).toBe('1:30 PM');
  });

  it('says nothing about the end with the setting off', () => {
    expect(wordsAt(tue(10, 39)).ends).toBeNull();
  });

  it('leaves a Passing Period to its Up next, and Off-Hours to their line', () => {
    const passing = wordsAt(tue(10, 28), { showPeriodEnd: true });
    expect(passing.ends).toBeNull();
    expect(passing.upNext).toEqual({ name: 'Period 3', at: '10:30 AM' });

    const before = wordsAt(tue(7, 0), { showPeriodEnd: true });
    expect(before.ends).toBeNull();
    expect(before.upNext?.name).toBe('Period 1');

    const after = wordsAt(tue(16, 0), { showPeriodEnd: true });
    expect(after.ends).toBeNull();
    expect(after.line).toBe('Next: Wed, Oct 28 · Even Day');
  });
});

describe('the heading on its own, for the mini player', () => {
  const headingAt = (now, periodLabels = {}) =>
    headingText(now, describeMoment(now, SCHOOL_YEARS, { division: 'HS' }), periodLabels);

  it('names the current Period with its Period Label', () => {
    expect(headingAt(tue(10, 39), { 'Period 3': 'AP CSA' })).toBe('Period 3 · AP CSA');
  });

  it('names a Period with no Period Label, a Passing Period, or Off-Hours alone', () => {
    expect(headingAt(tue(10, 39))).toBe('Period 3');
    expect(headingAt(tue(10, 28))).toBe('Passing Period');
    expect(headingAt(tue(16, 0))).toBe('After school');
  });
});
