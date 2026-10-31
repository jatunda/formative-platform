import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { LAYOUT_KEY } from '../../clock/readout-layout.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';
import { createFakePictureInPicture } from '../helpers/fake-screen.js';
import { field, toggle } from '../helpers/clock-dom.js';

const SEC = 1000;
const MIN = 60 * SEC;
const mount = () => document.getElementById('clockApp');
const displayText = () => mount().querySelector('.clock-stage').textContent.replace(/\s+/g, ' ');
const isShown = (node) => !node.closest('[hidden]');
/** A visible button by its accessible name (its aria-label, else its text). */
const button = (name, root = mount()) => [...root.querySelectorAll('button')]
  .find((b) => (b.getAttribute('aria-label') ?? b.textContent.replace(/\s+/g, ' ').trim()) === name && isShown(b));
/** A setting's switch in the Settings drawer, by its name. */
const checkbox = (name) => field(name);
/** The Readouts in order; the timer's ring (the big one while it shows) by its digits' accessible name. */
const readouts = () => [...mount().querySelectorAll('.clock-readout, .clock-ring')].map((r) => (r.matches('.clock-ring')
  ? { text: r.querySelector('[role="timer"]').getAttribute('aria-label'), big: true }
  : {
    text: r.querySelector('.clock-readout__face').textContent.replace(/\s+/g, ' ').trim(),
    big: r.classList.contains('clock-readout--big'),
  }));
