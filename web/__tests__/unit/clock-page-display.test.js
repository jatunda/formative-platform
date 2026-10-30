import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { LAYOUT_KEY } from '../../clock/readout-layout.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';
import { createFakePictureInPicture } from '../helpers/fake-screen.js';

const SEC = 1000;
const MIN = 60 * SEC;
const mount = () => document.getElementById('clockApp');
const displayText = () => mount().querySelector('.clock-display').textContent.replace(/\s+/g, ' ');
const isShown = (node) => !node.closest('[hidden]');
const button = (name, root = mount()) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent === name && isShown(b));
const checkbox = (name) =>
  [...mount().querySelectorAll('label')].find((l) => l.textContent.trim() === name).querySelector('input');
const toggle = (name) => {
  const box = checkbox(name);
  box.checked = !box.checked;
  box.dispatchEvent(new Event('change'));
};
const readouts = () => [...mount().querySelectorAll('.clock-readout')].map((r) => ({
  text: r.querySelector('.clock-readout-value').textContent,
  big: r.classList.contains('clock-readout--big'),
}));
const timerSection = () => mount().querySelector('[aria-label="Timer"]');
const saved = (storage) => JSON.parse(storage.getItem(SETTINGS_KEY));
const settle = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };

// Tue 2026-10-27 is an All Day: Period 3 runs 10:30–11:15, Period 7 ends 15:10.
const at = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s).getTime();

