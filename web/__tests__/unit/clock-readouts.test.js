import { describe, it, expect } from 'vitest';
import { defaultMode, nextMode, readoutText, readoutValue } from '../../clock/readouts.js';
import { describeMoment } from '../../clock/clock-model.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';

// Tue 2026-10-27 is an All Day: Period 3 10:30–11:15, Period 7 ends 15:10.
const tue = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);
const MIN = 60 * 1000;

/** The value each mode shows at `now`. */
const valuesAt = (now) => {
  const moment = describeMoment(now, SCHOOL_YEARS);
  return {
    countdown: readoutValue('countdown', moment, now),
    countup: readoutValue('countup', moment, now),
    clock: readoutValue('clock', moment, now),
  };
};

describe('nextMode', () => {
  it('cycles countdown → count-up → current time → countdown', () => {
    expect(nextMode('countdown')).toBe('countup');
    expect(nextMode('countup')).toBe('clock');
    expect(nextMode('clock')).toBe('countdown');
  });
});

describe('defaultMode (for a new Readout)', () => {
  const at = (now) => defaultMode(describeMoment(now, SCHOOL_YEARS));

  it('counts down to school before school on a School Day', () => {
    expect(at(tue(8, 0))).toBe('countdown');
  });

  it('counts since school ended after school', () => {
    expect(at(tue(16, 0))).toBe('countup');
  });

  it('counts down to the Next School Day on a day off', () => {
    expect(at(new Date(2026, 9, 31, 12, 0))).toBe('countdown');
  });

  it('shows time left in school, Passing Periods included', () => {
    expect(at(tue(10, 32))).toBe('countdown');
    expect(at(tue(10, 27))).toBe('countdown');
  });
});

describe('a Readout keeps its place in the cycle across in-school and Off-Hours', () => {
  it('a count-up shows time elapsed in Period 7, then time since school ended', () => {
    const before = tue(15, 0);
    const after = tue(15, 20);
    expect(readoutValue('countup', describeMoment(before, SCHOOL_YEARS), before).caption).toBe('elapsed');
    expect(readoutValue('countup', describeMoment(after, SCHOOL_YEARS), after).caption).toBe('since school ended');
  });
});

describe('readoutText', () => {
  it('writes short durations as M:SS or H:MM:SS with their caption', () => {
    expect(readoutText({ kind: 'duration', ms: 43 * MIN, caption: 'left', long: false })).toBe('43:00 left');
    expect(readoutText({ kind: 'duration', ms: 125 * MIN, caption: 'elapsed', long: false })).toBe('2:05:00 elapsed');
  });

  it('writes long durations in days and hours from a day up', () => {
    const ms = (4 * 24 + 22) * 60 * MIN + 5 * MIN;
    expect(readoutText({ kind: 'duration', ms, caption: 'until next school day', long: true }))
      .toBe('4d 22h until next school day');
  });

  it('writes a dash when there is nothing to count', () => {
    expect(readoutText({ kind: 'duration', ms: null, caption: 'until next school day', long: true }))
      .toBe('— until next school day');
  });

  it('writes the current time with seconds, in 24-hour form when asked', () => {
    const at = tue(13, 4, 9);
    expect(readoutText({ kind: 'time', at })).toBe('1:04:09 PM');
    expect(readoutText({ kind: 'time', at }, { use24Hour: true })).toBe('13:04:09');
  });
});

describe('readoutValue', () => {
  it('in a Segment: time left, time elapsed, current time', () => {
    const now = tue(10, 32);
    expect(valuesAt(now)).toEqual({
      countdown: { kind: 'duration', ms: 43 * MIN, caption: 'left', long: false },
      countup: { kind: 'duration', ms: 2 * MIN, caption: 'elapsed', long: false },
      clock: { kind: 'time', at: now },
    });
  });

  it("in a Passing Period: both counting modes show the Passing Period's remaining time", () => {
    // Nutrition ends 10:25; Period 3 starts 10:30.
    const now = tue(10, 27, 20);
    const remaining = { kind: 'duration', ms: 2 * MIN + 40 * 1000, caption: 'left', long: false };
    expect(valuesAt(now)).toEqual({ countdown: remaining, countup: remaining, clock: { kind: 'time', at: now } });
  });

  it('before school: until school starts, since the last School Day ended', () => {
    // Monday 10/26 ended 15:10; Tuesday starts 8:30.
    const now = tue(8, 0);
    const { countdown, countup } = valuesAt(now);
    expect(countdown).toEqual({ kind: 'duration', ms: 30 * MIN, caption: 'until school starts', long: true });
    expect(countup).toEqual({ kind: 'duration', ms: (16 * 60 + 50) * MIN, caption: 'since school ended', long: true });
  });

  it('after school: until the Next School Day, since school ended', () => {
    const now = tue(16, 0);
    const { countdown, countup } = valuesAt(now);
    // Wed 10/28 starts 8:30.
    expect(countdown).toEqual({ kind: 'duration', ms: (16 * 60 + 30) * MIN, caption: 'until next school day', long: true });
    expect(countup).toEqual({ kind: 'duration', ms: 50 * MIN, caption: 'since school ended', long: true });
  });

  it('on a day off: until the Next School Day, since school ended', () => {
    // Sat 10/31 noon; Fri 10/30 ended 15:10; Mon 11/2 starts 8:30.
    const now = new Date(2026, 9, 31, 12, 0);
    const { countdown, countup } = valuesAt(now);
    expect(countdown).toMatchObject({ caption: 'until next school day', long: true });
    expect(countdown.ms).toBeGreaterThan(44 * 60 * MIN);
    expect(countup).toMatchObject({ caption: 'since school ended', ms: (20 * 60 + 50) * MIN });
  });

  it('in Summer with next year unknown: nothing to count down to', () => {
    const now = new Date(2027, 6, 1, 12, 0);
    const { countdown, countup } = valuesAt(now);
    expect(countdown).toEqual({ kind: 'duration', ms: null, caption: 'until next school day', long: true });
    expect(countup.ms).toBeGreaterThan(0);
  });

  it('on a date outside every School Year: every mode is the current time', () => {
    const now = new Date(2020, 0, 1, 9, 0);
    expect(valuesAt(now)).toEqual({
      countdown: { kind: 'time', at: now }, countup: { kind: 'time', at: now }, clock: { kind: 'time', at: now },
    });
  });
});
