import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';

const SEC = 1000;
const MIN = 60 * SEC;
const mount = () => document.getElementById('clockApp');
const isShown = (node) => !node.closest('[hidden]');
const nameOf = (node) => node.getAttribute('aria-label') ?? node.textContent.replace(/\s+/g, ' ').trim();
const visibleButtons = (root) => [...root.querySelectorAll('button')].filter(isShown);
const buttonIn = (root, name) => visibleButtons(root).find((b) => nameOf(b) === name);
const timerControl = () => buttonIn(mount().querySelector('.clock-top'), 'Timer');

/** The picker: a dialog named "Start a timer". */
const picker = () => {
  const dialog = mount().querySelector('[role="dialog"][aria-labelledby="clock-picker-title"]');
  expect(dialog.querySelector('#clock-picker-title').textContent).toBe('Start a timer');
  return dialog;
};
const pickerOpen = () => isShown(picker());
/** A picker button, opening the picker with the Timer control first if it's closed. */
const pick = (name) => {
  if (!pickerOpen()) timerControl().click();
  buttonIn(picker(), name).click();
};
const field = (label) => [...picker().querySelectorAll('label')]
  .find((l) => l.textContent.trim().startsWith(label)).querySelector('input');
function typeDuration(minutes, seconds = '') {
  if (!pickerOpen()) timerControl().click();
  field('Minutes').value = minutes;
  field('Seconds').value = seconds;
  picker().querySelector('form').requestSubmit();
}
const quickPicks = () => {
  if (!pickerOpen()) timerControl().click();
  const group = picker().querySelector('[role="group"][aria-labelledby="clock-picker-recent"]');
  return isShown(group) ? visibleButtons(group).map(nameOf) : [];
};

