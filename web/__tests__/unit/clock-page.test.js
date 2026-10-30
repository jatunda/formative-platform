import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { BLOCK_DAYS, DEFAULT_ALARM_PERIODS } from '../../clock/clock-settings.js';
import { SCHOOL_YEARS } from '../../clock/school-years.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { field, setValue, toggle } from '../helpers/clock-dom.js';

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
/** Just the clock's stage (heading, Readouts, the line under them), without the top bar or the panels. */
const displayText = () => document.querySelector('#clockApp .clock-stage').textContent.replace(/\s+/g, ' ').trim();
/** The Day Label and date at the top left. */
const dayText = () => document.querySelector('#clockApp .clock-day').textContent.replace(/\s+/g, ' ').trim();
const headingText = () => document.querySelector('#clockApp h1').textContent.replace(/\s+/g, ' ').trim();
/** Each Readout's text, value then caption ("43:00 left"), in layout order. */
const readoutTexts = () => [...document.querySelectorAll('#clockApp .clock-readout__face')]
  .map((face) => face.textContent.replace(/\s+/g, ' ').trim());
/** A control by its accessible name (its aria-label, else its text). */
const control = (name) => [...document.querySelectorAll('#clockApp button')]
  .find((b) => (b.getAttribute('aria-label') ?? b.textContent.replace(/\s+/g, ' ').trim()) === name && !b.closest('[hidden]'));

/** Fake device storage already holding `settings` (as the page would have saved them). */
const storageWith = (settings) => createFakeStorage({ [SETTINGS_KEY]: JSON.stringify(settings) });
/** What the page has saved to `storage`. */
const saved = (storage) => JSON.parse(storage.getItem(SETTINGS_KEY));

/**
 * Start the page on a device that already chose HS (plus any other saved
 * `settings`), so the tests that aren't about the first visit skip the prompt.
 */
