import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';
import { accessibleName, field, isShown, setValue, toggle } from '../helpers/clock-dom.js';

const SEC = 1000;
const mount = () => document.getElementById('clockApp');
/** A shown button by its accessible name. */
const button = (name) => [...mount().querySelectorAll('button')].find((b) => accessibleName(b) === name && isShown(b));
const drawer = () => mount().querySelector('[role="dialog"][aria-labelledby]');
const drawerOpen = () => isShown(drawer());
const saved = (storage) => JSON.parse(storage.getItem(SETTINGS_KEY));
const stageText = () => mount().querySelector('.clock-stage').textContent.replace(/\s+/g, ' ').trim();
const readoutTexts = () => [...mount().querySelectorAll('.clock-readout__face')]
  .map((face) => face.textContent.replace(/\s+/g, ' ').trim());
const press = (key, options = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  (document.activeElement ?? document.body).dispatchEvent(event);
  return event;
};
/** The drawer's buttons, links and fields a Tab can reach, in order. */
const tabStops = () => [...drawer().querySelectorAll('button, a[href], input, select')]
  .filter((n) => isShown(n) && !n.disabled && !(n.type === 'radio' && !n.checked));

// Tue 2026-10-27 is an All Day: Period 3 runs 9:30–11:15 for HS.
const at = (h, m, s = 0) => new Date(2026, 9, 27, h, m, s);

