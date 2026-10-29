import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';

/** A real clock the test moves by hand; the page's ticks come from fake timers. */
function fakeRealClock(date) {
  let t = date.getTime();
  return {
    now: () => t,
    /** Time passes and the page's timers fire as usual. */
    advance: (ms) => { t += ms; vi.advanceTimersByTime(ms); },
    /** Time passes with no timers firing, like a sleeping or throttled tab. */
    jump: (ms) => { t += ms; },
  };
}

const pageText = () => document.getElementById('clockApp').textContent.replace(/\s+/g, ' ');

describe('School Clock page', () => {
  let app;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="clockApp"></div>';
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.useRealTimers();
  });

  it('shows the Day Label, the current Period, its times, and time left and elapsed', () => {
    // Tue 2026-10-27 is an All Day.
    const real = fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));
    app = initClockApp({ realNow: real.now });

    const text = pageText();
    expect(text).toContain('All Day');
    expect(text).toContain('Period 3');
    expect(text).toContain('10:30 AM – 11:15 AM');
    expect(text).toContain('43:00 left');
    expect(text).toContain('2:00 elapsed');
    expect(text).toContain('10:32:00 AM');
    expect(text).not.toContain('Simulated time');
  });

  it('ticks every second, recomputing from the clock rather than counting ticks', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));
    app = initClockApp({ realNow: real.now });

    real.advance(1000);
    expect(pageText()).toContain('42:59 left');

    // A sleeping tab: 10 minutes pass with no ticks, then a single tick fires.
    real.jump(10 * 60 * 1000);
    real.advance(1000);
    expect(pageText()).toContain('32:58 left');
  });

  it('counts down a Passing Period and says what is up next', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 10, 27, 20));
    app = initClockApp({ realNow: real.now });

    const text = pageText();
    expect(text).toContain('Passing Period');
    expect(text).toContain('2:40 left');
    expect(text).toContain('Up next: Period 3 at 10:30 AM');
  });

  it('says it is after school, and for how long', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 16, 0, 0));
    app = initClockApp({ realNow: real.now });

    const text = pageText();
    expect(text).toContain('All Day');
    expect(text).toContain('After school');
    expect(text).toContain('School ended at 3:10 PM');
    expect(text).not.toContain('left');
  });

  it('says it is before school, and when the first Segment starts', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 8, 0, 0));
    app = initClockApp({ realNow: real.now });

    const text = pageText();
    expect(text).toContain('Before school');
    expect(text).toContain('Up next: Period 1 at 8:30 AM');
    expect(text).toContain('30:00 until school starts');
  });

  it('labels a weekend', () => {
    const real = fakeRealClock(new Date(2026, 9, 31, 10, 0, 0));
    app = initClockApp({ realNow: real.now });
    expect(pageText()).toContain('Weekend');
  });

  it('on a day off, names it, says when the Next School Day starts, and how long since school ended', () => {
    // Wed 11/25/26, Thanksgiving Break. School ended Thu 11/19 at 3:10 PM
    // (Fri 11/20 was In-Service); it's back Mon 11/30 at 8:30 AM.
    const real = fakeRealClock(new Date(2026, 10, 25, 10, 0, 0));
    app = initClockApp({ realNow: real.now });

    const text = pageText();
    expect(text).toContain('Thanksgiving Break');
    expect(text).toContain('Next school day: Mon, Nov 30 · starts in 4d 22h');
    expect(text).toContain('5d 18h since school ended');
  });

  it('after school, says when the Next School Day starts', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 16, 0, 0));
    app = initClockApp({ realNow: real.now });
    expect(pageText()).toContain('Next school day: Wed, Oct 28 · starts in 16:30:00');
  });

  it('before school, says how long since the last School Day ended', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 8, 0, 0));
    app = initClockApp({ realNow: real.now });
    // Since Mon 10/26 at 3:10 PM.
    expect(pageText()).toContain('16:50:00 since school ended');
  });

  it('names HS Experience Week and points past it', () => {
    // Wed 1/20/27; HS is back Mon 1/25/27.
    const real = fakeRealClock(new Date(2027, 0, 20, 10, 0, 0));
    app = initClockApp({ realNow: real.now });
    const text = pageText();
    expect(text).toContain('HS Experience Week');
    expect(text).toContain('Next school day: Mon, Jan 25 ·');
  });

  describe('Summer', () => {
    it('counts the days of Summer, with no countdown until next year is known', () => {
      // Fri 5/28/27, the day after the last School Day.
      const real = fakeRealClock(new Date(2027, 4, 28, 10, 0, 0));
      app = initClockApp({ realNow: real.now });

      const text = pageText();
      expect(text).toContain('Day 2 of Summer');
      expect(text).not.toContain('First day');
      expect(text).not.toContain('Next school day');
    });

    it('counts down to the first day once next year is registered', () => {
      const nextYear = {
        id: '2027-28',
        start: '2027-08-16',
        end: '2028-05-26',
        bellSchedules: {
          all: { name: 'All Day', segments: [{ name: 'Period 1', kind: 'period', start: '08:30', end: '09:20' }] },
        },
        weekdayDefaults: { 1: 'all', 2: 'all', 3: 'all', 4: 'all', 5: 'all' },
        calendarExceptions: [],
      };
      const real = fakeRealClock(new Date(2027, 4, 28, 10, 0, 0));
      app = initClockApp({ realNow: real.now, schoolYears: [...SCHOOL_YEARS, nextYear] });

      const text = pageText();
      expect(text).toContain('Day 2 of Summer');
      expect(text).toContain('First day: Mon, Aug 16 · starts in 79d 22h');
    });
  });

  it('just tells the time on a date outside every School Year', () => {
    const real = fakeRealClock(new Date(2030, 0, 1, 9, 0, 0));
    app = initClockApp({ realNow: real.now });
    expect(pageText().trim()).toBe('9:00:00 AM');
  });

  describe('simulated time', () => {
    it('starts at ?at=, shows a banner with the spoofed time, and ticks from there', () => {
      const real = fakeRealClock(new Date(2026, 9, 28, 20, 0, 0));
      app = initClockApp({ realNow: real.now, search: '?at=2026-10-27T10:32' });

      expect(pageText()).toContain('Simulated time: Tue, Oct 27, 2026, 10:32:00 AM');
      expect(pageText()).toContain('Period 3');
      expect(pageText()).toContain('43:00 left');

      real.advance(1000);
      expect(pageText()).toContain('Simulated time: Tue, Oct 27, 2026, 10:32:01 AM');
      expect(pageText()).toContain('42:59 left');
    });

    it('advances at &speed= times real time', () => {
      const real = fakeRealClock(new Date(2026, 9, 28, 20, 0, 0));
      app = initClockApp({ realNow: real.now, search: '?at=2026-10-27T10:32&speed=60' });

      real.advance(3000);
      expect(pageText()).toContain('10:35:00 AM');
      expect(pageText()).toContain('40:00 left');
    });

    it('ignores an invalid ?at= and shows real time with no banner', () => {
      const real = fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));
      app = initClockApp({ realNow: real.now, search: '?at=whenever&speed=60' });

      expect(pageText()).not.toContain('Simulated time');
      expect(pageText()).toContain('43:00 left');
      real.advance(1000);
      expect(pageText()).toContain('42:59 left');
    });
  });

  it('stops ticking when destroyed, and a second init replaces the first', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));
    const first = initClockApp({ realNow: real.now });
    app = initClockApp({ realNow: real.now });
    first.destroy();
    expect(vi.getTimerCount()).toBe(1);
    app.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts itself on the real page, where the mount exists when the script loads', async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 10, 32, 0));
    vi.resetModules();
    const fresh = await import('../../clock/clock.js');

    expect(pageText()).toContain('43:00 left');
    // The self-started clock is the active one; a new init replaces it.
    app = fresh.initClockApp();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('does nothing without its mount', () => {
    document.body.innerHTML = '';
    expect(initClockApp({ realNow: () => 0 })).toBeNull();
  });

  describe('next rings today', () => {
    const ringLines = () =>
      [...document.querySelectorAll('#clockApp li')].map((li) => li.textContent);

    it('lists every upcoming ring of the sample settings with its time, source and sound', () => {
      // Wed 10/28/26, HS Even Day: Period 6 13:45–15:10 is the last Segment.
      const real = fakeRealClock(new Date(2026, 9, 28, 13, 40, 0));
      app = initClockApp({ realNow: real.now });

      expect(pageText()).toContain('Next rings today');
      expect(ringLines()).toEqual([
        '1:40 PM · Bell · Lunch ends · School bell',
        '1:45 PM · Bell · Period 6 starts · School bell',
        '2:27:30 PM · Period Alarm · Mid-period walk · Period 6, halfway · Buzzer',
        '3:05 PM · Period Alarm · Period 6, 5 min before the end · Beep',
        '3:10 PM · Bell · Period 6 ends · School bell',
      ]);
    });

    it('drops a ring once its moment has passed, and drops the list when nothing is left', () => {
      const real = fakeRealClock(new Date(2026, 9, 27, 15, 9, 59));
      app = initClockApp({ realNow: real.now });
      expect(ringLines()).toEqual(['3:10 PM · Bell · Period 7 ends · School bell']);

      real.advance(1000); // 3:10:00, the ring's own moment
      expect(ringLines()).toHaveLength(1);
      real.advance(1000);
      expect(ringLines()).toEqual([]);
      expect(pageText()).not.toContain('Next rings today');
    });

    it('names a shared-edge Bell once, a Clock Alarm by its label and repeat, and the timer', () => {
      const settings = {
        bells: { on: true, sound: 'chime' },
        alarms: [
          { id: 'c1', kind: 'clock', label: 'Exit tickets', enabled: true, sound: 'chime', bellSchedules: null,
            time: '10:05', repeat: 'everySchoolDay' },
          { id: 'c2', kind: 'clock', enabled: true, sound: 'beep', bellSchedules: null,
            time: '10:07', repeat: 'once', date: '2026-10-27' },
          { id: 'p1', kind: 'period', enabled: true, sound: 'buzzer', bellSchedules: null,
            anchor: { from: 'start', minutes: 40 }, periods: ['Period 2'] },
        ],
        timerEndsAt: new Date(2026, 9, 27, 10, 8, 0).getTime(),
        timerSound: 'beep',
      };
      const real = fakeRealClock(new Date(2026, 9, 27, 10, 0, 0));
      app = initClockApp({ realNow: real.now, settings });

      expect(ringLines().slice(0, 5)).toEqual([
        '10:05 AM · Clock Alarm · Exit tickets, every School Day · Chime',
        '10:05 AM · Period Alarm · Period 2, minute 40 · Buzzer',
        '10:07 AM · Clock Alarm · once · Beep',
        '10:08 AM · Timer · Beep',
        '10:10 AM · Bell · Period 2 ends, Nutrition starts · Chime',
      ]);
    });

    describe('a "once" Clock Alarm', () => {
      const onceAt = (time) => ({
        bells: { on: false, sound: 'chime' },
        alarms: [{ id: 'o', kind: 'clock', enabled: true, sound: 'chime', bellSchedules: null,
          time, repeat: 'once', date: '2026-10-27' }],
      });

      it('is turned off once it rings in real time', () => {
        const real = fakeRealClock(new Date(2026, 9, 27, 10, 59, 58));
        const onSettingsChange = vi.fn();
        app = initClockApp({ realNow: real.now, settings: onceAt('11:00'), onSettingsChange });

        real.advance(1000);
        expect(onSettingsChange).not.toHaveBeenCalled();
        real.advance(2000);
        expect(onSettingsChange).toHaveBeenCalledTimes(1);
        expect(onSettingsChange.mock.calls[0][0].alarms[0]).toMatchObject({ id: 'o', enabled: false });
        real.advance(5000);
        expect(onSettingsChange).toHaveBeenCalledTimes(1);
      });

      it('rings and drops off the list with nobody listening for settings changes', () => {
        const real = fakeRealClock(new Date(2026, 9, 27, 10, 59, 59));
        app = initClockApp({ realNow: real.now, settings: onceAt('11:00') });
        real.advance(2000);
        expect(ringLines()).toEqual([]);
        expect(pageText()).toContain('11:00:01 AM');
      });

      it('is not turned off when it rings in simulated time', () => {
        const real = fakeRealClock(new Date(2026, 9, 1, 12, 0, 0));
        const onSettingsChange = vi.fn();
        app = initClockApp({
          realNow: real.now, search: '?at=2026-10-27T10:59:58', settings: onceAt('11:00'), onSettingsChange,
        });
        expect(ringLines()).toEqual(['11:00 AM · Clock Alarm · once · Chime']);

        real.advance(5000);
        expect(ringLines()).toEqual([]);
        expect(onSettingsChange).not.toHaveBeenCalled();
      });
    });
  });
});
