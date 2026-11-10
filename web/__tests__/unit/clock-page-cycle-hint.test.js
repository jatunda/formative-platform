import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';
import { createFakePictureInPicture } from '../helpers/fake-screen.js';

const SEC = 1000;
const HINT = 'Click to change what this shows';
const mount = () => document.getElementById('clockApp');
/** The tooltip in `root`, if it's showing. */
const shownHint = (root = mount()) => [...root.querySelectorAll('[role="note"]')]
  .find((n) => n.textContent === HINT && !n.closest('[hidden]'));
const bigFace = () => mount().querySelector('.clock-readout--big .clock-readout__face');
const miniBody = () => pip.window.document.body;
const settle = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };
const key = (target, k) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

// Tue 2026-10-27, in Period 3.
const AT = new Date(2026, 9, 27, 10, 32).getTime();

let pip;

describe('School Clock: the first-time "click to change" tooltip', () => {
  let app;
  let t;
  let storage;

  const advance = (ms) => { t += ms; vi.advanceTimersByTime(ms); };

  function open() {
    app?.destroy();
    t = AT;
    pip = createFakePictureInPicture();
    app = initClockApp({
      realNow: () => t, storage, tabStorage: createFakeStorage(),
      soundPlayer: createFakeSoundPlayer({ state: 'running' }), prefersReducedMotion: () => false,
      capabilities: { fullscreen: null, wakeLock: null, pictureInPicture: pip },
    });
  }
  async function openMini() {
    [...mount().querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Mini player').click();
    await settle();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    storage = createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ division: 'HS', themeHint: false }) });
    document.body.innerHTML = '<div id="clockApp"></div>';
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.useRealTimers();
  });

  it('shows by the big Readout the first time, and never again on this device', () => {
    open();
    expect(shownHint()).toBeDefined();
    expect(shownHint().closest('.clock-readout--big')).not.toBeNull();
    open();
    expect(shownHint()).toBeUndefined();
  });

  it('goes on a click (which still cycles the Readout), and stays gone', () => {
    open();
    bigFace().click();
    expect(bigFace().textContent).toContain('since start');
    expect(shownHint()).toBeUndefined();
    advance(SEC);
    expect(shownHint()).toBeUndefined();
  });

  it('goes on a click anywhere on the page', () => {
    open();
    mount().querySelector('.clock-stage').click();
    expect(shownHint()).toBeUndefined();
  });

  it('goes on Escape', () => {
    open();
    key(document, 'Escape');
    expect(shownHint()).toBeUndefined();
  });

  it('goes by itself after a few seconds', () => {
    open();
    advance(4 * SEC);
    expect(shownHint()).toBeDefined();
    advance(3 * SEC);
    expect(shownHint()).toBeUndefined();
  });

  it('waits for the Division to be chosen, and hides in edit mode', () => {
    storage = createFakeStorage();
    open();
    expect(shownHint()).toBeUndefined();
    [...mount().querySelectorAll('button')].find((b) => b.textContent.trim() === 'High School').click();
    expect(shownHint()).toBeDefined();
    [...mount().querySelectorAll('button')].find((b) => b.textContent.trim() === 'Readouts').click();
    expect(shownHint()).toBeUndefined();
  });

  it('shows (and nothing throws) when storage is unavailable', () => {
    const blocked = () => { throw new Error('SecurityError'); };
    storage = { getItem: blocked, setItem: blocked };
    expect(() => open()).not.toThrow();
    [...mount().querySelectorAll('button')].find((b) => b.textContent.trim() === 'High School').click();
    expect(shownHint()).toBeDefined();
  });

  describe('in the mini player', () => {
    it('shows there the first time too, remembered apart from the page', async () => {
      open();
      key(document, 'Escape'); // the page's own, seen
      await openMini();
      expect(shownHint(miniBody())).toBeDefined();
      // Outside the Readout button, whose words name it.
      expect(shownHint(miniBody()).closest('button')).toBeNull();
      open();
      await openMini();
      expect(shownHint()).toBeUndefined();
      expect(shownHint(miniBody())).toBeUndefined();
    });

    it('goes on a click in the window, which still cycles the Readout', async () => {
      open();
      await openMini();
      miniBody().querySelector('.clock-mini__readout').click();
      expect(shownHint(miniBody())).toBeUndefined();
      expect(miniBody().querySelector('.clock-mini__readout').textContent).toContain('since start');
    });

    it('goes on Escape in the window, or after a few seconds', async () => {
      open();
      await openMini();
      key(pip.window.document, 'Escape');
      expect(shownHint(miniBody())).toBeUndefined();

      storage = createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ division: 'HS', themeHint: false }) });
      open();
      await openMini();
      advance(7 * SEC);
      expect(shownHint(miniBody())).toBeUndefined();
    });

    it('waits while the Readout cannot be clicked (just the time)', async () => {
      storage = createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ themeHint: false }) });
      open();
      await openMini();
      expect(shownHint(miniBody())).toBeUndefined();
    });

    it('has no mode dots', async () => {
      open();
      await openMini();
      expect(miniBody().querySelector('.clock-mini__modes')).toBeNull();
    });
  });
});