/** The running timer in the big spot: its ring, digits and buttons. */
const ring = () => mount().querySelector('.clock-stage [role="group"][aria-label="Timer"]');
const ringShown = () => Boolean(ring()) && isShown(ring());
const digits = () => ring().querySelector('[role="timer"]');
const ringButton = (name) => buttonIn(ring(), name);
/** The arc's length: the share of time left, out of 100. */
const arc = () => Number.parseFloat(ring().querySelector('.clock-ring__arc').getAttribute('stroke-dasharray'));
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
  }
  /** Time passes and the page ticks as usual. */
  const advance = (ms) => { t += ms; vi.advanceTimersByTime(ms); };
  /** Time passes with the page closed (or asleep): no ticks. */
  const jump = (ms) => { t += ms; };
  const press = (key, options = {}) =>
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }));

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

  describe('the picker', () => {
    it('opens from the Timer control in one tap, with the 1, 2, 5 and 10 minute presets', () => {
      open();
      expect(pickerOpen()).toBe(false);
      expect(timerControl().getAttribute('aria-expanded')).toBe('false');
      timerControl().click();
      expect(pickerOpen()).toBe(true);
      expect(picker().getAttribute('aria-modal')).toBe('true');
      expect(timerControl().getAttribute('aria-expanded')).toBe('true');
      expect(visibleButtons(picker().querySelector('[aria-label="Presets"]')).map(nameOf))
        .toEqual(['1 min', '2 min', '5 min', '10 min']);
      expect(document.activeElement).toBe(buttonIn(picker(), '1 min'));
    });

    it('closes with Escape or Close, and hands focus back to the Timer control', () => {
      open();
      timerControl().click();
      press('Escape');
      expect(pickerOpen()).toBe(false);
      expect(document.activeElement).toBe(timerControl());

      timerControl().click();
      buttonIn(picker(), 'Close').click();
      expect(pickerOpen()).toBe(false);
      expect(timerControl().getAttribute('aria-expanded')).toBe('false');
      expect(saved(storage).timerEndsAt ?? null).toBeNull();
    });

    it('keeps Tab inside it while open', () => {
      open();
      timerControl().click();
      buttonIn(picker(), 'Start').focus();
      press('Tab');
      expect(document.activeElement).toBe(buttonIn(picker(), 'Close'));
    });

    it('is hidden until a Division is chosen', () => {
      storage = createFakeStorage();
      open();
      expect(timerControl()).toBeUndefined();
      expect(pickerOpen()).toBe(false);
    });
  });

  it('a preset starts at once from the current time, closes the picker and is saved as its end and length', () => {
    open();
    pick('5 min');
    expect(pickerOpen()).toBe(false);
    expect(digits().textContent).toBe('5:00');
    expect(saved(storage)).toMatchObject({ timerEndsAt: START + 5 * MIN, timerPausedMs: null, timerTotalMs: 5 * MIN });
    // Keyboard users land on the ring's first button.
    expect(document.activeElement).toBe(ringButton('Pause'));

    advance(90 * SEC);
    expect(digits().textContent).toBe('3:30');
  });

  describe('the ring', () => {
    it('names the time left and the length, and is a timer that is never live', () => {
      open();
      pick('5 min');
      advance(48 * SEC);
      expect(digits().getAttribute('aria-label')).toBe('Timer, 4:12 left of 5:00');
      expect(digits().getAttribute('aria-live')).toBe('off');
      expect(ring().textContent).toContain('Timer');
      expect(ring().textContent).toContain('of 5:00');
    });

    it('shows the share of time left, a little less every tick', () => {
      open();
      pick('5 min');
      expect(arc()).toBe(100);
      advance(48 * SEC);
      expect(arc()).toBeCloseTo(84, 1);
      advance(SEC);
      expect(arc()).toBeCloseTo((251 / 300) * 100, 1);
    });

    it('is only there while a timer runs, is paused or rings', () => {
      open();
      expect(ringShown()).toBe(false);
      pick('1 min');
      expect(ringShown()).toBe(true);
      ringButton('Cancel').click();
      expect(ringShown()).toBe(false);
    });
  });

  it('a running timer survives a reload and is still counting', () => {
    open();
    pick('5 min');
    jump(2 * MIN);
    open();
    expect(digits().textContent).toBe('3:00');
    expect(arc()).toBeCloseTo(60, 1);
    advance(SEC);
    expect(digits().textContent).toBe('2:59');
  });

  it('pausing holds the time left, through a reload; resuming carries on from it', () => {
    open();
    pick('5 min');
    advance(MIN);
    ringButton('Pause').click();
    expect(saved(storage)).toMatchObject({ timerEndsAt: null, timerPausedMs: 4 * MIN, timerTotalMs: 5 * MIN });
    expect(document.activeElement).toBe(ringButton('Resume'));

    advance(10 * MIN);
    open();
    expect(digits().textContent).toBe('4:00');
    expect(digits().getAttribute('aria-label')).toBe('Timer, paused, 4:00 left of 5:00');
    expect(ring().textContent).toContain('Paused');
    expect(arc()).toBeCloseTo(80, 1);
    expect(ringButton('Pause')).toBeUndefined();

    ringButton('Resume').click();
    expect(document.activeElement).toBe(ringButton('Pause'));
    advance(30 * SEC);
    expect(digits().textContent).toBe('3:30');
    expect(arc()).toBeCloseTo(70, 1);
    expect(saved(storage).timerEndsAt).toBe(START + 11 * MIN + 4 * MIN);
  });

  it('cancelling clears the timer, and it never rings; focus goes back to the Timer control', () => {
    open();
    pick('1 min');
    ringButton('Cancel').click();
    expect(saved(storage)).toMatchObject({ timerEndsAt: null, timerPausedMs: null, timerTotalMs: null });
    expect(document.activeElement).toBe(timerControl());
    advance(2 * MIN);
    expect(ringing().hidden).toBe(true);
  });

  it('starting another timer replaces the running one', () => {
    open();
    pick('10 min');
    pick('2 min');
    expect(digits().textContent).toBe('2:00');
    expect(arc()).toBe(100);
  });

  describe('at its end', () => {
    it('rings until dismissed, naming the timer\'s length; the ring shows 0:00 and empties, then goes', () => {
      open();
      pick('1 min');
      advance(MIN + SEC);
      expect(ringing().hidden).toBe(false);
      expect(ringing().textContent).toContain('Ringing · Timer');
      expect(ringing().textContent).toContain('1:00 timer');
      expect(saved(storage)).toMatchObject({ timerEndsAt: null });
      expect(digits().textContent).toBe('0:00');
      expect(digits().getAttribute('aria-label')).toBe("Timer, time's up, 0:00 left of 1:00");
      expect(arc()).toBe(0);
      expect(ringButton('Pause')).toBeUndefined();
      expect(ringButton('Cancel')).toBeUndefined();

      buttonIn(ringing(), 'Dismiss').click();
      expect(player.dismissals).toBe(1);
      expect(ringing().hidden).toBe(true);
      expect(ringShown()).toBe(false);
    });

    it('stops ringing on screen after 60 seconds', () => {
      open();
      pick('1 min');
      advance(MIN + SEC);
      advance(59 * SEC);
      expect(ringing().hidden).toBe(false);
      advance(SEC);
      expect(ringing().hidden).toBe(true);
    });

    it('is handed to the sound engine ahead of time, with the timer sound, repeating', async () => {
      open({ sound: { time: 50 } });
      buttonIn(mount(), 'Turn sound on').click();
      await Promise.resolve();
      pick('2 min');
      expect(player.scheduled).toContainEqual({
        key: `${START + 2 * MIN}|timer|`, at: 50 + 120, sound: 'beep', repeat: true,
      });

      ringButton('Pause').click();
      expect(player.scheduled.some((r) => r.key.includes('timer'))).toBe(false);
    });

    it('a timer that ended while the page was closed is cleared without ringing', () => {
      open();
      pick('1 min');
      jump(5 * MIN);
      open();
      expect(ringShown()).toBe(false);
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
      expect(digits().textContent).toBe('3:00');
      expect(saved(storage)).toMatchObject({ timerEndsAt: null, timerPausedMs: null, recentDurations: [3 * MIN] });

      advance(MIN);
      ringButton('Pause').click();
      expect(digits().getAttribute('aria-label')).toBe('Timer, paused, 2:00 left of 3:00');
      expect(saved(storage)).toMatchObject({ timerEndsAt: null, timerPausedMs: null });

      ringButton('Resume').click();
      advance(2 * MIN + SEC);
      expect(ringing().textContent).toContain('Ringing · Timer');
      expect(saved(storage)).toMatchObject({ timerEndsAt: null, timerPausedMs: null, timerTotalMs: null });

      open();
      expect(ringShown()).toBe(false);
    });

    it('neither loads nor clears a real timer saved by another tab', () => {
      // A real 10 min timer ending at 10:45 — already in the past for the simulated 13:00 clock.
      storage = createFakeStorage({
        [SETTINGS_KEY]: JSON.stringify({ division: 'HS', timerEndsAt: START + 5 * MIN, timerTotalMs: 10 * MIN }),
      });
      open({ search: SIMULATED });
      expect(ringShown()).toBe(false);
      advance(2 * SEC);
      expect(ringing().hidden).toBe(true);
      pick('1 min');
      advance(MIN + SEC);
      expect(ringing().textContent).toContain('Ringing · Timer');
      expect(saved(storage)).toMatchObject({ timerEndsAt: START + 5 * MIN, timerTotalMs: 10 * MIN });

      t = START;
      open();
      expect(digits().getAttribute('aria-label')).toBe('Timer, 5:00 left of 10:00');
    });
  });

  describe('a custom time', () => {
    it('starts a timer of its minutes and seconds', () => {
      open();
      typeDuration('7', '30');
      expect(pickerOpen()).toBe(false);
      expect(digits().getAttribute('aria-label')).toBe('Timer, 7:30 left of 7:30');
      expect(saved(storage).timerEndsAt).toBe(START + 7.5 * MIN);
    });

    it('says what is wrong, marks the field and starts nothing when it is not a time', () => {
      open();
      typeDuration('5', '75');
      expect(pickerOpen()).toBe(true);
      expect(picker().textContent).toContain('Seconds go from 0 to 59.');
      expect(field('Seconds').getAttribute('aria-invalid')).toBe('true');
      expect(saved(storage).timerEndsAt ?? null).toBeNull();

      typeDuration('soon');
      expect(picker().textContent).toContain('Type minutes (like 7) or minutes:seconds (like 7:30).');
      expect(field('Minutes').getAttribute('aria-invalid')).toBe('true');
      expect(field('Seconds').hasAttribute('aria-invalid')).toBe(false);

      typeDuration('3');
      expect(ringShown()).toBe(true);
      timerControl().click();
      expect(picker().textContent).not.toContain('Type minutes');
      expect(field('Minutes').hasAttribute('aria-invalid')).toBe(false);
      expect(field('Minutes').value).toBe('');
    });

    it('the last 3 distinct ones are quick picks, most recent first, kept across reloads', () => {
      open();
      expect(quickPicks()).toEqual([]);
      for (const [m, s] of [['3', ''], ['7', '30'], ['15', ''], ['3', '00']]) typeDuration(m, s);
      expect(quickPicks()).toEqual(['3:00', '15:00', '7:30']);
      typeDuration('20');
      expect(quickPicks()).toEqual(['20:00', '3:00', '15:00']);

      open();
      expect(quickPicks()).toEqual(['20:00', '3:00', '15:00']);
    });

    it('a quick pick starts its timer and moves to the front', () => {
      open();
      typeDuration('7', '30');
      typeDuration('15');
      pick('7:30');
      expect(digits().textContent).toBe('7:30');
      expect(quickPicks()).toEqual(['7:30', '15:00']);
    });

    it('presets are not added as quick picks', () => {
      open();
      pick('5 min');
      typeDuration('5');
      expect(quickPicks()).toEqual([]);
    });
  });
});
