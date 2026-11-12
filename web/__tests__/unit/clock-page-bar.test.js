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

    it('lets the keyboard reach the agenda, since it scrolls on its own', () => {
      open({ when: at(9, 22) });
      expect(bar().querySelector('.clock-agenda').tabIndex).toBe(0);
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
      withSettings({ theme: 'bloom', fontSwap: 'mono', paletteSwap: 'team', flipped: true });
      open({ when: at(10, 32) });
      choose('Just this Segment');
      expect(saved(storage)).toMatchObject({
        dayStrip: false, theme: 'bloom', fontSwap: 'mono', paletteSwap: 'team', flipped: true,
      });
    });
  });

  describe('Show when this Period ends', () => {
    const times = () => [...bar().querySelectorAll('.clock-bar__time')].map(words);
    const agendaTimes = () => [...bar().querySelectorAll('.clock-agenda__time')].map(words);

    it('is off by default: every block shows its start alone', () => {
      open({ when: at(10, 39) });
      expect(times()[3]).toBe('10:30');
      expect(bar().querySelector('.clock-bar__until')).toBeNull();
      expect(agendaTimes()[3]).toBe('10:30 AM');
    });

    it('when on, the current block shows start–end and the others their start, in the bar and the agenda', () => {
      withSettings({ showPeriodEnd: true });
      open({ when: at(10, 39) });
      expect(times()).toEqual(['8:30', '9:25', '10:10', '10:30–11:15', '11:20', '12:10', '12:55', '1:35', '2:25']);
      // The end is its own part, so a block too narrow for both can drop it.
      expect(words(bar().querySelector('.clock-bar__seg[data-state="now"] .clock-bar__until'))).toBe('–11:15');
      expect(agendaTimes()[3]).toBe('10:30–11:15 AM');
      expect(agendaTimes()[2]).toBe('10:10 AM');
      // The screen-reader text already gave the end.
      expect(heard()[3]).toBe('Period 3, 10:30 AM to 11:15 AM, now');
    });

    it('keeps both halves of the agenda time when the block runs across noon, and follows 24-hour time', () => {
      withSettings({ showPeriodEnd: true });
      open({ when: at(11, 30) });
      expect(agendaTimes()[4]).toBe('11:20 AM–12:05 PM');
      withSettings({ showPeriodEnd: true, use24Hour: true });
      open({ when: at(14, 30) });
      expect(times()[8]).toBe('14:25–15:10');
      expect(agendaTimes()[8]).toBe('14:25–15:10');
    });

    it('moves to the next block when the current one ends', () => {
      withSettings({ showPeriodEnd: true });
      open({ when: at(11, 14) });
      advance(7 * MIN);
      expect(times()[3]).toBe('10:30');
      expect(times()[4]).toBe('11:20–12:05');
    });

    it('changes nothing on just this Segment or in Off-Hours', () => {
      withSettings({ showPeriodEnd: true, dayStrip: false });
      open({ when: at(10, 39) });
      expect(times()).toEqual(['10:30']);
      expect(words(bar().querySelector('.clock-bar__end'))).toBe('11:15');
      withSettings({ showPeriodEnd: true });
      open({ when: at(7, 50) });
      expect(bar().querySelector('.clock-bar__until')).toBeNull();
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

    it('after school shows the Next School Day, labelled with its date', () => {
      open({ when: at(16, 0) });
      expect(bar().getAttribute('aria-label')).toBe('Segments on Wed, Oct 28');
      expect(words(bar().querySelector('.clock-bar__heading'))).toBe('Next School Day · Wed, Oct 28 · Even Day');
      expect(bar().querySelector('.clock-bar__now')).toBeNull();
    });

    describe('on just this Segment, a countdown to the Next School Day', () => {
      beforeEach(() => withSettings({ dayStrip: false, periodLabels: { 'Period 2': 'AP CSA' } }));
      const times = () => [...bar().querySelectorAll('.clock-bar__time')].map(words);

      it("after school counts from the end of school to the first Segment, under the next day's heading", () => {
        open({ when: at(16, 0) });
        expect(bar().classList).toContain('clock-bar--segment');
        expect(bar().getAttribute('aria-label')).toBe('Until Period 2 · AP CSA');
        expect(words(bar().querySelector('.clock-bar__heading'))).toBe('Next School Day · Wed, Oct 28 · Even Day');
        expect(heard()).toEqual(['Until Period 2 · AP CSA, Wed, Oct 28 at 8:30 AM']);
        expect(times()).toEqual(['3:10']);
        expect(words(bar().querySelector('.clock-bar__end'))).toBe('8:30');
        expect(bar().querySelector('.clock-agenda')).toBeNull();
        // 15:10 → 8:30 is 1040 minutes; 50 are done.
        expect(progress().getAttribute('aria-valuenow')).toBe('5');
        advance(52 * MIN);
        expect(progress().getAttribute('aria-valuenow')).toBe('10');
      });

      it("before school counts down to today's first Segment", () => {
        open({ when: at(7, 50) });
        expect(words(bar().querySelector('.clock-bar__heading'))).toBe('Today · All Day');
        expect(heard()).toEqual(['Until Period 1, today at 8:30 AM']);
        expect(times()).toEqual(['3:10']);
        expect(bar().querySelector('.clock-bar__now')).not.toBeNull();
      });

      it('gives way to the Segment once school starts', () => {
        open({ when: at(8, 29) });
        advance(2 * MIN);
        expect(bar().getAttribute('aria-label')).toBe('Period 1');
        expect(bar().querySelector('.clock-bar__heading')).toBeNull();
      });
    });
  });

  describe('in Readouts edit mode', () => {
    const control = (name) => [...mount().querySelectorAll('button')].find((b) => words(b) === name);
    const edit = () => control('Readouts').click();
    /** The bar's own button, while it shows. */
    const switchButton = () => {
      const button = bar()?.querySelector('button');
      return button && isShown(button) ? button : null;
    };

    it('a tap anywhere on the bar switches whole day and just this Segment, saves it, and the Look sheet shows it', () => {
      open({ when: at(10, 39) });
      edit();
      bar().querySelector('.clock-bar__track li').click();
      expect(saved(storage).dayStrip).toBe(false);
      expect(radio('Just this Segment').checked).toBe(true);
      expect(heard()).toEqual(['Period 3 · AP CSA, 10:30 AM to 11:15 AM, now']);
      bar().click();
      expect(saved(storage).dayStrip).toBe(true);
      expect(radio('Whole day').checked).toBe(true);
      expect(heard()).toHaveLength(9);
      open();
      expect(radio('Whole day').checked).toBe(true);
    });

    it('has a button for the keyboard and screen readers that says what a tap does, and keeps focus', () => {
      open({ when: at(10, 39) });
      expect(switchButton()).toBeNull();
      edit();
      expect(words(switchButton())).toBe('Bottom bar: Whole day. Switch to Just this Segment');
      switchButton().focus();
      // Enter and Space press a button by clicking it.
      switchButton().click();
      expect(saved(storage).dayStrip).toBe(false);
      expect(document.activeElement).toBe(switchButton());
      expect(words(switchButton())).toBe('Bottom bar: Just this Segment. Switch to Whole day');
      // The bar stays a labelled section, and the agenda stays in reach.
      expect(bar().getAttribute('aria-label')).toBe('Period 3 · AP CSA');
      switchButton().click();
      expect(bar().querySelector('.clock-agenda').tabIndex).toBe(0);
    });

    it('looks editable and is named in the edit note', () => {
      open({ when: at(10, 39) });
      expect(bar().classList).not.toContain('is-editing');
      edit();
      expect(bar().classList).toContain('is-editing');
      expect(words(mount().querySelector('.clock-edit-note'))).toBe('Tap a Readout or the bar to change what it shows');
    });

    it("isn't interactive outside edit mode", () => {
      open({ when: at(10, 39) });
      bar().click();
      expect(radio('Whole day').checked).toBe(true);
      expect(storage.getItem(SETTINGS_KEY)).not.toContain('"dayStrip":false');
      edit();
      control('Done').click();
      bar().click();
      expect(radio('Whole day').checked).toBe(true);
      expect(bar().classList).not.toContain('is-editing');
      expect(switchButton()).toBeNull();
    });

    it('switches during a Passing Period and in Off-Hours, to and from the countdown', () => {
      open({ when: at(10, 27) });
      edit();
      bar().click();
      expect(heard()).toEqual(['Passing Period, 10:25 AM to 10:30 AM, now']);
      open({ when: at(16, 0) });
      edit();
      expect(heard()).toEqual(['Until Period 2, Wed, Oct 28 at 8:30 AM']);
      bar().click();
      expect(saved(storage).dayStrip).toBe(true);
      expect(bar().classList).toContain('clock-bar--day');
      expect(words(switchButton())).toBe('Bottom bar: Whole day. Switch to Just this Segment');
    });

    it('has nothing to tap while the bar is hidden, and the edit note leaves it out', () => {
      withSettings({ timerEndsAt: at(10, 44) });
      open({ when: at(10, 39) });
      edit();
      expect(bar()).toBeNull();
      expect(mount().querySelector('.clock-bar').classList).not.toContain('is-editing');
      expect(words(mount().querySelector('.clock-edit-note'))).toBe('Tap a Readout to change what it shows');
      open({ when: new Date(2027, 6, 1, 10, 0).getTime() });
      edit();
      expect(bar()).toBeNull();
      expect(mount().querySelector('.clock-bar').classList).not.toContain('is-editing');
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
