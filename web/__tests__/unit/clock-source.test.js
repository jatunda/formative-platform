import { describe, it, expect } from 'vitest';
import { createClockSource } from '../../clock/clock-source.js';

const SEC = 1000;

/** A stand-in for the real clock that the test moves by hand. */
function fakeRealClock(startMs) {
  let t = startMs;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

const REAL_START = new Date(2026, 9, 27, 13, 0).getTime();

describe('createClockSource', () => {
  it('tells real time when the URL has no simulated time', () => {
    const real = fakeRealClock(REAL_START);
    const clock = createClockSource({ search: '', realNow: real.now });

    expect(clock.simulated).toBe(false);
    expect(clock.now()).toBe(REAL_START);
    real.advance(5 * SEC);
    expect(clock.now()).toBe(REAL_START + 5 * SEC);
  });

  it('starts at ?at= as a local date-time and ticks forward in real time', () => {
    const real = fakeRealClock(REAL_START);
    const clock = createClockSource({ search: '?at=2027-01-20T09:50', realNow: real.now });

    expect(clock.simulated).toBe(true);
    expect(clock.now()).toBe(new Date(2027, 0, 20, 9, 50).getTime());
    real.advance(3 * SEC);
    expect(clock.now()).toBe(new Date(2027, 0, 20, 9, 50, 3).getTime());
  });

  it('accepts seconds in ?at=', () => {
    const clock = createClockSource({ search: '?at=2027-01-20T09:50:30', realNow: () => REAL_START });
    expect(clock.now()).toBe(new Date(2027, 0, 20, 9, 50, 30).getTime());
  });

  it('runs &speed= times faster than real time', () => {
    const real = fakeRealClock(REAL_START);
    const clock = createClockSource({ search: '?at=2027-01-20T09:50&speed=60', realNow: real.now });

    real.advance(2 * SEC);
    expect(clock.now()).toBe(new Date(2027, 0, 20, 9, 52).getTime());
  });

  it.each([
    ['not a date', '?at=soon'],
    ['an impossible date', '?at=2027-02-30T09:50'],
    ['an impossible time', '?at=2027-01-20T25:00'],
    ['a date with no time', '?at=2027-01-20'],
    ['an empty value', '?at='],
  ])('ignores ?at= that is %s and tells real time', (_, search) => {
    const clock = createClockSource({ search, realNow: () => REAL_START });
    expect(clock.simulated).toBe(false);
    expect(clock.now()).toBe(REAL_START);
  });

  it.each([
    ['not a number', 'fast'],
    ['zero', '0'],
    ['negative', '-5'],
    ['empty', ''],
  ])('ignores &speed= that is %s and runs at normal speed', (_, speed) => {
    const real = fakeRealClock(REAL_START);
    const clock = createClockSource({ search: `?at=2027-01-20T09:50&speed=${speed}`, realNow: real.now });

    real.advance(2 * SEC);
    expect(clock.simulated).toBe(true);
    expect(clock.now()).toBe(new Date(2027, 0, 20, 9, 50, 2).getTime());
  });

  it('ignores &speed= without ?at=', () => {
    const real = fakeRealClock(REAL_START);
    const clock = createClockSource({ search: '?speed=60', realNow: real.now });
    real.advance(2 * SEC);
    expect(clock.simulated).toBe(false);
    expect(clock.now()).toBe(REAL_START + 2 * SEC);
  });

  it('defaults to the real clock and no query string', () => {
    const clock = createClockSource();
    expect(clock.simulated).toBe(false);
    expect(Math.abs(clock.now() - Date.now())).toBeLessThan(1000);
  });
});