describe('School Clock display preferences', () => {
  let app;
  let t;
  let storage;
  let tabStorage;
  let pip;

  /** Open (or reload) the page in this tab, on the same device. */
  function open({ when } = {}) {
    app?.destroy();
    if (when !== undefined) t = when;
    pip = createFakePictureInPicture();
    app = initClockApp({
      realNow: () => t, storage, tabStorage, soundPlayer: createFakeSoundPlayer({ state: 'running' }),
      prefersReducedMotion: () => false,
      capabilities: { fullscreen: null, wakeLock: null, pictureInPicture: pip },
    });
  }
  const advance = (ms) => { t += ms; vi.advanceTimersByTime(ms); };
  const withSettings = (settings) => {
    storage = createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ division: 'HS', ...settings }) });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    withSettings({});
    tabStorage = createFakeStorage();
    document.body.innerHTML = '<div id="clockApp"></div>';
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.useRealTimers();
  });

  describe('seconds', () => {
    it('are on by default; turning them off drops them from the time and the countdowns, saved', () => {
      open({ when: at(10, 32, 30) });
      expect(checkbox('Show seconds').checked).toBe(true);
      expect(displayText()).toContain('10:32:30 AM');
      expect(readouts()[0].text).toBe('42:30 left');

      toggle('Show seconds');
      expect(saved(storage).showSeconds).toBe(false);
      expect(displayText()).toContain('10:32 AM');
      expect(displayText()).not.toContain('10:32:30');
      expect(readouts()[0].text).toBe('42 min left');
      expect(displayText()).toContain('10:30 AM – 11:15 AM');
    });

    it('stay off through a reload, and a countdown shows them again in its last minute', () => {
      withSettings({ showSeconds: false });
      open({ when: at(11, 13, 50) });
      expect(checkbox('Show seconds').checked).toBe(false);
      expect(readouts()[0].text).toBe('1 min left');
      advance(15 * SEC);
      expect(readouts()[0].text).toBe('0:55 left');
    });

    it('when off, Off-Hours lines drop them too, but days and hours stay as they are', () => {
      withSettings({ showSeconds: false });
      open({ when: at(16, 0, 0) });
      expect(displayText()).toContain('starts in 16h 30m');
      expect(displayText()).toContain('50 min since school ended');
      open({ when: new Date(2026, 9, 23, 16, 0).getTime() }); // Friday: back on Monday
      expect(displayText()).toContain('starts in 2d 16h');
    });

    it('when off, the timer still shows them', () => {
      withSettings({ showSeconds: false });
      open({ when: at(10, 32, 30) });
      button('5 min', timerSection()).click();
      advance(10 * SEC);
      expect(timerSection().textContent).toContain('4:50 left');
    });

    it('when off, the mini player drops them too', async () => {
      withSettings({ showSeconds: false });
      open({ when: at(10, 32, 30) });
      button('Mini player').click();
      await settle();
      expect(pip.window.document.body.textContent).toContain('42 min left');
    });
  });

  describe('the Day Strip setting', () => {
    it('is on by default, and turning it off is saved and survives a reload', () => {
      open({ when: at(10, 32) });
      expect(checkbox('Day Strip').checked).toBe(true);
      toggle('Day Strip');
      expect(saved(storage).dayStrip).toBe(false);
      open();
      expect(checkbox('Day Strip').checked).toBe(false);
    });

    it('leaves the look preferences it does not show as they were saved', () => {
      withSettings({ theme: 'chalkboard', fontSwap: 'serif-1', paletteSwap: 'ocean', colorScheme: 'auto' });
      open({ when: at(10, 32) });
      toggle('Day Strip');
      expect(saved(storage)).toMatchObject({
        dayStrip: false, theme: 'chalkboard', fontSwap: 'serif-1', paletteSwap: 'ocean', colorScheme: 'auto',
      });
    });
  });

  describe('a running timer as the main Readout', () => {
    const big = (text) => ({ text, big: true });
    const small = (text) => ({ text, big: false });
    const tapReadout = (i) => mount().querySelectorAll('button.clock-readout-value')[i].click();
    const savedLayouts = () => [tabStorage, storage].map((area) => area.getItem(LAYOUT_KEY));
    const ringing = () => mount().querySelector('[aria-label="Ringing"]');

    /** In Period 3, a layout of time left (big) and the current time. */
    function openWithTwoReadouts() {
      open({ when: at(10, 32, 30) });
      button('Add Readout').click();
      tapReadout(1);
      tapReadout(1);
      expect(readouts()).toEqual([big('42:30 left'), small('10:32:30 AM')]);
    }

    it('takes the big spot while it runs, and the previous main Readout becomes a smaller one', () => {
      openWithTwoReadouts();
      button('5 min', timerSection()).click();
      expect(readouts()).toEqual([big('5:00 left'), small('42:30 left'), small('10:32:30 AM')]);
      advance(SEC);
      expect(readouts()).toEqual([big('4:59 left'), small('42:29 left'), small('10:32:31 AM')]);
    });

    it('always shows seconds, even with seconds off', () => {
      withSettings({ showSeconds: false });
      open({ when: at(10, 32, 30) });
      button('5 min', timerSection()).click();
      expect(readouts()).toEqual([big('5:00 left'), small('42 min left')]);
    });

    it('cancelling puts the layout back exactly, and the saved layout is never touched', () => {
      openWithTwoReadouts();
      const before = savedLayouts();
      button('5 min', timerSection()).click();
      expect(savedLayouts()).toEqual(before);
      button('Cancel', timerSection()).click();
      expect(readouts()).toEqual([big('42:30 left'), small('10:32:30 AM')]);
      expect(savedLayouts()).toEqual(before);
    });

    it('stays the main Readout while paused', () => {
      openWithTwoReadouts();
      button('5 min', timerSection()).click();
      advance(MIN);
      button('Pause', timerSection()).click();
      expect(readouts()[0]).toEqual(big('Paused · 4:00 left'));
    });

    it('the smaller Readouts still switch and go on their own, into the saved layout', () => {
      openWithTwoReadouts();
      button('5 min', timerSection()).click();
      tapReadout(0); // the previous main one: time left -> time elapsed
      expect(readouts()).toEqual([big('5:00 left'), small('2:30 elapsed'), small('10:32:30 AM')]);
      mount().querySelectorAll('[aria-label="Remove Readout"]')[1].click();
      expect(readouts()).toEqual([big('5:00 left'), small('2:30 elapsed')]);
      button('Cancel', timerSection()).click();
      expect(readouts()).toEqual([big('2:30 elapsed')]);
      expect(JSON.parse(tabStorage.getItem(LAYOUT_KEY))).toEqual({ readouts: [{ mode: 'countup' }] });
    });

    it('holds the main spot through a reload, and cancelling then restores the layout', () => {
      openWithTwoReadouts();
      button('5 min', timerSection()).click();
      advance(MIN);
      open();
      expect(readouts()).toEqual([big('4:00 left'), small('41:30 left'), small('10:33:30 AM')]);
      button('Cancel', timerSection()).click();
      expect(readouts()).toEqual([big('41:30 left'), small('10:33:30 AM')]);
    });

    it('stays in the main spot while it rings, until dismissed', () => {
      openWithTwoReadouts();
      button('1 min', timerSection()).click();
      advance(MIN + SEC);
      expect(ringing().hidden).toBe(false);
      expect(readouts()).toEqual([big("Time's up"), small('41:29 left'), small('10:33:31 AM')]);
      button('Dismiss', ringing()).click();
      expect(readouts()).toEqual([big('41:29 left'), small('10:33:31 AM')]);
    });

    it('gives the spot back when it stops ringing on its own', () => {
      openWithTwoReadouts();
      button('1 min', timerSection()).click();
      advance(MIN + SEC);
      advance(61 * SEC);
      expect(ringing().hidden).toBe(true);
      expect(readouts()).toEqual([big('40:28 left'), small('10:34:32 AM')]);
    });

    it('is what the mini player shows', async () => {
      open({ when: at(10, 32, 30) });
      button('2 min', timerSection()).click();
      button('Mini player').click();
      await settle();
      expect(pip.window.document.querySelector('.clock-mini-readout').textContent).toBe('2:00 left');
    });
  });
});