/** The timer picker, opened from the top bar's Timer control if it isn't open yet. */
const picker = () => {
  const dialog = mount().querySelector('#clock-picker');
  if (dialog.hidden) button('Timer').click();
  return dialog;
};
/** The timer's ring in the big spot. */
const ring = () => mount().querySelector('.clock-ring');
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
      expect(readouts()[0].text).toBe('42:30 left');
      button('Readouts').click();
      button('Add Readout').click();
      mount().querySelectorAll('.clock-readout__face')[1].click();
      expect(readouts()[1].text).toBe('10:32:30 AM now');

      toggle('Show seconds');
      expect(saved(storage).showSeconds).toBe(false);
      expect(readouts().map((r) => r.text)).toEqual(['42 min left', '10:32 AM now']);
      expect(displayText()).not.toContain('10:32:30');
    });

    it('stay off through a reload, and a countdown shows them again in its last minute', () => {
      withSettings({ showSeconds: false });
      open({ when: at(11, 13, 50) });
      expect(checkbox('Show seconds').checked).toBe(false);
      expect(readouts()[0].text).toBe('1 min left');
      advance(15 * SEC);
      expect(readouts()[0].text).toBe('0:55 left');
    });

    it('Off-Hours lines never show them; days and hours stay as they are', () => {
      open({ when: at(16, 0, 0) });
      expect(displayText()).toContain('starts in 16h 30m');
    });

    it('when off, Off-Hours Readouts drop them too, but days and hours stay as they are', () => {
      withSettings({ showSeconds: false });
      open({ when: at(16, 0, 0) });
      expect(displayText()).toContain('starts in 16h 30m');
      expect(readouts()[0].text).toBe('50 min since school ended');
      open({ when: new Date(2026, 9, 23, 16, 0).getTime() }); // Friday: back on Monday
      expect(displayText()).toContain('starts in 2d 16h');
    });

    it('when off, the timer still shows them', () => {
      withSettings({ showSeconds: false });
      open({ when: at(10, 32, 30) });
      button('5 min', picker()).click();
      advance(10 * SEC);
      expect(ring().querySelector('[role="timer"]').textContent).toBe('4:50');
    });

    it('when off, the mini player drops them too', async () => {
      withSettings({ showSeconds: false });
      open({ when: at(10, 32, 30) });
      button('Mini player').click();
      await settle();
      expect(pip.window.document.body.textContent).toContain('42 min left');
    });
  });

  it('leaves the look preferences the Settings drawer does not show as they were saved', () => {
    withSettings({ dayStrip: false, theme: 'bloom', fontSwap: 'mono', paletteSwap: 'team', flipped: true });
    open({ when: at(10, 32) });
    toggle('Show seconds');
    expect(saved(storage)).toMatchObject({
      showSeconds: false, dayStrip: false, theme: 'bloom', fontSwap: 'mono', paletteSwap: 'team', flipped: true,
    });
  });

  describe('a running timer as the main Readout', () => {
    const big = (text) => ({ text, big: true });
    const small = (text) => ({ text, big: false });
    const tapReadout = (i) => mount().querySelectorAll('button.clock-readout__face')[i].click();
    const savedLayouts = () => [tabStorage, storage].map((area) => area.getItem(LAYOUT_KEY));
    const ringing = () => mount().querySelector('[role="alertdialog"]');

    /** In Period 3, a layout of time left (big) and the current time. */
    function openWithTwoReadouts() {
      open({ when: at(10, 32, 30) });
      button('Readouts').click();
      button('Add Readout').click();
      button('Done').click();
      tapReadout(1);
      expect(readouts()).toEqual([big('42:30 left'), small('10:32:30 AM now')]);
    }

    it('takes the big spot while it runs, and the previous main Readout becomes a smaller one', () => {
      openWithTwoReadouts();
      button('5 min', picker()).click();
      expect(readouts()).toEqual([big('Timer, 5:00 left of 5:00'), small('42:30 left in Period 3'), small('10:32:30 AM now')]);
      advance(SEC);
      expect(readouts()).toEqual([big('Timer, 4:59 left of 5:00'), small('42:29 left in Period 3'), small('10:32:31 AM now')]);
    });

    it('always shows seconds, even with seconds off', () => {
      withSettings({ showSeconds: false });
      open({ when: at(10, 32, 30) });
      button('5 min', picker()).click();
      expect(readouts()).toEqual([big('Timer, 5:00 left of 5:00'), small('42 min left in Period 3')]);
    });

    it('cancelling puts the layout back exactly, and the saved layout is never touched', () => {
      openWithTwoReadouts();
      const before = savedLayouts();
      button('5 min', picker()).click();
      expect(savedLayouts()).toEqual(before);
      button('Cancel', ring()).click();
      expect(readouts()).toEqual([big('42:30 left'), small('10:32:30 AM now')]);
      expect(savedLayouts()).toEqual(before);
    });

    it('stays the main Readout while paused', () => {
      openWithTwoReadouts();
      button('5 min', picker()).click();
      advance(MIN);
      button('Pause', ring()).click();
      expect(readouts()[0]).toEqual(big('Timer, paused, 4:00 left of 5:00'));
    });

    it('the smaller Readouts still switch and go on their own, into the saved layout', () => {
      openWithTwoReadouts();
      button('5 min', picker()).click();
      tapReadout(0); // the previous main one: time left -> time since start
      expect(readouts()).toEqual([big('Timer, 5:00 left of 5:00'), small('2:30 since start'), small('10:32:30 AM now')]);
      button('Readouts').click();
      button('Remove Readout: now').click();
      expect(readouts()).toEqual([big('Timer, 5:00 left of 5:00'), small('2:30 since start')]);
      button('Cancel', ring()).click();
      expect(readouts()).toEqual([big('2:30 since start')]);
      expect(JSON.parse(tabStorage.getItem(LAYOUT_KEY))).toEqual({ readouts: [{ mode: 'countup' }] });
    });

    it('holds the main spot through a reload, and cancelling then restores the layout', () => {
      openWithTwoReadouts();
      button('5 min', picker()).click();
      advance(MIN);
      open();
      expect(readouts()).toEqual([big('Timer, 4:00 left of 5:00'), small('41:30 left in Period 3'), small('10:33:30 AM now')]);
      button('Cancel', ring()).click();
      expect(readouts()).toEqual([big('41:30 left'), small('10:33:30 AM now')]);
    });

    it('stays in the main spot while it rings, until dismissed', () => {
      openWithTwoReadouts();
      button('1 min', picker()).click();
      advance(MIN + SEC);
      expect(ringing().hidden).toBe(false);
      expect(readouts()).toEqual([big("Timer, time's up, 0:00 left of 1:00"), small('41:29 left in Period 3'), small('10:33:31 AM now')]);
      button('Dismiss', ringing()).click();
      expect(readouts()).toEqual([big('41:29 left'), small('10:33:31 AM now')]);
    });

    it('gives the spot back when it stops ringing on its own', () => {
      openWithTwoReadouts();
      button('1 min', picker()).click();
      advance(MIN + SEC);
      advance(61 * SEC);
      expect(ringing().hidden).toBe(true);
      expect(readouts()).toEqual([big('40:28 left'), small('10:34:32 AM now')]);
    });

    it('is what the mini player shows', async () => {
      open({ when: at(10, 32, 30) });
      button('2 min', picker()).click();
      button('Mini player').click();
      await settle();
      expect(pip.window.document.querySelector('.clock-mini-readout').textContent).toBe('2:00 left');
    });
  });
});
