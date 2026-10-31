import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';

const SEC = 1000;
const MIN = 60 * SEC;
const mount = () => document.getElementById('clockApp');
const timerSection = () => mount().querySelector('[aria-label="Timer"]');
const timerText = () => timerSection().textContent.replace(/\s+/g, ' ');
const visibleButtons = (root) => [...root.querySelectorAll('button')].filter((b) => !b.closest('[hidden]'));
const timerButton = (name) => visibleButtons(timerSection()).find((b) => b.textContent === name);
const quickPicks = () =>
  visibleButtons(timerSection().querySelector('[aria-label="Quick picks"]')).map((b) => b.textContent);
const ringing = () => mount().querySelector('[role="alertdialog"]');
const saved = (storage) => JSON.parse(storage.getItem(SETTINGS_KEY));

// Tue 2026-10-27, 10:40, in Period 3 of an All Day.
const START = new Date(2026, 9, 27, 10, 40).getTime();

describe('School Clock classroom timer', () => {
  let app;
  let t;
  let storage;
  let player;

  /** Open (or reload) the page on an HS device, on the same storage. */
  function open({ sound = {}, search = '' } = {}) {
    app?.destroy();
    player = createFakeSoundPlayer(sound);
    app = initClockApp({
      realNow: () => t, storage, tabStorage: createFakeStorage(), soundPlayer: player,
      prefersReducedMotion: () => false, search,
    });
    // The timer's controls open from the top bar's Timer control.
    [...mount().querySelectorAll('button')].find((b) => b.textContent.trim() === 'Timer' && !b.hidden)?.click();
  }
  /** Time passes and the page ticks as usual. */
  const advance = (ms) => { t += ms; vi.advanceTimersByTime(ms); };
  /** Time passes with the page closed (or asleep): no ticks. */
  const jump = (ms) => { t += ms; };

  function typeDuration(text) {
    const input = timerSection().querySelector('input');
    input.value = text;
    timerSection().querySelector('form').requestSubmit();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    t = START;
    storage = createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ division: 'HS' }) });
    document.body.innerHTML = '<div id="clockApp"></div>';
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.useRealTimers();
  });

  it('is on the main screen with the 1, 2, 5 and 10 minute presets', () => {
    open();
    for (const name of ['1 min', '2 min', '5 min', '10 min']) expect(timerButton(name)).toBeDefined();
    expect(timerButton('Pause')).toBeUndefined();
    expect(timerButton('Cancel')).toBeUndefined();
  });

  it('is hidden until a Division is chosen', () => {
    storage = createFakeStorage();
    open();
    expect(timerSection().hidden).toBe(true);
  });

  it('a preset starts counting down from the current time and is saved as its end time', () => {
    open();
    timerButton('5 min').click();
    expect(timerText()).toContain('5:00 left');
    expect(saved(storage)).toMatchObject({ timerEndsAt: START + 5 * MIN, timerPausedMs: null });

    advance(90 * SEC);
    expect(timerText()).toContain('3:30 left');
  });

  it('a running timer survives a reload and is still counting', () => {
    open();
    timerButton('5 min').click();
    jump(2 * MIN);
    open();
    expect(timerText()).toContain('3:00 left');
    advance(SEC);
    expect(timerText()).toContain('2:59 left');
  });

  it('pausing holds the time left, through a reload; resuming carries on from it', () => {
    open();
    timerButton('5 min').click();
    advance(MIN);
    timerButton('Pause').click();
    expect(saved(storage)).toMatchObject({ timerEndsAt: null, timerPausedMs: 4 * MIN });

    advance(10 * MIN);
    open();
    expect(timerText()).toContain('Paused · 4:00 left');
    expect(timerButton('Pause')).toBeUndefined();

    timerButton('Resume').click();
    advance(30 * SEC);
    expect(timerText()).toContain('3:30 left');
    expect(saved(storage).timerEndsAt).toBe(START + 11 * MIN + 4 * MIN);
  });

  it('cancelling clears the timer, and it never rings', () => {
    open();
    timerButton('1 min').click();
    timerButton('Cancel').click();
    expect(saved(storage)).toMatchObject({ timerEndsAt: null, timerPausedMs: null });
    expect(timerText()).not.toContain('left');
    advance(2 * MIN);
    expect(ringing().hidden).toBe(true);
  });

  it('starting another timer replaces the running one', () => {
    open();
    timerButton('10 min').click();
    timerButton('2 min').click();
    expect(timerText()).toContain('2:00 left');
  });

  describe('at its end', () => {
    it('rings until dismissed, then the timer is gone', () => {
      open();
      timerButton('1 min').click();
      advance(MIN + SEC);
      expect(ringing().hidden).toBe(false);
      expect(ringing().textContent).toContain('Ringing · Timer');
      expect(saved(storage)).toMatchObject({ timerEndsAt: null });
      expect(timerText()).not.toContain('left');

      visibleButtons(ringing()).find((b) => b.textContent === 'Dismiss').click();
      expect(player.dismissals).toBe(1);
      expect(ringing().hidden).toBe(true);
    });

    it('stops ringing on screen after 60 seconds', () => {
      open();
      timerButton('1 min').click();
      advance(MIN + SEC);
      advance(59 * SEC);
      expect(ringing().hidden).toBe(false);
      advance(SEC);
      expect(ringing().hidden).toBe(true);
    });

    it('is handed to the sound engine ahead of time, with the timer sound, repeating', async () => {
      open({ sound: { time: 50 } });
      visibleButtons(mount()).find((b) => b.textContent === 'Turn sound on').click();
      await Promise.resolve();
      timerButton('2 min').click();
      expect(player.scheduled).toContainEqual({
        key: `${START + 2 * MIN}|timer|`, at: 50 + 120, sound: 'beep', repeat: true,
      });

      timerButton('Pause').click();
      expect(player.scheduled.some((ring) => ring.key.includes('timer'))).toBe(false);
    });

    it('a timer that ended while the page was closed is cleared without ringing', () => {
      open();
      timerButton('1 min').click();
      jump(5 * MIN);
      open();
      expect(timerText()).not.toContain('left');
      expect(saved(storage).timerEndsAt).toBeNull();
      advance(SEC);
      expect(ringing().hidden).toBe(true);
    });
  });

  describe('in simulated time (affects only that tab)', () => {
    // Simulated Tue 2026-10-27 13:00, while the real clock says 10:40.
    const SIMULATED = '?at=2026-10-27T13:00';

    it('runs, pauses and rings in memory only, never saving the timer; quick picks still save', () => {
      open({ search: SIMULATED });
      typeDuration('3');
      expect(timerText()).toContain('3:00 left');
      expect(saved(storage)).toMatchObject({ timerEndsAt: null, timerPausedMs: null, recentDurations: [3 * MIN] });

      advance(MIN);
      timerButton('Pause').click();
      expect(timerText()).toContain('Paused · 2:00 left');
      expect(saved(storage)).toMatchObject({ timerEndsAt: null, timerPausedMs: null });

      timerButton('Resume').click();
      advance(2 * MIN + SEC);
      expect(ringing().textContent).toContain('Ringing · Timer');
      expect(saved(storage)).toMatchObject({ timerEndsAt: null, timerPausedMs: null });

      open();
      expect(timerText()).not.toContain('left');
    });

    it('neither loads nor clears a real timer saved by another tab', () => {
      // A real timer ending at 10:45 — already in the past for the simulated 13:00 clock.
      storage = createFakeStorage({
        [SETTINGS_KEY]: JSON.stringify({ division: 'HS', timerEndsAt: START + 5 * MIN }),
      });
      open({ search: SIMULATED });
      expect(timerText()).not.toContain('left');
      advance(2 * SEC);
      expect(ringing().hidden).toBe(true);
      timerButton('1 min').click();
      advance(MIN + SEC);
      expect(ringing().textContent).toContain('Ringing · Timer');
      expect(saved(storage).timerEndsAt).toBe(START + 5 * MIN);

      t = START;
      open();
      expect(timerText()).toContain('5:00 left');
    });
  });

  describe('a custom duration', () => {
    it('starts a timer of that length', () => {
      open();
      typeDuration('7:30');
      expect(timerText()).toContain('7:30 left');
      expect(saved(storage).timerEndsAt).toBe(START + 7.5 * MIN);
    });

    it('says what is wrong and starts nothing when it is not a duration', () => {
      open();
      typeDuration('soon');
      expect(timerText()).toContain('Type minutes (like 7) or minutes:seconds (like 7:30).');
      expect(saved(storage).timerEndsAt ?? null).toBeNull();

      typeDuration('3');
      expect(timerText()).not.toContain('Type minutes');
    });

    it('the last 3 distinct ones are quick picks, most recent first, kept across reloads', () => {
      open();
      expect(quickPicks()).toEqual([]);
      for (const text of ['3', '7:30', '15', '3']) typeDuration(text);
      expect(quickPicks()).toEqual(['3 min', '15 min', '7:30']);
      typeDuration('20');
      expect(quickPicks()).toEqual(['20 min', '3 min', '15 min']);

      open();
      expect(quickPicks()).toEqual(['20 min', '3 min', '15 min']);
    });

    it('a quick pick starts its timer and moves to the front', () => {
      open();
      typeDuration('7:30');
      typeDuration('15');
      visibleButtons(timerSection()).find((b) => b.textContent === '7:30').click();
      expect(timerText()).toContain('7:30 left');
      expect(quickPicks()).toEqual(['7:30', '15 min']);
    });

    it('presets are not added as quick picks', () => {
      open();
      timerButton('5 min').click();
      typeDuration('5');
      expect(quickPicks()).toEqual([]);
    });
  });
});
