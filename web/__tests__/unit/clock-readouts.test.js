import { describe, it, expect } from 'vitest';
import { defaultMode, nextMode, readoutParts, readoutText, readoutValue } from '../../clock/readouts.js';
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
  it('a count-up shows time since Period 7 started, then time since school ended', () => {
    const before = tue(15, 0);
    const after = tue(15, 20);
    expect(readoutValue('countup', describeMoment(before, SCHOOL_YEARS), before).caption).toBe('since start');
    expect(readoutValue('countup', describeMoment(after, SCHOOL_YEARS), after).caption).toBe('since school ended');
  });
});

describe('readoutText', () => {
  it('writes short durations as M:SS or H:MM:SS with their caption', () => {
    expect(readoutText({ kind: 'duration', ms: 43 * MIN, caption: 'left', long: false })).toBe('43:00 left');
    expect(readoutText({ kind: 'duration', ms: 125 * MIN, caption: 'since start', long: false })).toBe('2:05:00 since start');
  });

  it('writes long durations in days and hours from a day up', () => {
    const ms = (4 * 24 + 22) * 60 * MIN + 5 * MIN;
    expect(readoutText({ kind: 'duration', ms, caption: 'until Mon, Nov 30', long: true }))
      .toBe('4d 22h until Mon, Nov 30');
  });

  it('writes the current time with seconds, in 24-hour form when asked', () => {
    const at = tue(13, 4, 9);
    expect(readoutText({ kind: 'time', at })).toBe('1:04:09 PM');
    expect(readoutText({ kind: 'time', at }, { use24Hour: true })).toBe('13:04:09');
  });

  it('with seconds off: the time and countdowns drop their seconds, except in the last minute', () => {
    const off = { seconds: false };
    expect(readoutText({ kind: 'time', at: tue(13, 4, 9) }, off)).toBe('1:04 PM');
    expect(readoutText({ kind: 'time', at: tue(13, 4, 9) }, { ...off, use24Hour: true })).toBe('13:04');
    expect(readoutText({ kind: 'duration', ms: 12 * MIN + 4000, caption: 'left', long: false }, off)).toBe('12 min left');
    expect(readoutText({ kind: 'duration', ms: 59000, caption: 'left', long: false }, off)).toBe('0:59 left');
    expect(readoutText({ kind: 'duration', ms: 14 * 60 * MIN + 22 * MIN + 10000, caption: 'until school starts', long: true }, off))
      .toBe('14h 22m until school starts');
    expect(readoutText({ kind: 'duration', ms: 62 * 60 * MIN, caption: 'until Mon, Nov 2', long: true }, off))
      .toBe('2d 14h until Mon, Nov 2');
  });
});

