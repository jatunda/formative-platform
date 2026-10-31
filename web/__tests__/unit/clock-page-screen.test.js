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
    const miniText = () => mini().textContent.replace(/\s+/g, ' ').trim();
    const head = () => mini().querySelector('h1').textContent.trim();
    const readout = () => mini().querySelector('.clock-mini__readout').textContent;
    const foot = () => mini().querySelector('.clock-mini__foot');
    const footText = () => [...foot().children].filter((c) => !c.hidden)
      .map((c) => c.textContent).join(' ').replace(/\s+/g, ' ').trim();
    const progress = () => [...foot().querySelectorAll('[role="progressbar"]')].find((b) => !b.closest('[hidden]'));
    const miniMain = () => mini().querySelector('main');
    const timerSection = () => mount().querySelector('[aria-label="Timer"]');

    async function openMini() {
      button('Mini player').click();
      await settle();
    }

    it('has no button where the browser has no Document Picture-in-Picture', () => {
      open({ capabilities: { pictureInPicture: null } });
      expect(button('Mini player')).toBeUndefined();
    });

    it('opens a 320 × 180 window with the Segment and its Period Label, the big Readout, and when the Segment ends', async () => {
      open({ settings: { division: 'HS', periodLabels: { 'Period 3': 'AP CSA' } } });
      await openMini();
      expect(pip.windows).toHaveLength(1);
      expect(pip.window.size).toEqual({ width: 320, height: 180 });
      expect(head()).toBe('Period 3 · AP CSA');
      expect(readout()).toBe('3:00 left');
      // 42 of Period 3's 45 minutes have gone.
      expect(progress().getAttribute('aria-label')).toBe('Period 3 progress');
      expect(progress().getAttribute('aria-valuenow')).toBe('93');
      expect(footText()).toBe('ends 11:15 AM');
    });

    it('follows the main page every tick, from the same state', async () => {
      open();
      await openMini();
      advance(SEC);
      expect(bigReadout()).toBe('2:59 left');
      expect(readout()).toBe('2:59 left');

      mount().querySelector('.clock-readout--big .clock-readout__face').click();
      expect(readout()).toBe(bigReadout());
      expect(readout()).not.toBe('2:59 left');

      advance(3 * 60 * SEC + 5 * SEC); // into the Passing Period, after its Bell
      expect(head()).toBe('Passing Period');
      expect(footText()).toBe('Up next Period 4');
      expect(progress()).toBeUndefined();
    });

    it('uses the same Period Labels, time format and seconds setting as the main page', async () => {
      open({ settings: { division: 'HS', use24Hour: true, showSeconds: false, periodLabels: { 'Period 4': 'AP CSA' } } });
      await openMini();
      expect(footText()).toBe('ends 11:15');
      expect(readout()).toBe('3 min left');
      advance(4 * 60 * SEC); // 11:16, in the Passing Period
      expect(footText()).toBe('Up next Period 4 · AP CSA');
    });

    it('shows what comes first before school', async () => {
      open({ when: at(7, 50) });
      await openMini();
      expect(head()).toBe('Before school');
      expect(footText()).toMatch(/^Up next Period 1/);
    });

    it('shows a running timer as the big Readout, with the time left in the Segment underneath', async () => {
      open();
      button('Timer').click();
      button('5 min', timerSection()).click();
      await openMini();
      expect(head()).toBe('Timer');
      expect(readout()).toBe('5:00 left');
      expect(footText()).toBe('3:00 left in Period 3');
      expect(miniMain().classList.contains('has-timer')).toBe(true);

      advance(SEC);
      expect(readout()).toBe('4:59 left');
      button('Pause', timerSection()).click();
      expect(head()).toBe('Timer · paused');

      button('Cancel', timerSection()).click();
      expect(head()).toBe('Period 3');
      expect(miniMain().classList.contains('has-timer')).toBe(false);
    });

    it('keeps up next under a timer during a Passing Period', async () => {
      open({ when: at(11, 16) });
      button('Timer').click();
      button('1 min', timerSection()).click();
      await openMini();
      expect(readout()).toBe('1:00 left');
      expect(footText()).toBe('Up next Period 4');
    });

    it('shows just the time before a Division is chosen', async () => {
      open({ settings: {} });
      await openMini();
      expect(readout()).toBe('11:12:00 AM');
      expect(head()).toBe('');
      expect(footText()).toBe('');
    });

    it('shows just the time on a date the clock knows nothing about', async () => {
      open({ when: new Date(2031, 0, 6, 10, 0) });
      await openMini();
      expect(readout()).toBe('10:00:00 AM');
      expect(head()).not.toMatch(/Period|school/);
      expect(footText()).toBe('');
    });

    it('shows the Day Label on a day off', async () => {
      open({ when: new Date(2026, 9, 31, 12, 0) });
      await openMini();
      expect(head()).toBe('Weekend');
      expect(footText()).toBe('');
    });

    it('says what rings, with a Dismiss button reachable by keyboard that stops the ring', async () => {
      open();
      await openMini();
      expect(button('Dismiss', mini())).toBeUndefined();

      advance(3 * 60 * SEC + SEC); // just past 11:15, the Bell at the end of Period 3
      expect(head()).toBe('Ringing · Period 3 ends');
      expect(miniMain().classList.contains('is-ringing')).toBe(true);
      // A plain, enabled button in the tab order, which the ticks leave in place (so focus stays on it).
      const dismiss = button('Dismiss', mini());
      expect(dismiss.tagName).toBe('BUTTON');
      expect(dismiss.disabled).toBe(false);
      expect(dismiss.tabIndex).toBe(0);
      advance(SEC);
      expect(button('Dismiss', mini())).toBe(dismiss);
      expect(dismiss.isConnected).toBe(true);
      dismiss.click();

      expect(player.dismissals).toBe(1);
      expect(ringing().hidden).toBe(true);
      expect(button('Dismiss', mini())).toBeUndefined();
      expect(head()).toBe('Passing Period');
      expect(miniMain().classList.contains('is-ringing')).toBe(false);
    });

    it("loads the page's tokens, themes and components, then its own layout", async () => {
      open();
      await openMini();
      expect([...pip.window.document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href')))
        .toEqual(['/clock/tokens.css', '/clock/themes.css', '/clock/clock.css', '/clock/mini-player.css']);
    });

    it("follows every data-* attribute on the page's <html> as it changes, until it closes", async () => {
      // Attributes the page itself doesn't set, so only the mini player moves them.
      const html = document.documentElement;
      html.setAttribute('data-sample', 'one');
      html.setAttribute('lang', 'en');
      html.setAttribute('title', 'not part of the look');
      try {
        open();
        await openMini();
        const look = pip.window.document.documentElement;
        expect(look.dataset.sample).toBe('one');
        expect(look.getAttribute('lang')).toBe('en');
        expect(look.hasAttribute('title')).toBe(false);

        html.setAttribute('data-sample', 'two');
        html.setAttribute('data-other', 'yes');
        await settle();
        expect(look.dataset).toMatchObject({ sample: 'two', other: 'yes' });
        html.removeAttribute('data-other');
        await settle();
        expect(look.dataset.other).toBeUndefined();

        button('Close mini player').click();
        html.setAttribute('data-sample', 'three');
        await settle();
        expect(look.dataset.sample).toBe('two');
      } finally {
        for (const name of ['data-sample', 'data-other', 'lang', 'title']) html.removeAttribute(name);
      }
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
      expect(readout()).toBe('2:59 left');
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
