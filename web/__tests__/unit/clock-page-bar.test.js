import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';

const SEC = 1000;
const MIN = 60 * SEC;
const mount = () => document.getElementById('clockApp');
const isShown = (node) => !node.closest('[hidden]');
/** The bar: the bottom row's labelled section, if it shows. */
const bar = () => {
  const section = mount().querySelector('.clock-bottom section');
  return section && isShown(section) ? section : null;
};
const words = (node) => node.textContent.replace(/\s+/g, ' ').trim();
/** Each block's hidden text, as a screen reader hears the bar. */
const heard = () => [...bar().querySelectorAll('.clock-bar__track > li .visually-hidden')].map(words);
const progress = () => bar().querySelector('[role="progressbar"]');
const radio = (name) =>
  [...mount().querySelectorAll('label')].find((l) => l.textContent.trim() === name).querySelector('input');
const choose = (name) => {
  const input = radio(name);
  input.checked = true;
  input.dispatchEvent(new Event('change'));
};
const saved = (storage) => JSON.parse(storage.getItem(SETTINGS_KEY));

// Tue 2026-10-27 is an All Day: Period 3 runs 10:30–11:15, Period 7 ends 15:10.
const at = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s).getTime();

describe('School Clock bar', () => {
  let app;
  let t;
  let storage;

  function open({ when } = {}) {
    app?.destroy();
    if (when !== undefined) t = when;
    app = initClockApp({
      realNow: () => t, storage, tabStorage: createFakeStorage(),
      soundPlayer: createFakeSoundPlayer({ state: 'running' }), prefersReducedMotion: () => false,
      capabilities: { fullscreen: null, wakeLock: null, pictureInPicture: null },
    });
  }
  const advance = (ms) => { t += ms; vi.advanceTimersByTime(ms); };
  const withSettings = (settings) => {
    storage = createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ division: 'HS', ...settings }) });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    withSettings({ periodLabels: { 'Period 3': 'AP CSA' } });
    document.body.innerHTML = '<div id="clockApp"></div>';
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.useRealTimers();
  });

  describe('on whole day (the default)', () => {
    it("names today's Segments with their times and Period Labels, marking the current one", () => {
      open({ when: at(10, 39) });
      expect(bar().getAttribute('aria-label')).toBe("Today's Segments");
      expect(heard()).toEqual([
        'Period 1, 8:30 AM to 9:20 AM',
        'Period 2, 9:25 AM to 10:10 AM',
        'Nutrition, 10:10 AM to 10:25 AM',
        'Period 3 · AP CSA, 10:30 AM to 11:15 AM, now',
        'Period 4, 11:20 AM to 12:05 PM',
        'Period 5, 12:10 PM to 12:55 PM',
        'Lunch, 12:55 PM to 1:30 PM',
        'Period 6, 1:35 PM to 2:20 PM',
        'Period 7, 2:25 PM to 3:10 PM',
      ]);
    });

    it('shows the start times without seconds, the day\'s end and 24-hour time when set', () => {
      withSettings({ use24Hour: true });
      open({ when: at(10, 39, 30) });
      const times = [...bar().querySelectorAll('.clock-bar__time')].map(words);
      expect(times[0]).toBe('08:30');
      expect(words(bar().querySelector('.clock-bar__end'))).toBe('15:10');
    });

    it('marks Breaks and Assemblies by kind, so they can be patterned rather than coloured', () => {
      open({ when: at(10, 39) });
      const kinds = [...bar().querySelectorAll('.clock-bar__track > li')].map((li) => li.dataset.kind);
      expect(kinds).toEqual(['period', 'period', 'break', 'period', 'period', 'period', 'break', 'period', 'period']);
    });

    it("shows the current block's progress, without announcing it every tick", () => {
      open({ when: at(10, 39) });
      expect(progress().getAttribute('aria-label')).toBe('Period 3 progress');
      expect(progress().getAttribute('aria-valuenow')).toBe('20');
      const block = bar().querySelector('li');
      advance(9 * MIN);
      expect(progress().getAttribute('aria-valuenow')).toBe('40');
      // The same elements, only updated: focus and the screen reader's place survive.
      expect(bar().querySelector('li')).toBe(block);
      expect(mount().querySelector('.clock-bottom [aria-live]')).toBeNull();
    });

    it('during a Passing Period fills the gap and has the next block up next', () => {
      open({ when: at(9, 22) });
      expect(heard()).toContain('Period 2, 9:25 AM to 10:10 AM, up next');
      expect(heard()).toContain('Passing Period, 9:20 AM to 9:25 AM, now');
      expect(progress().getAttribute('aria-label')).toBe('Passing Period progress');
    });

    it('is an agenda list too (for phones), with Now and Up next', () => {
      open({ when: at(9, 22) });
      const rows = [...bar().querySelectorAll('.clock-agenda li')].map(words);
      expect(rows[0]).toBe('8:30 AM Period 1');
      expect(rows[1]).toBe('9:25 AM Period 2 Up next');
      expect(rows[3]).toBe('10:30 AM Period 3 · AP CSA');
      advance(10 * MIN);
      expect([...bar().querySelectorAll('.clock-agenda li')].map(words)[1]).toBe('9:25 AM Period 2 Now');
    });
  });

  it("scrolls the agenda's current row into view", async () => {
    const scrolled = [];
    Element.prototype.scrollIntoView = function scrollIntoView() { scrolled.push(this.textContent); };
    try {
      open({ when: at(10, 39) });
      await Promise.resolve();
      expect(scrolled).toEqual(['10:30 AM Period 3 · AP CSA Now']);
    } finally {
      delete Element.prototype.scrollIntoView;
    }
  });

  describe('the whole day / just this Segment setting', () => {
    it('is whole day by default; just this Segment is saved and survives a reload', () => {
      open({ when: at(10, 39) });
      expect(radio('Whole day').checked).toBe(true);
      choose('Just this Segment');
      expect(saved(storage).dayStrip).toBe(false);
      open();
      expect(radio('Just this Segment').checked).toBe(true);
    });

    it('collapses the bar to the current Segment in place, and back', () => {
      open({ when: at(10, 39) });
      const slot = mount().querySelector('.clock-bar-slot');
      choose('Just this Segment');
      expect(bar().getAttribute('aria-label')).toBe('Period 3 · AP CSA');
      expect(heard()).toEqual(['Period 3 · AP CSA, 10:30 AM to 11:15 AM, now']);
      expect(words(bar().querySelector('.clock-bar__end'))).toBe('11:15');
      expect(bar().querySelector('.clock-agenda')).toBeNull();
      expect(mount().querySelector('.clock-bar-slot')).toBe(slot);
      choose('Whole day');
      expect(heard()).toHaveLength(9);
    });

    it('leaves the look preferences it does not show as they were saved', () => {
      withSettings({ theme: 'chalkboard', fontSwap: 'serif-1', paletteSwap: 'ocean', colorScheme: 'auto' });
      open({ when: at(10, 32) });
      choose('Just this Segment');
      expect(saved(storage)).toMatchObject({
        dayStrip: false, theme: 'chalkboard', fontSwap: 'serif-1', paletteSwap: 'ocean', colorScheme: 'auto',
      });
    });
  });

  describe('during Off-Hours', () => {
    it("before school shows today's Segments under \"Today · All Day\", none current", () => {
      open({ when: at(7, 50) });
      expect(bar().getAttribute('aria-label')).toBe("Today's Segments");
      expect(words(bar().querySelector('.clock-bar__heading'))).toBe('Today · All Day');
      expect(progress()).toBeNull();
      expect(heard()[0]).toBe('Period 1, 8:30 AM to 9:20 AM');
    });

    it('after school shows the Next School Day, labelled with its date, on either setting', () => {
      withSettings({ dayStrip: false });
      open({ when: at(16, 0) });
      expect(bar().getAttribute('aria-label')).toBe('Segments on Wed, Oct 28');
      expect(words(bar().querySelector('.clock-bar__heading'))).toBe('Next School Day · Wed, Oct 28 · Even Day');
      expect(bar().querySelector('.clock-bar__now')).toBeNull();
    });
  });

  describe('is hidden', () => {
    it('in Experience Week and in Summer', () => {
      open({ when: new Date(2027, 0, 20, 10, 0).getTime() });
      expect(bar()).toBeNull();
      open({ when: new Date(2027, 6, 1, 10, 0).getTime() });
      expect(bar()).toBeNull();
    });

    it('before a Division is chosen', () => {
      storage = createFakeStorage();
      open({ when: at(10, 39) });
      expect(bar()).toBeNull();
    });

    it('while a timer runs, and comes back when it is gone', () => {
      withSettings({ timerEndsAt: at(10, 44) });
      open({ when: at(10, 39) });
      expect(bar()).toBeNull();
      advance(6 * MIN);
      mount().querySelector('[role="alertdialog"] button').click();
      expect(bar()).not.toBeNull();
    });
  });
});