const start = ({ settings = {}, ...options } = {}) =>
  initClockApp({
    storage: storageWith({ division: 'HS', ...settings }), tabStorage: createFakeStorage(), ...options,
  });

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

  it('shows the Day Label and date, the current Period as the heading, and a Readout of time left', () => {
    // Tue 2026-10-27 is an All Day.
    const real = fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));
    app = start({ realNow: real.now });

    expect(dayText()).toBe('All Day · Tue, Oct 27');
    expect(headingText()).toBe('Period 3');
    expect(readoutTexts()).toEqual(['43:00 left']);
    expect(pageText()).not.toContain('Simulated time');
  });

  it('opens the timer from the top bar and closes it again', () => {
    app = start({ realNow: fakeRealClock(new Date(2026, 9, 27, 10, 32, 0)).now });
    const panel = () => document.querySelector('#clockApp section[aria-label="Timer"]');
    expect(panel().hidden).toBe(true);

    control('Timer').click();
    expect(panel().hidden).toBe(false);
    expect(control('Timer').getAttribute('aria-expanded')).toBe('true');
    expect(control('Timer').getAttribute('aria-controls')).toBe(panel().id);

    control('Timer').click();
    expect(panel().hidden).toBe(true);
    expect(control('Timer').getAttribute('aria-expanded')).toBe('false');
  });

  it('has no plain time line duplicating a current-time Readout', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));
    app = start({ realNow: real.now });
    expect(pageText()).not.toContain('10:32');
    document.querySelector('#clockApp .clock-readout__face').click();
    document.querySelector('#clockApp .clock-readout__face').click();
    expect(readoutTexts()).toEqual(['10:32:00 AM now']);
    expect(pageText().match(/10:32:00/g)).toHaveLength(1);
  });

  it('ticks every second, recomputing from the clock rather than counting ticks', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));
    app = start({ realNow: real.now });

    real.advance(1000);
    expect(pageText()).toContain('42:59 left');

    // A sleeping tab: 10 minutes pass with no ticks, then a single tick fires.
    real.jump(10 * 60 * 1000);
    real.advance(1000);
    expect(pageText()).toContain('32:58 left');
  });

  it('counts down a Passing Period and says what is up next', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 10, 27, 20));
    app = start({ realNow: real.now });

    expect(headingText()).toBe('Passing Period');
    expect(readoutTexts()).toEqual(['2:40 until Period 3']);
    expect(displayText()).toContain('Up next Period 3 10:30 AM');
  });

  it('says it is after school, for how long, and when the Next School Day starts', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 16, 0, 0));
    app = start({ realNow: real.now });

    expect(dayText()).toBe('All Day · Tue, Oct 27');
    expect(headingText()).toBe('After school');
    expect(readoutTexts()).toEqual(['50:00 since school ended']);
    expect(displayText()).toContain('Next: Wed, Oct 28 · Even Day · starts in 16h 30m');
  });

  it('says it is before school, and when the first Segment starts', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 8, 0, 0));
    app = start({ realNow: real.now });

    expect(headingText()).toBe('Before school');
    expect(displayText()).toContain('Up next Period 1 8:30 AM');
    expect(readoutTexts()).toEqual(['30:00 until school starts']);
  });

  it('labels a weekend, and says when school is back', () => {
    const real = fakeRealClock(new Date(2026, 9, 31, 10, 0, 0));
    app = start({ realNow: real.now });
    expect(headingText()).toBe('Weekend');
    expect(dayText()).toBe('Sat, Oct 31');
    expect(displayText()).toContain('Back Mon, Nov 2 · All Day');
  });

  it('on a day off, names it, counts down to the Next School Day, and can count since school ended', () => {
    // Wed 11/25/26, Thanksgiving Break. School ended Thu 11/19 at 3:10 PM
    // (Fri 11/20 was In-Service); it's back Mon 11/30 at 8:30 AM.
    const real = fakeRealClock(new Date(2026, 10, 25, 10, 0, 0));
    app = start({ realNow: real.now });

    expect(headingText()).toBe('Thanksgiving Break');
    expect(dayText()).toBe('Wed, Nov 25');
    expect(readoutTexts()).toEqual(['4d 22h until Mon, Nov 30']);
    expect(displayText()).toContain('Back Mon, Nov 30 · All Day');
    document.querySelector('#clockApp .clock-readout__face').click();
    expect(readoutTexts()).toEqual(['5d 18h since school ended']);
  });

  it('before school, a Readout can count since the last School Day ended', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 8, 0, 0));
    app = start({ realNow: real.now });
    document.querySelector('#clockApp .clock-readout__face').click();
    // Since Mon 10/26 at 3:10 PM.
    expect(readoutTexts()).toEqual(['16:50:00 since school ended']);
  });

  it('names HS Experience Week and points past it', () => {
    // Wed 1/20/27; HS is back Mon 1/25/27.
    const real = fakeRealClock(new Date(2027, 0, 20, 10, 0, 0));
    app = start({ realNow: real.now });
    expect(headingText()).toBe('HS Experience Week');
    expect(dayText()).toBe('Wed, Jan 20');
    expect(displayText()).toContain('Enjoy the trips · back Mon, Jan 25');
  });

  describe('Summer', () => {
    it('counts the days of Summer, with no countdown until next year is known', () => {
      // Fri 5/28/27, the day after the last School Day.
      const real = fakeRealClock(new Date(2027, 4, 28, 10, 0, 0));
      app = start({ realNow: real.now });

      expect(headingText()).toBe('Day 2 of Summer');
      expect(dayText()).toBe('Fri, May 28');
      expect(displayText()).toContain('Have a great summer');
      expect(displayText()).not.toContain('back');
    });

    it('is a plain clock with no next year: the Readout shows the time, never a dash', () => {
      const real = fakeRealClock(new Date(2027, 4, 28, 10, 0, 0));
      app = start({ realNow: real.now });
      expect(readoutTexts()).toEqual(['10:00:00 AM now']);
      expect(pageText()).not.toContain('—');
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
      app = start({ realNow: real.now, schoolYears: [...SCHOOL_YEARS, nextYear] });

      expect(headingText()).toBe('Day 2 of Summer');
      expect(readoutTexts()).toEqual(['79d 22h until Mon, Aug 16']);
      expect(displayText()).toContain('Have a great summer · back Mon, Aug 16');
    });
  });

  it('just tells the time on a date outside every School Year, and says why', () => {
    const real = fakeRealClock(new Date(2030, 0, 1, 9, 0, 0));
    app = start({ realNow: real.now });
    expect(headingText()).toBe('Tue, Jan 1, 2030');
    expect(readoutTexts()).toEqual(['9:00:00 AM now']);
    expect(displayText()).toContain('No school calendar for this date yet');
    // Nothing to cycle or arrange: the time is all there is.
    expect(control('Readouts')).toBeUndefined();
    expect(document.querySelector('#clockApp button.clock-readout__face')).toBeNull();
  });

  describe('simulated time', () => {
    it('starts at ?at=, shows a banner with the spoofed time, and ticks from there', () => {
      const real = fakeRealClock(new Date(2026, 9, 28, 20, 0, 0));
      app = start({ realNow: real.now, search: '?at=2026-10-27T10:32' });

      const banner = () => document.querySelector('#clockApp .clock-banner').textContent.trim();
      expect(banner()).toBe('Simulated time · Tue, Oct 27, 10:32:00 AM · this tab only');
      expect(headingText()).toBe('Period 3');
      expect(pageText()).toContain('43:00 left');

      real.advance(1000);
      expect(banner()).toBe('Simulated time · Tue, Oct 27, 10:32:01 AM · this tab only');
      expect(pageText()).toContain('42:59 left');
    });

    it('advances at &speed= times real time', () => {
      const real = fakeRealClock(new Date(2026, 9, 28, 20, 0, 0));
      app = start({ realNow: real.now, search: '?at=2026-10-27T10:32&speed=60' });

      real.advance(3000);
      expect(pageText()).toContain('10:35:00 AM · this tab only');
      expect(pageText()).toContain('40:00 left');
    });

    it('ignores an invalid ?at= and shows real time with no banner', () => {
      const real = fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));
      app = start({ realNow: real.now, search: '?at=whenever&speed=60' });

      expect(pageText()).not.toContain('Simulated time');
      expect(pageText()).toContain('43:00 left');
      real.advance(1000);
      expect(pageText()).toContain('42:59 left');
    });
  });

  it('stops ticking when destroyed, and a second init replaces the first', () => {
    const real = fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));
    const first = start({ realNow: real.now });
    app = start({ realNow: real.now });
    first.destroy();
    expect(vi.getTimerCount()).toBe(1);
    app.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts itself on the real page, where the mount exists when the script loads', async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 10, 32, 0));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ division: 'HS' }));
    try {
      vi.resetModules();
      const fresh = await import('../../clock/clock.js');

      // It reads the device's real localStorage.
      expect(pageText()).toContain('43:00 left');
      // The self-started clock is the active one; a new init replaces it.
      app = fresh.initClockApp();
      expect(vi.getTimerCount()).toBe(1);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
    }
  });

  it('does nothing without its mount, not even opening an audio context', () => {
    document.body.innerHTML = '';
    const AudioContext = vi.fn();
    vi.stubGlobal('AudioContext', AudioContext);
    try {
      expect(initClockApp({ realNow: () => 0 })).toBeNull();
      expect(AudioContext).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  describe('next rings today', () => {
    const ringLines = () =>
      [...document.querySelectorAll('#clock-settings li')].map((li) => li.textContent);

    it('lists every upcoming ring of the saved Bells and Alarms with its time, source and sound', () => {
      const settings = {
        bells: { on: true, sound: 'schoolBell' },
        alarms: [
          { id: 'check-email', kind: 'clock', label: 'Check email', enabled: true, sound: 'chime',
            bellSchedules: null, time: '08:20', repeat: 'everySchoolDay' },
          { id: 'wrap-up', kind: 'period', enabled: true, sound: 'beep', bellSchedules: null,
            anchor: { from: 'end', minutes: 5 }, periods: [...DEFAULT_ALARM_PERIODS] },
          { id: 'walk', kind: 'period', label: 'Mid-period walk', enabled: true, sound: 'buzzer',
            bellSchedules: [...BLOCK_DAYS], anchor: { from: 'halfway' }, periods: [...DEFAULT_ALARM_PERIODS] },
        ],
      };
      // Wed 10/28/26, HS Even Day: Period 6 13:45–15:10 is the last Segment.
      const real = fakeRealClock(new Date(2026, 9, 28, 13, 40, 0));
      app = start({ realNow: real.now, settings });

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
      app = start({ realNow: real.now });
      expect(ringLines()).toEqual(['3:10 PM · Bell · Period 7 ends · School bell']);

      real.advance(1000); // 3:10:00, the ring's own moment
      expect(ringLines()).toHaveLength(1);
      real.advance(1000);
      expect(ringLines()).toEqual([]);
      expect(document.getElementById('clock-settings-today').hidden).toBe(true);
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
      app = start({ realNow: real.now, settings });

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

      it('is turned off, and saved that way, once it rings in real time', () => {
        const real = fakeRealClock(new Date(2026, 9, 27, 10, 59, 58));
        const storage = storageWith({ division: 'HS', ...onceAt('11:00') });
        const setItem = vi.spyOn(storage, 'setItem');
        app = initClockApp({ realNow: real.now, storage });

        real.advance(1000);
        expect(setItem).not.toHaveBeenCalled();
        real.advance(2000);
        expect(setItem).toHaveBeenCalledTimes(1);
        expect(saved(storage).alarms[0]).toMatchObject({ id: 'o', enabled: false });
        expect(ringLines()).toEqual([]);
        real.advance(5000);
        expect(setItem).toHaveBeenCalledTimes(1);
      });

      it('is not turned off when it rings in simulated time', () => {
        const real = fakeRealClock(new Date(2026, 9, 1, 12, 0, 0));
        const storage = storageWith({ division: 'HS', ...onceAt('11:00') });
        const setItem = vi.spyOn(storage, 'setItem');
        app = initClockApp({ realNow: real.now, search: '?at=2026-10-27T10:59:58', storage });
        expect(ringLines()).toEqual(['11:00 AM · Clock Alarm · once · Chime']);

        real.advance(5000);
        expect(ringLines()).toEqual([]);
        expect(setItem).not.toHaveBeenCalled();
        expect(saved(storage).alarms[0].enabled).toBe(true);
      });
    });
  });

  describe('saved device settings', () => {
    const button = (name) => [...document.querySelectorAll('#clockApp button')].find((b) => b.textContent.trim() === name);
    /** The Division chosen in the Settings drawer ('MS' or 'HS'). */
    const chosenDivision = () => document.querySelector('#clockApp input[type="radio"]:checked')?.value;
    const chooseDivision = (name) => field(name).click();
    const labelInput = (period) => field(period);
    const use24HourBox = () => field('24-hour time');
    const isShown = (node) => !node.closest('[hidden]');

    // Wed 10/28/26 is an Even Day: at 10:30 HS is in Chapel, MS in Period 4.
    const evenDay = () => fakeRealClock(new Date(2026, 9, 28, 10, 30, 0));

    describe('the first visit', () => {
      it('asks for the Division and shows no Periods until it is chosen', () => {
        const real = evenDay();
        app = initClockApp({ realNow: real.now, storage: createFakeStorage() });

        expect(isShown(button('Middle School'))).toBe(true);
        expect(control('Settings')).toBeUndefined();
        expect(readoutTexts()).toEqual(['10:30:00 AM now']);
        real.advance(1000);
        expect(readoutTexts()).toEqual(['10:30:01 AM now']);
      });

      it('saves the chosen Division and follows its Bell Schedules', () => {
        const storage = createFakeStorage();
        app = initClockApp({ realNow: evenDay().now, storage });

        button('Middle School').click();

        expect(isShown(button('Middle School'))).toBe(false);
        expect(headingText()).toBe('Period 4');
        expect(chosenDivision()).toBe('MS');
        expect(saved(storage).division).toBe('MS');
      });

      it('is not asked again once a Division is saved', () => {
        app = start({ realNow: evenDay().now });
        expect(isShown(button('Middle School'))).toBe(false);
        expect(headingText()).toBe('Chapel');
      });

      it.each([
        ['corrupt', '{not json'],
        ['the wrong shape', '"HS"'],
      ])('treats %s saved data as a first visit, without throwing', (_, raw) => {
        app = initClockApp({ realNow: evenDay().now, storage: createFakeStorage({ [SETTINGS_KEY]: raw }) });
        expect(isShown(button('High School'))).toBe(true);
      });
    });

    it('switches Division in one step, saved, and follows that Division', () => {
      const storage = storageWith({ division: 'HS' });
      app = initClockApp({ realNow: evenDay().now, storage });
      expect(displayText()).toContain('Chapel');

      chooseDivision('Middle School');

      // MS Period 4 runs 10:15–11:40.
      expect(headingText()).toBe('Period 4');
      expect(readoutTexts()).toEqual(['1:10:00 left']);
      expect(saved(storage).division).toBe('MS');
    });

    it('shows the current Division on a chip at the end of the top bar, which opens Settings at the Division', () => {
      const real = fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));
      app = start({ realNow: real.now });
      const chip = control('Division: HS, switch Division');
      // "HS" shows; the rest is for screen readers.
      expect(chip.textContent).toBe('Division: HS, switch Division');
      expect([...chip.querySelectorAll('.visually-hidden')].map((n) => n.textContent)).toEqual(['Division: ', ', switch Division']);
      expect(isShown(field('High School'))).toBe(false);

      chip.click();
      expect(isShown(field('High School'))).toBe(true);
      expect(document.activeElement).toBe(field('High School'));
      chooseDivision('Middle School');
      expect(control('Division: MS, switch Division')).toBeDefined();
    });

    it("follows the Division's Calendar Exceptions (HS Experience Week, MS All Day)", () => {
      // Wed 1/20/27.
      const real = fakeRealClock(new Date(2027, 0, 20, 10, 32, 0));
      app = start({ realNow: real.now, settings: { division: 'MS' } });
      expect(dayText()).toBe('All Day · Wed, Jan 20');
      expect(headingText()).toBe('Period 3');

      chooseDivision('High School');
      expect(headingText()).toBe('HS Experience Week');
      expect(displayText()).not.toContain('Period 3');
    });

    describe('Period Labels', () => {
      const walk = {
        id: 'walk', kind: 'period', enabled: true, sound: 'buzzer', bellSchedules: null,
        anchor: { from: 'end', minutes: 5 }, periods: ['Period 3'],
      };

      it('shows a saved label on the current Period, its Bells and its Alarms', () => {
        // Tue 10/27/26 10:32, All Day Period 3.
        const real = fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));
        app = start({ realNow: real.now, settings: { periodLabels: { 'Period 3': 'AP CSA' }, alarms: [walk] } });

        expect(headingText()).toBe('Period 3 · AP CSA');
        const text = pageText();
        expect(text).toContain('11:10 AM · Period Alarm · Period 3 · AP CSA, 5 min before the end · Buzzer');
        expect(text).toContain('11:15 AM · Bell · Period 3 · AP CSA ends · School bell');
        expect(labelInput('Period 3').value).toBe('AP CSA');
      });

      it('shows a label typed in at once, in "up next" too, and saves it', () => {
        const storage = storageWith({ division: 'HS' });
        // Tue 10/27/26 10:27, the Passing Period before Period 3.
        app = initClockApp({ realNow: fakeRealClock(new Date(2026, 9, 27, 10, 27, 0)).now, storage });

        setValue('Period 3', 'AP CSA');

        expect(displayText()).toContain('Up next Period 3 · AP CSA 10:30 AM');
        expect(saved(storage).periodLabels).toEqual({ 'Period 3': 'AP CSA' });
      });

      it('keeps the label inputs (and so the typing) across ticks', () => {
        const real = fakeRealClock(new Date(2026, 9, 27, 10, 27, 0));
        app = start({ realNow: real.now });
        const input = labelInput('Seminar');
        real.advance(3000);
        expect(labelInput('Seminar')).toBe(input);
      });
    });

    describe('24-hour time', () => {
      it('is off by default, and turning it on shows every clock time in 24-hour form, saved', () => {
        const storage = storageWith({ division: 'HS' });
        // Tue 10/27/26 13:45, All Day Period 6 (13:35–14:20).
        app = initClockApp({ realNow: fakeRealClock(new Date(2026, 9, 27, 13, 45, 0)).now, storage });
        expect(use24HourBox().checked).toBe(false);
        const face = document.querySelector('#clockApp .clock-readout__face');
        face.click();
        face.click();
        expect(readoutTexts()).toEqual(['1:45:00 PM now']);

        toggle('24-hour time');

        expect(readoutTexts()).toEqual(['13:45:00 now']);
        expect(displayText()).not.toMatch(/AM|PM/);
        expect(saved(storage).use24Hour).toBe(true);
      });

      it('shows up next in 24-hour form when saved on, leaving durations alone', () => {
        // Tue 10/27/26 8:00, before school.
        const real = fakeRealClock(new Date(2026, 9, 27, 8, 0, 0));
        app = start({ realNow: real.now, settings: { use24Hour: true } });
        expect(use24HourBox().checked).toBe(true);
        expect(displayText()).toContain('Up next Period 1 08:30');
        expect(readoutTexts()).toEqual(['30:00 until school starts']);
      });

      it('shows the next rings in 24-hour form', () => {
        const real = fakeRealClock(new Date(2026, 9, 27, 15, 9, 0));
        app = start({ realNow: real.now, settings: { use24Hour: true } });
        expect(pageText()).toContain('15:10 · Bell · Period 7 ends · School bell');
      });
    });

    it('uses saved Bells and their sound', () => {
      const real = fakeRealClock(new Date(2026, 9, 27, 15, 9, 0));
      app = start({ realNow: real.now, settings: { bells: { on: true, sound: 'chime' } } });
      expect(pageText()).toContain('3:10 PM · Bell · Period 7 ends · Chime');
    });

    it('never listens for other tabs changing storage', () => {
      const listen = vi.spyOn(window, 'addEventListener');
      app = start({ realNow: evenDay().now });
      expect(listen.mock.calls.map(([type]) => type)).not.toContain('storage');
      listen.mockRestore();
    });
  });

  describe('Readouts', () => {
    const readouts = readoutTexts;
    const faces = () => [...document.querySelectorAll('#clockApp .clock-readout__face')];
    const tapReadout = (i) => faces()[i].click();
    const removeButtons = () => [...document.querySelectorAll('#clockApp button')]
      .filter((b) => b.textContent.replace(/\s+/g, ' ').trim().startsWith('Remove Readout') && !b.closest('[hidden]'));
    const addButton = () => control('Add Readout');
    const readoutsControl = () => control('Readouts') ?? control('Done');
    const editNote = () => document.querySelector('#clockApp .clock-edit-note');
    const isEditing = () => readoutsControl().getAttribute('aria-pressed') === 'true';
    const pressKey = (key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    // Tue 10/27/26 10:32, All Day Period 3 (10:30–11:15).
    const inPeriod3 = () => fakeRealClock(new Date(2026, 9, 27, 10, 32, 0));

    /** One device: shared localStorage (settings + last used layout), one sessionStorage per tab. */
    function device() {
      const storage = storageWith({ division: 'HS' });
      return {
        storage,
        newTab: () => ({ tabStorage: createFakeStorage(), open(realNow) {
          app = initClockApp({ realNow, storage, tabStorage: this.tabStorage });
          return this;
        } }),
      };
    }

    it('cycles a Readout on each tap: time left, time since it started, current time, and back', () => {
      app = start({ realNow: inPeriod3().now });
      expect(readouts()).toEqual(['43:00 left']);
      tapReadout(0);
      expect(readouts()).toEqual(['2:00 since start']);
      tapReadout(0);
      expect(readouts()).toEqual(['10:32:00 AM now']);
      tapReadout(0);
      expect(readouts()).toEqual(['43:00 left']);
    });

    it('each Readout is a button, so a tap, a click or Enter cycles it', () => {
      app = start({ realNow: inPeriod3().now });
      expect(faces()[0].tagName).toBe('BUTTON');
      expect(faces()[0].type).toBe('button');
    });

    it('keeps focus on a Readout as it cycles and ticks', () => {
      const real = inPeriod3();
      app = start({ realNow: real.now });
      faces()[0].focus();
      tapReadout(0);
      real.advance(1000);
      expect(document.activeElement).toBe(faces()[0]);
    });

    it('splits the value from its caption, and sets letters small for the size rule', () => {
      app = start({ realNow: inPeriod3().now });
      tapReadout(0);
      tapReadout(0);
      const value = document.querySelector('#clockApp .clock-readout--big .clock-readout__value');
      expect(value.textContent).toBe('10:32:00 AM');
      expect([...value.querySelectorAll('.clock-unit')].map((u) => u.textContent)).toEqual([' AM']);
      expect(value.style.getPropertyValue('--d')).toBe('6');
      expect(value.style.getPropertyValue('--c')).toBe('2');
      expect(value.style.getPropertyValue('--u')).toBe('2');
      expect(document.querySelector('#clockApp .clock-readout--big .clock-readout__caption').textContent).toBe('now');
    });

    describe('edit mode (adding and removing)', () => {
      it('is off at first: no Remove or Add buttons until the Readouts control is pressed', () => {
        app = start({ realNow: inPeriod3().now });
        expect(isEditing()).toBe(false);
        expect(readoutsControl().textContent.trim()).toBe('Readouts');
        expect(addButton()).toBeUndefined();
        expect(editNote().hidden).toBe(true);

        readoutsControl().click();
        expect(isEditing()).toBe(true);
        expect(readoutsControl().textContent.trim()).toBe('Done');
        expect(addButton()).toBeDefined();
        expect(editNote().hidden).toBe(false);
        expect(editNote().textContent).toBe('Tap a Readout to change what it shows');
        // One Readout can't be removed.
        expect(removeButtons()).toHaveLength(0);

        readoutsControl().click();
        expect(isEditing()).toBe(false);
        expect(addButton()).toBeUndefined();
      });

      it('adds Readouts in the modes not shown yet, up to three, then the Add slot goes', () => {
        app = start({ realNow: inPeriod3().now });
        readoutsControl().click();
        addButton().click();
        expect(readouts()).toEqual(['43:00 left', '2:00 since start']);
        addButton().click();
        expect(readouts()).toEqual(['43:00 left', '2:00 since start', '10:32:00 AM now']);
        expect(addButton()).toBeUndefined();
      });

      it('moves focus to a newly added Readout', () => {
        app = start({ realNow: inPeriod3().now });
        readoutsControl().click();
        addButton().click();
        expect(document.activeElement).toBe(faces()[1]);
      });

      it('marks the first Readout as the big one and puts the rest beside or below it', () => {
        app = start({ realNow: inPeriod3().now });
        readoutsControl().click();
        addButton().click();
        const shown = document.querySelectorAll('#clockApp .clock-readout');
        expect(shown[0].classList.contains('clock-readout--big')).toBe(true);
        expect(shown[1].classList.contains('clock-readout--big')).toBe(false);
        expect(shown[1].closest('.clock-smalls')).not.toBeNull();
        expect(document.querySelector('#clockApp .clock-readouts').classList.contains('has-smalls')).toBe(true);
      });

      it('names each Remove button by the Readout it removes', () => {
        app = start({ realNow: inPeriod3().now });
        readoutsControl().click();
        addButton().click();
        expect(removeButtons().map((b) => b.textContent.replace(/\s+/g, ' ').trim()))
          .toEqual(['Remove Readout: left', 'Remove Readout: since start']);
      });

      it('removes Readouts down to one (removing the big one promotes the next), moving focus on', () => {
        app = start({ realNow: inPeriod3().now });
        readoutsControl().click();
        addButton().click();
        addButton().click();
        expect(removeButtons()).toHaveLength(3);

        removeButtons()[0].click();
        expect(readouts()).toEqual(['2:00 since start', '10:32:00 AM now']);
        expect(document.activeElement).toBe(removeButtons()[0]);
        expect(document.querySelector('#clockApp .clock-readout--big').textContent).toContain('since start');

        removeButtons()[1].click();
        expect(readouts()).toEqual(['2:00 since start']);
        expect(removeButtons()).toHaveLength(0);
        expect(document.activeElement).toBe(readoutsControl());
      });

      it('moves focus to the last Remove button when the last Readout is removed', () => {
        app = start({ realNow: inPeriod3().now });
        readoutsControl().click();
        addButton().click();
        addButton().click();
        removeButtons()[2].click();
        expect(document.activeElement).toBe(removeButtons()[1]);
      });

      it('still cycles a Readout on tap while editing', () => {
        app = start({ realNow: inPeriod3().now });
        readoutsControl().click();
        tapReadout(0);
        expect(readouts()).toEqual(['2:00 since start']);
        expect(isEditing()).toBe(true);
      });

      it('Escape leaves edit mode and returns focus to the Readouts control', () => {
        app = start({ realNow: inPeriod3().now });
        readoutsControl().click();
        addButton().focus();
        pressKey('Escape');
        expect(isEditing()).toBe(false);
        expect(document.activeElement).toBe(readoutsControl());
        pressKey('Escape'); // nothing to leave
        expect(isEditing()).toBe(false);
      });

      it('ignores other keys', () => {
        app = start({ realNow: inPeriod3().now });
        readoutsControl().click();
        pressKey('Enter');
        expect(isEditing()).toBe(true);
      });

      it('is not saved: a reload is out of edit mode', () => {
        const { newTab } = device();
        const tab = newTab().open(inPeriod3().now);
        readoutsControl().click();
        app.destroy();
        tab.open(inPeriod3().now);
        expect(isEditing()).toBe(false);
      });

      it('stops listening for Escape once destroyed', () => {
        app = start({ realNow: inPeriod3().now });
        readoutsControl().click();
        const control = readoutsControl();
        app.destroy();
        app = null;
        pressKey('Escape');
        expect(control.getAttribute('aria-pressed')).toBe('true');
      });
    });

    it('keeps ticking each Readout', () => {
      const real = inPeriod3();
      app = start({ realNow: real.now });
      readoutsControl().click();
      addButton().click();
      real.advance(1000);
      expect(readouts()).toEqual(['42:59 left', '2:01 since start']);
    });

    it('keeps its place in the cycle as school ends', () => {
      // Period 7 is 14:25–15:10.
      const real = fakeRealClock(new Date(2026, 9, 27, 15, 9, 58));
      app = start({ realNow: real.now });
      readoutsControl().click();
      addButton().click();
      expect(readouts()).toEqual(['0:02 left', '44:58 since start']);
      real.advance(3000);
      expect(readouts()).toEqual(['17:19:59 until Wed, Oct 28', '0:01 since school ended']);
    });

    it('starts in the default for the moment: since school ended, after school', () => {
      app = start({ realNow: fakeRealClock(new Date(2026, 9, 27, 16, 0, 0)).now });
      expect(readouts()).toEqual(['50:00 since school ended']);
    });

    it('shows just the time, with nothing to arrange, before a Division is chosen or on a date outside every School Year', () => {
      app = initClockApp({ realNow: inPeriod3().now, storage: createFakeStorage(), tabStorage: createFakeStorage() });
      expect(readouts()).toEqual(['10:32:00 AM now']);
      expect(control('Readouts')).toBeUndefined();
      app.destroy();
      app = start({ realNow: fakeRealClock(new Date(2030, 0, 1, 9, 0, 0)).now });
      expect(readouts()).toEqual(['9:00:00 AM now']);
      expect(control('Readouts')).toBeUndefined();
    });

    it('keeps a layout per tab: two tabs differ, reloads restore their own, and a new tab starts from the last changed', () => {
      const { newTab } = device();
      const now = inPeriod3().now;

      const tabA = newTab().open(now);
      tapReadout(0); // A: elapsed
      app.destroy();

      const tabB = newTab().open(now);
      expect(readouts()).toEqual(['2:00 since start']); // starts from A's, the last used
      readoutsControl().click();
      addButton().click(); // B: since start + left
      tapReadout(1);
      tapReadout(1); // B: since start + current time
      app.destroy();

      tabA.open(now); // reloading A: its own layout, untouched by B
      expect(readouts()).toEqual(['2:00 since start']);
      app.destroy();

      tabB.open(now);
      expect(readouts()).toEqual(['2:00 since start', '10:32:00 AM now']);
      app.destroy();

      newTab().open(now); // a third tab: B changed last
      expect(readouts()).toEqual(['2:00 since start', '10:32:00 AM now']);
    });

    it('a tab keeps the layout it opened with through a reload, even after another tab changes', () => {
      const { newTab } = device();
      const now = inPeriod3().now;

      const tabA = newTab().open(now); // default layout, never changed
      app.destroy();
      newTab().open(now);
      tapReadout(0); // another tab changes the last used layout
      app.destroy();

      tabA.open(now);
      expect(readouts()).toEqual(['43:00 left']);
    });

    it('an open tab is not changed by another tab saving', () => {
      const { storage } = device();
      const real = inPeriod3();
      const tabStorage = createFakeStorage();
      app = initClockApp({ realNow: real.now, storage, tabStorage });
      // Another tab (sharing this device's localStorage) saves a different layout.
      storage.setItem('school-clock-layout-v1', JSON.stringify({ readouts: [{ mode: 'clock' }] }));
      real.advance(1000);
      expect(readouts()).toEqual(['42:59 left']);
    });
  });
});