describe('readoutValue', () => {
  it('in a Segment: time left, time since it started, current time', () => {
    const now = tue(10, 32);
    expect(valuesAt(now)).toEqual({
      countdown: { kind: 'duration', ms: 43 * MIN, caption: 'left', long: false },
      countup: { kind: 'duration', ms: 2 * MIN, caption: 'since start', long: false },
      clock: { kind: 'time', at: now },
    });
  });

  it("in a Passing Period: both counting modes show the Passing Period's remaining time, until the next Segment", () => {
    // Nutrition ends 10:25; Period 3 starts 10:30.
    const now = tue(10, 27, 20);
    const remaining = { kind: 'duration', ms: 2 * MIN + 40 * 1000, caption: 'until Period 3', long: false };
    expect(valuesAt(now)).toEqual({ countdown: remaining, countup: remaining, clock: { kind: 'time', at: now } });
  });

  it('before school: until school starts, since the last School Day ended', () => {
    // Monday 10/26 ended 15:10; Tuesday starts 8:30.
    const now = tue(8, 0);
    const { countdown, countup } = valuesAt(now);
    expect(countdown).toEqual({ kind: 'duration', ms: 30 * MIN, caption: 'until school starts', long: true });
    expect(countup).toEqual({ kind: 'duration', ms: (16 * 60 + 50) * MIN, caption: 'since school ended', long: true });
  });

  it('after school: until the Next School Day (named by its date), since school ended', () => {
    const now = tue(16, 0);
    const { countdown, countup } = valuesAt(now);
    // Wed 10/28 starts 8:30.
    expect(countdown).toEqual({ kind: 'duration', ms: (16 * 60 + 30) * MIN, caption: 'until Wed, Oct 28', long: true });
    expect(countup).toEqual({ kind: 'duration', ms: 50 * MIN, caption: 'since school ended', long: true });
  });

  it('on a day off: until the Next School Day, since school ended', () => {
    // Sat 10/31 noon; Fri 10/30 ended 15:10; Mon 11/2 starts 8:30.
    const now = new Date(2026, 9, 31, 12, 0);
    const { countdown, countup } = valuesAt(now);
    expect(countdown).toMatchObject({ caption: 'until Mon, Nov 2', long: true });
    expect(countdown.ms).toBeGreaterThan(44 * 60 * MIN);
    expect(countup).toMatchObject({ caption: 'since school ended', ms: (20 * 60 + 50) * MIN });
  });

  it('in Summer with next year unknown: nothing to count down to, so the current time', () => {
    const now = new Date(2027, 6, 1, 12, 0);
    const { countdown, countup } = valuesAt(now);
    expect(countdown).toEqual({ kind: 'time', at: now });
    expect(countup.ms).toBeGreaterThan(0);
  });

  it('on a date outside every School Year: every mode is the current time', () => {
    const now = new Date(2020, 0, 1, 9, 0);
    expect(valuesAt(now)).toEqual({
      countdown: { kind: 'time', at: now }, countup: { kind: 'time', at: now }, clock: { kind: 'time', at: now },
    });
  });
});

describe('readoutParts (what the page draws)', () => {
  it('splits a countdown into its amount and caption, and counts its glyphs for the size rule', () => {
    expect(readoutParts({ kind: 'duration', ms: 42 * MIN + 17000, caption: 'left', long: false })).toEqual({
      amount: '42:17', caption: 'left',
      pieces: [{ text: '42:17', small: false }],
      glyphs: { digits: 4, colons: 1, letters: 0 },
    });
  });

  it('sets letters (and the space before them) small: "42 min", "1h 05m", "4d 17h"', () => {
    const off = { seconds: false };
    expect(readoutParts({ kind: 'duration', ms: 42 * MIN, caption: 'left', long: false }, off).pieces)
      .toEqual([{ text: '42', small: false }, { text: ' min', small: true }]);
    const hourly = readoutParts({ kind: 'duration', ms: 65 * MIN, caption: 'since start', long: false }, off);
    expect(hourly.pieces).toEqual([
      { text: '1', small: false }, { text: 'h', small: true }, { text: ' 05', small: false }, { text: 'm', small: true },
    ]);
    expect(hourly.glyphs).toEqual({ digits: 3, colons: 0, letters: 2 });
    expect(readoutParts({ kind: 'duration', ms: (4 * 24 + 17) * 60 * MIN, caption: 'until Mon, Nov 30', long: true }).amount)
      .toBe('4d 17h');
  });

  it('gives the current time the caption "now", with full-size seconds and a small AM/PM', () => {
    const parts = readoutParts({ kind: 'time', at: tue(10, 12, 43) });
    expect(parts).toEqual({
      amount: '10:12:43 AM', caption: 'now',
      pieces: [{ text: '10:12:43', small: false }, { text: ' AM', small: true }],
      glyphs: { digits: 6, colons: 2, letters: 2 },
    });
    expect(readoutParts({ kind: 'time', at: tue(13, 4, 9) }, { use24Hour: true, seconds: false }).pieces)
      .toEqual([{ text: '13:04', small: false }]);
  });
});