describe('School Clock settings drawer', () => {
  let app;
  let storage;
  let player;
  let t;

  /** Open the page on an HS device with `settings` saved, at `when`. */
  function open({ when = at(10, 32), settings = {} } = {}) {
    app?.destroy();
    t = when.getTime();
    storage = createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ division: 'HS', ...settings }) });
    player = createFakeSoundPlayer({ state: 'running' });
    app = initClockApp({ realNow: () => t, storage, tabStorage: createFakeStorage(), soundPlayer: player, capabilities: {} });
  }
  const advance = (ms) => { t += ms; vi.advanceTimersByTime(ms); };

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="clockApp"></div>';
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.useRealTimers();
  });

  describe('opening and closing', () => {
    it('opens from the labelled Settings button as a modal dialog, with focus inside', () => {
      open();
      const settingsButton = button('Settings');
      expect(drawerOpen()).toBe(false);
      expect(settingsButton.getAttribute('aria-expanded')).toBe('false');
      expect(settingsButton.getAttribute('aria-controls')).toBe(drawer().id);

      settingsButton.click();

      expect(drawerOpen()).toBe(true);
      expect(drawer().getAttribute('aria-modal')).toBe('true');
      expect(accessibleName(drawer())).toBe('Settings');
      expect(settingsButton.getAttribute('aria-expanded')).toBe('true');
      expect(drawer().contains(document.activeElement)).toBe(true);
      // The rest of the page can't be reached while it's open.
      expect(mount().querySelector('.clock-screen').hasAttribute('inert')).toBe(true);
    });

    it('closes with Escape, the Close button or the scrim, and focus goes back to the Settings button', () => {
      open();
      button('Settings').click();
      expect(press('Escape').defaultPrevented).toBe(true);
      expect(drawerOpen()).toBe(false);
      expect(document.activeElement).toBe(button('Settings'));
      expect(button('Settings').getAttribute('aria-expanded')).toBe('false');
      expect(mount().querySelector('.clock-screen').hasAttribute('inert')).toBe(false);

      button('Settings').click();
      button('Close settings').click();
      expect(drawerOpen()).toBe(false);
      expect(document.activeElement).toBe(button('Settings'));

      button('Settings').click();
      mount().querySelector('.clock-scrim').click();
      expect(drawerOpen()).toBe(false);
    });

    it('ignores other keys, and Escape once it is closed', () => {
      open();
      button('Settings').click();
      expect(press('a').defaultPrevented).toBe(false);
      expect(drawerOpen()).toBe(true);
      button('Close settings').click();
      expect(press('Escape').defaultPrevented).toBe(false);
    });

    it('keeps Tab inside: past the last control it wraps to the first, and Shift+Tab back again', () => {
      open();
      button('Settings').click();
      const stops = tabStops();
      expect(stops[0]).toBe(button('Close settings'));

      stops.at(-1).focus();
      expect(press('Tab').defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(stops[0]);
      expect(press('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(stops.at(-1));

      // In between, the browser moves focus as usual.
      stops[1].focus();
      expect(press('Tab').defaultPrevented).toBe(false);
      expect(press('Tab', { shiftKey: true }).defaultPrevented).toBe(false);

      // Focus that somehow got outside comes straight back in.
      button('Readouts').focus();
      press('Tab');
      expect(document.activeElement).toBe(stops[0]);
      button('Readouts').focus();
      press('Tab', { shiftKey: true });
      expect(document.activeElement).toBe(stops.at(-1));
    });

    it('closes the timer panel when it opens', () => {
      open();
      button('Timer').click();
      button('Settings').click();
      expect(isShown(mount().querySelector('[aria-label="Timer"]'))).toBe(false);
      expect(button('Timer').getAttribute('aria-expanded')).toBe('false');
    });

    it('opens at the Division from the Division chip, with focus on the chosen Division, and returns focus to the chip', () => {
      open();
      const chip = button('Division: HS, switch Division');
      chip.click();
      expect(drawerOpen()).toBe(true);
      expect(document.activeElement).toBe(field('High School'));
      press('Escape');
      expect(document.activeElement).toBe(chip);
    });

    it('is left out of the projected view while closed', () => {
      open();
      expect(mount().querySelector('.clock-screen').contains(drawer())).toBe(false);
      expect(isShown(field('Show seconds'))).toBe(false);
    });
  });

  describe('its sections', () => {
    it('are, in order: Division, Time, Sound, Period Labels, Alarms, Next rings today, About and (until the Look sheet, ticket 21) Bottom bar, each headed and named', () => {
      open();
      const sections = [...drawer().querySelectorAll('section')];
      expect(sections.map((s) => accessibleName(s))).toEqual(
        ['Division', 'Time', 'Sound', 'Period Labels', 'Alarms', 'Next rings today', 'About', 'Bottom bar']);
      for (const section of sections) {
        expect(section.querySelector('h3').textContent).toBe(accessibleName(section));
        expect(section.id).toMatch(/^clock-settings-/);
      }
    });

    it('drops the Next rings today section when nothing is left to ring today', () => {
      open({ when: at(16, 0) });
      const sections = [...drawer().querySelectorAll('section')].filter(isShown);
      expect(sections.map((s) => accessibleName(s))).not.toContain('Next rings today');
    });
  });

  describe('each setting', () => {
    it('Division: a choice of two, saved, and followed at once', () => {
      // Wed 10/28/26, an Even Day: at 10:30 HS is in Chapel, MS in Period 4.
      open({ when: new Date(2026, 9, 28, 10, 30) });
      button('Settings').click();
      expect(field('High School').checked).toBe(true);
      expect(field('High School').type).toBe('radio');
      expect(field('Middle School').name).toBe(field('High School').name);

      field('Middle School').click();

      expect(saved(storage).division).toBe('MS');
      expect(stageText()).toContain('Period 4');
      expect(button('Division: MS, switch Division')).toBeDefined();
    });

    it('Show seconds: a switch, saved, shown at once', () => {
      open({ when: at(10, 32, 30) });
      expect(field('Show seconds').getAttribute('role')).toBe('switch');
      expect(field('Show seconds').checked).toBe(true);
      toggle('Show seconds');
      expect(saved(storage).showSeconds).toBe(false);
      expect(readoutTexts()).toEqual(['42 min left']);
    });

    it('24-hour time: a switch with a hint that follows it, saved, shown at once', () => {
      open({ when: at(8, 0) });
      const hint = () => document.getElementById(field('24-hour time').getAttribute('aria-describedby')).textContent;
      expect(hint()).toBe('Clock times show as 1:05.');
      expect(stageText()).toContain('8:30 AM');

      toggle('24-hour time');

      expect(saved(storage).use24Hour).toBe(true);
      expect(hint()).toBe('Clock times show as 13:05.');
      expect(stageText()).toContain('08:30');
    });

    it('Bells: a switch, kept in step with the top bar Bells button', () => {
      open();
      expect(field('Bells').getAttribute('role')).toBe('switch');
      expect(field('Bells').checked).toBe(true);
      toggle('Bells');
      expect(saved(storage).bells.on).toBe(false);
      expect(button('Bells').getAttribute('aria-pressed')).toBe('false');
      button('Bells').click();
      expect(field('Bells').checked).toBe(true);
    });

    it('Volume: a slider showing its value, saved, and set on the player at once', () => {
      open({ settings: { volume: 0.7 } });
      const value = () => drawer().querySelector('.clock-field__value').textContent;
      expect(field('Volume').value).toBe('70');
      expect(value()).toBe('70%');
      setValue('Volume', '35');
      expect(value()).toBe('35%');
      expect(player.volume).toBe(0.35);
      expect(saved(storage).volume).toBe(0.35);
    });

    it('Bell sound and Timer sound: each saved, each with a Preview of the voice chosen', () => {
      open();
      expect(field('Bell sound').value).toBe('schoolBell');
      expect(field('Timer sound').value).toBe('beep');

      setValue('Bell sound', 'chime');
      setValue('Timer sound', 'buzzer');
      button('Settings').click();
      button('Preview Bell sound').click();
      button('Preview Timer sound').click();

      expect(saved(storage).bells).toEqual({ on: true, sound: 'chime' });
      expect(saved(storage).timerSound).toBe('buzzer');
      expect(player.played.map((p) => p.sound)).toEqual(['chime', 'buzzer']);
      expect(drawer().textContent).toContain('3:10 PM · Bell · Period 7 ends · Chime');
    });

    it('Period Labels: one field per Period, two to a row, shown at once and saved', () => {
      open();
      expect(drawer().querySelectorAll('.clock-labels-grid input')).toHaveLength(9);
      expect(field('Period 3').placeholder).toBe('Add a label');
      setValue('Period 3', 'AP CSA');
      expect(mount().querySelector('h1').textContent.replace(/\s+/g, ' ')).toBe('Period 3 · AP CSA');
      expect(saved(storage).periodLabels).toEqual({ 'Period 3': 'AP CSA' });
    });

    it('Test ring: plays the Bell sound and shows the ring', () => {
      open();
      button('Settings').click();
      button('Test ring').click();
      expect(player.played).toEqual([{ sound: 'schoolBell', repeat: false }]);
      expect(mount().querySelector('[role="alertdialog"]').hidden).toBe(false);
      advance(4 * SEC);
    });

    it('has no look settings (they belong to the Look sheet)', () => {
      open();
      expect(field('Day Strip')).toBeUndefined();
      expect(drawer().textContent).not.toMatch(/theme|font|palette/i);
    });

    it('every control is labelled', () => {
      open();
      for (const control of drawer().querySelectorAll('input, select, button, a')) {
        expect(accessibleName(control)).not.toBe('');
      }
    });
  });
});
