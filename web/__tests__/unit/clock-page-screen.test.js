import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';
import { createFakeFullscreen, createFakePictureInPicture, createFakeWakeLock } from '../helpers/fake-screen.js';

const SEC = 1000;
const mount = () => document.getElementById('clockApp');
/** A visible button by its accessible name (its aria-label, else its text). */
const button = (name, root = mount()) => [...root.querySelectorAll('button')]
  .find((b) => (b.getAttribute('aria-label') ?? b.textContent.trim()) === name && !b.closest('[hidden]'));
const bigReadout = () => mount().querySelector('.clock-readout--big .clock-readout__face').textContent.replace(/\s+/g, ' ').trim();
const ringing = () => mount().querySelector('[role="alertdialog"]');
/** Let the capability promises (fullscreen, wake lock, PiP) settle. */
const settle = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };

// Tue 2026-10-27 is an All Day: Period 3 runs 10:30–11:15, Period 4 11:20–12:05.
const at = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);

describe('School Clock fullscreen, mini player and feedback', () => {
  let app;
  let t;
  let player;
  let fullscreen;
  let wakeLock;
  let pip;

  const advance = (ms) => { t += ms; vi.advanceTimersByTime(ms); };

  /** Open the page on an HS device at `when`, with the given capabilities (all present by default). */
  function open({ when = at(11, 12), settings = { division: 'HS' }, capabilities = {} } = {}) {
    t = when.getTime();
    player = createFakeSoundPlayer({ state: 'running' });
    fullscreen = createFakeFullscreen();
    wakeLock = createFakeWakeLock();
    pip = createFakePictureInPicture();
    app = initClockApp({
      realNow: () => t,
      storage: createFakeStorage({ [SETTINGS_KEY]: JSON.stringify(settings) }),
      tabStorage: createFakeStorage(),
      soundPlayer: player,
      prefersReducedMotion: () => false,
      capabilities: { fullscreen, wakeLock, pictureInPicture: pip, ...capabilities },
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="clockApp"></div>';
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.useRealTimers();
  });

  describe('fullscreen', () => {
    it('puts the clock fullscreen and keeps the screen awake until fullscreen ends', async () => {
      open();
      button('Fullscreen').click();
      await settle();
      expect(fullscreen.element).toBe(mount());
      expect(wakeLock.held()).toBe(1);
      expect(button('Exit fullscreen')).toBeDefined();

      button('Exit fullscreen').click();
      await settle();
      expect(fullscreen.isActive()).toBe(false);
      expect(wakeLock.held()).toBe(0);
      expect(button('Fullscreen')).toBeDefined();
    });

    it('lets the screen sleep again when fullscreen is left some other way (Esc)', async () => {
      open();
      button('Fullscreen').click();
      await settle();
      fullscreen.userExits();
      await settle();
      expect(wakeLock.held()).toBe(0);
      expect(button('Fullscreen')).toBeDefined();
    });

    it('asks for the wake lock again when the tab is shown while still fullscreen', async () => {
      open();
      button('Fullscreen').click();
      await settle();
      wakeLock.browserReleases();

      document.dispatchEvent(new Event('visibilitychange'));
      await settle();

      expect(wakeLock.requests).toBe(2);
      expect(wakeLock.held()).toBe(1);
    });

    it("doesn't ask again when the tab is being hidden", async () => {
      open();
      button('Fullscreen').click();
      await settle();
      wakeLock.browserReleases();
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      try {
        document.dispatchEvent(new Event('visibilitychange'));
        await settle();
      } finally {
        delete document.visibilityState;
      }
      expect(wakeLock.requests).toBe(1);
      expect(document.visibilityState).toBe('visible');
    });

    it("doesn't ask for a wake lock when the tab is shown outside fullscreen", async () => {
      open();
      document.dispatchEvent(new Event('visibilitychange'));
      await settle();
      expect(wakeLock.requests).toBe(0);
    });

    it('still goes fullscreen where Wake Lock is missing or refused', async () => {
      open({ capabilities: { wakeLock: null } });
      button('Fullscreen').click();
      await settle();
      expect(fullscreen.isActive()).toBe(true);
      app.destroy();

      open({ capabilities: { wakeLock: createFakeWakeLock({ refuse: true }) } });
      button('Fullscreen').click();
      await settle();
      expect(fullscreen.isActive()).toBe(true);
    });

    it('stays put quietly when the browser refuses fullscreen', async () => {
      open({ capabilities: { fullscreen: { ...createFakeFullscreen(), request: () => Promise.reject(new Error('denied')) } } });
      button('Fullscreen').click();
      await settle();
      expect(button('Fullscreen')).toBeDefined();
    });

    it('has no button where the browser has no Fullscreen', () => {
      open({ capabilities: { fullscreen: null } });
      expect(button('Fullscreen')).toBeUndefined();
    });

    it('stops watching fullscreen and lets go of the wake lock when destroyed', async () => {
      open();
      button('Fullscreen').click();
      await settle();
      app.destroy();
      app = null;
      await settle();
      expect(wakeLock.held()).toBe(0);
      fullscreen.userExits();
      expect(() => fullscreen.request(mount())).not.toThrow();
    });
  });

  describe('the mini player', () => {
    const mini = () => pip.window.document.body;
    const miniText = () => mini().textContent.replace(/\s+/g, ' ');

    async function openMini() {
      button('Mini player').click();
      await settle();
    }

    it('has no button where the browser has no Document Picture-in-Picture', () => {
      open({ capabilities: { pictureInPicture: null } });
      expect(button('Mini player')).toBeUndefined();
    });

    it('opens a small window with the big Readout, the current Segment and up next', async () => {
      open();
      await openMini();
      expect(pip.windows).toHaveLength(1);
      expect(miniText()).toContain('3:00 left');
      expect(miniText()).toContain('Period 3 · HS');
      expect(miniText()).toContain('Up next: Period 4 at 11:20 AM');
    });

    it('follows the main page every tick, from the same state', async () => {
      open();
      await openMini();
      advance(SEC);
      expect(bigReadout()).toBe('2:59 left');
      expect(miniText()).toContain('2:59 left');

      mount().querySelector('.clock-readout--big .clock-readout__face').click();
      expect(miniText()).toContain(bigReadout());
      expect(miniText()).not.toContain('2:59 left');

      advance(3 * 60 * SEC); // into the Passing Period
      expect(miniText()).toContain('Passing Period');
      expect(miniText()).toContain('Up next: Period 4 at 11:20 AM');
    });

    it('uses the same Period labels and time format as the main page', async () => {
      open({ settings: { division: 'HS', use24Hour: true, periodLabels: { 'Period 4': 'AP CSA' } } });
      await openMini();
      expect(miniText()).toContain('Up next: Period 4 · AP CSA at 11:20');
      expect(miniText()).not.toContain('AM');
    });

    it('shows just the time before a Division is chosen', async () => {
      open({ settings: {} });
      await openMini();
      expect(miniText()).toContain('11:12:00 AM');
      expect(miniText()).not.toContain('Up next');
    });

    it('shows just the time on a date the clock knows nothing about', async () => {
      open({ when: new Date(2031, 0, 6, 10, 0) });
      await openMini();
      expect(mini().querySelector('.clock-mini-readout').textContent).toBe('10:00:00 AM');
      expect(miniText()).not.toMatch(/Period|Up next|school/);
    });

    it('shows the Day Label on a day off', async () => {
      open({ when: new Date(2026, 9, 31, 12, 0) });
      await openMini();
      expect(miniText()).toContain('Weekend');
    });

    it('has a dismiss button while something rings, which stops the ring', async () => {
      open();
      await openMini();
      expect(button('Dismiss', mini())).toBeUndefined();

      advance(3 * 60 * SEC + SEC); // just past 11:15, the Bell at the end of Period 3
      expect(miniText()).toContain('Ringing: Bell');
      button('Dismiss', mini()).click();

      expect(player.dismissals).toBe(1);
      expect(ringing().hidden).toBe(true);
      expect(button('Dismiss', mini())).toBeUndefined();
    });

    it('closes from its button on the main page, and the button can open it again', async () => {
      open();
      await openMini();
      button('Close mini player').click();
      expect(pip.window.closed).toBe(true);
      await openMini();
      expect(pip.windows).toHaveLength(2);
    });

    it('keeps a reopened window going when the old one says it closed only afterwards', async () => {
      open();
      await openMini();
      const first = pip.window;
      button('Close mini player').click();
      button('Mini player').click(); // before the first window's pagehide arrives
      await settle();

      expect(first.closed).toBe(true);
      expect(pip.windows).toHaveLength(2);
      expect(button('Close mini player')).toBeDefined();
      advance(SEC);
      expect(miniText()).toContain('2:59 left');
    });

    it('stops updating once the user closes it', async () => {
      open();
      await openMini();
      pip.window.close();
      await settle();
      expect(button('Mini player')).toBeDefined();
      const before = miniText();
      advance(SEC);
      expect(miniText()).toBe(before);
    });

    it('closes when the main tab closes or the page is destroyed', async () => {
      open();
      await openMini();
      window.dispatchEvent(new Event('pagehide'));
      expect(pip.window.closed).toBe(true);

      await openMini();
      app.destroy();
      app = null;
      expect(pip.window.closed).toBe(true);
    });

    it('stays closed quietly when the browser refuses to open it', async () => {
      open({ capabilities: { pictureInPicture: { open: () => Promise.reject(new Error('no gesture')) } } });
      await openMini();
      expect(button('Mini player')).toBeDefined();
    });
  });

  describe('the window buttons, bottom right', () => {
    it('are icon-only, each named by its aria-label and a matching tooltip', () => {
      open();
      for (const name of ['Mini player', 'Fullscreen']) {
        const b = button(name);
        expect(b.closest('[role="group"][aria-label="Window"]')).not.toBeNull();
        expect(b.getAttribute('title')).toBe(name);
        expect(b.textContent.trim()).toBe('');
        expect(b.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      }
    });

    it('rename themselves while their window is open', async () => {
      open();
      button('Fullscreen').click();
      await settle();
      expect(button('Exit fullscreen').getAttribute('title')).toBe('Exit fullscreen');
      button('Mini player').click();
      await settle();
      expect(button('Close mini player').getAttribute('title')).toBe('Close mini player');
    });
  });

  it('has a "Feedback? Email Eric" link to a new email with the subject filled in, kept out of the projected view', () => {
    open();
    const link = [...mount().querySelectorAll('a')].find((a) => a.textContent === 'Feedback? Email Eric');
    expect(link.getAttribute('href')).toBe('mailto:erich@villagechristian.org?subject=Clock%20feedback');
    expect(link.closest('[hidden]')).not.toBeNull();
    button('Settings').click();
    expect(link.closest('[hidden]')).toBeNull();
  });

  it("detects the browser's own capabilities when none are passed in (jsdom has none)", () => {
    app = initClockApp({
      realNow: () => at(11, 12).getTime(),
      storage: createFakeStorage(),
      tabStorage: createFakeStorage(),
      soundPlayer: createFakeSoundPlayer(),
    });
    expect(button('Fullscreen')).toBeUndefined();
    expect(button('Mini player')).toBeUndefined();
  });
});
