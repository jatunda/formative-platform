import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from '../helpers/fake-storage.js';
import { createFakeSoundPlayer } from '../helpers/fake-sound-player.js';
import { createFakePictureInPicture } from '../helpers/fake-screen.js';

const mount = () => document.getElementById('clockApp');
const html = () => document.documentElement;
const isShown = (node) => !node.closest('[hidden]');
const nameOf = (node) => (node.getAttribute('aria-label') ?? node.textContent.replace(/\s+/g, ' ').trim());
/** A visible button by its accessible name (its aria-label, else its text). */
const button = (name, root = mount()) => [...root.querySelectorAll('button')]
  .find((b) => nameOf(b) === name && isShown(b));
const look = () => ({
  mode: html().getAttribute('data-mode'),
  palette: html().getAttribute('data-palette'),
  font: html().getAttribute('data-font'),
  deco: html().getAttribute('data-deco'),
});
/** The dialog named "Look". */
const sheet = () => [...mount().querySelectorAll('[role="dialog"]')]
  .find((d) => document.getElementById(d.getAttribute('aria-labelledby'))?.textContent === 'Look');
/** A label's text as a screen reader hears it (without its aria-hidden parts). */
const heardName = (label) => {
  const copy = label.cloneNode(true);
  copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return copy.textContent.replace(/\s+/g, ' ').trim();
};
/** The radios of one group in the Look sheet ("Theme", "Font", "Colours"), with their names. */
const radios = (group) => {
  const fieldset = [...sheet().querySelectorAll('fieldset')]
    .find((f) => f.querySelector('legend').textContent === group);
  return [...fieldset.querySelectorAll('input[type="radio"]')].map((input) => ({
    input, name: heardName(input.closest('label')),
  }));
};
const choose = (group, name) => {
  const radio = radios(group).find((r) => r.name === name);
  if (!radio) throw new Error(`no ${group} named ${name}`);
  radio.input.checked = true;
  radio.input.dispatchEvent(new Event('change', { bubbles: true }));
};
const flipSwitch = () => sheet().querySelector('input[role="switch"]');
const flipLabel = () => flipSwitch().closest('label').textContent;
const toggleFlip = () => {
  flipSwitch().checked = !flipSwitch().checked;
  flipSwitch().dispatchEvent(new Event('change', { bubbles: true }));
};
const key = (target, k, init = {}) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
const hint = () => [...mount().querySelectorAll('[role="note"]')].find((n) => n.textContent.includes('Pick a theme'));
const saved = (storage) => JSON.parse(storage.getItem(SETTINGS_KEY));

// Tue 2026-10-27, in Period 3.
const AT = new Date(2026, 9, 27, 10, 32).getTime();

describe('School Clock look', () => {
  let app;
  let storage;
  let pip;

  function open() {
    app?.destroy();
    pip = createFakePictureInPicture();
    app = initClockApp({
      realNow: () => AT, storage, tabStorage: createFakeStorage(),
      soundPlayer: createFakeSoundPlayer({ state: 'running' }), prefersReducedMotion: () => false,
      capabilities: { fullscreen: null, wakeLock: null, pictureInPicture: pip },
    });
  }
  const withSettings = (settings) => {
    storage = createFakeStorage({ [SETTINGS_KEY]: JSON.stringify({ division: 'HS', themeHint: false, ...settings }) });
  };
  const openLook = () => {
    button('Look').click();
    return sheet();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    withSettings({});
    document.body.innerHTML = '<div id="clockApp"></div>';
    for (const name of ['data-mode', 'data-palette', 'data-font', 'data-deco']) html().removeAttribute(name);
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.useRealTimers();
  });

  it('shows the dark muted blue theme by default', () => {
    open();
    expect(look()).toEqual({ mode: 'dark', palette: 'slate', font: 'system', deco: null });
  });

  it('shows the saved theme, swaps and flip', () => {
    withSettings({ theme: 'bloom', fontSwap: 'mono', paletteSwap: 'team', flipped: true });
    open();
    expect(look()).toEqual({ mode: 'light', palette: 'team', font: 'mono', deco: 'flowers' });
  });

  it("turns 16's saved light / dark / auto into the flip without errors", () => {
    withSettings({ theme: 'default', colorScheme: 'light' });
    open();
    expect(look()).toMatchObject({ mode: 'light', palette: 'slate' });
    withSettings({ theme: 'default', colorScheme: 'auto', fontSwap: 'serif-1' });
    open();
    expect(look()).toMatchObject({ mode: 'dark', palette: 'slate', font: 'system' });
  });

  describe('the Look sheet', () => {
    it('opens from Look in the top bar, between Readouts and Settings, as a dialog that takes focus', () => {
      open();
      const names = [...mount().querySelectorAll('.clock-controls .clock-control')].map(nameOf);
      expect(names.indexOf('Look')).toBe(names.indexOf('Readouts') + 1);
      expect(names.indexOf('Settings')).toBe(names.indexOf('Look') + 1);
      expect(button('Look').getAttribute('aria-haspopup')).toBe('dialog');
      expect(button('Look').getAttribute('aria-expanded')).toBe('false');
      expect(sheet().hidden).toBe(true);
      openLook();
      expect(sheet().hidden).toBe(false);
      expect(sheet().getAttribute('aria-modal')).toBe('true');
      expect(sheet().contains(document.activeElement)).toBe(true);
      expect(button('Look').getAttribute('aria-expanded')).toBe('true');
      // The clock stays visible beside it: no scrim, and the stage makes room.
      expect(mount().querySelector('.clock-screen').classList.contains('has-sheet')).toBe(true);
      expect(isShown(mount().querySelector('.clock-stage'))).toBe(true);
    });

    it('closes on Escape, with Close, or by clicking the clock, and focus goes back to Look', () => {
      open();
      openLook();
      key(document.activeElement, 'Escape');
      expect(sheet().hidden).toBe(true);
      expect(document.activeElement).toBe(button('Look'));
      expect(mount().querySelector('.clock-screen').classList.contains('has-sheet')).toBe(false);

      openLook();
      button('Close Look').click();
      expect(sheet().hidden).toBe(true);
      expect(document.activeElement).toBe(button('Look'));

      openLook();
      // The sheet's scrim is clear: the clock shows through it, and a click on it closes the sheet.
      mount().querySelector('.clock-look-scrim').click();
      expect(sheet().hidden).toBe(true);
      expect(document.activeElement).toBe(button('Look'));
      // Clicking inside it doesn't.
      openLook();
      sheet().click();
      expect(sheet().hidden).toBe(false);
    });

    it('keeps focus inside: Tab from the last control goes to the first, Shift+Tab from the first to the last', () => {
      open();
      openLook();
      // A radio group is one stop (its chosen radio); the last stop is the chosen colour.
      const first = button('Close Look');
      const last = radios('Colours').find((r) => r.input.checked).input;
      last.focus();
      key(last, 'Tab');
      expect(document.activeElement).toBe(first);
      key(first, 'Tab', { shiftKey: true });
      expect(document.activeElement).toBe(last);
    });

    it('Escape in the sheet leaves Readouts edit mode alone', () => {
      open();
      button('Readouts').click();
      openLook();
      key(document.activeElement, 'Escape');
      expect(button('Done')).toBeDefined();
    });

    it('has the place for the bar setting (whole day / just this Segment)', () => {
      open();
      expect(openLook().querySelector('.clock-look__bar')).not.toBeNull();
    });
  });

  describe('themes', () => {
    it('shows all 15 themes as previews named by their look, with the current one chosen', () => {
      open();
      openLook();
      const themes = radios('Theme');
      expect(themes).toHaveLength(15);
      expect(themes.map((t) => t.name)).toContain('Navy and orange, bold condensed');
      expect(themes.filter((t) => t.input.checked).map((t) => t.name)).toEqual(['Slate blue and sky blue, clean sans']);
      // Each preview draws itself in its theme's own version.
      const preview = themes.find((t) => t.name.startsWith('Cream paper')).input.closest('label');
      expect(preview.dataset).toMatchObject({ mode: 'light', palette: 'paper', font: 'serif' });
      // The visible text is the sample only, never a name.
      expect(preview.querySelector('[aria-hidden="true"]').textContent.replace(/\s+/g, ' ').trim()).toBe('Period 3 42:17');
    });

    it('picking one shows it at once, in its own version, and is saved for the next visit', () => {
      withSettings({ fontSwap: 'mono', flipped: true });
      open();
      openLook();
      choose('Theme', 'Cream paper and ink blue, book serif');
      expect(look()).toEqual({ mode: 'light', palette: 'paper', font: 'serif', deco: null });
      expect(saved(storage)).toMatchObject({ theme: 'paper', fontSwap: null, paletteSwap: null, flipped: false });
      open();
      expect(look()).toMatchObject({ palette: 'paper', mode: 'light' });
    });

    it('a theme with a decoration draws it in the corners', () => {
      open();
      openLook();
      choose('Theme', 'Blush pink and rose with flowers, calligraphy labels');
      expect(look().deco).toBe('flowers');
      expect(mount().querySelectorAll('.clock-screen > .clock-deco')).toHaveLength(2);
    });
  });

  describe('the flip switch', () => {
    it('shows the other version of a dark theme as "Light version", and a light one as "Dark version"', () => {
      open();
      openLook();
      expect(flipLabel()).toContain('Light version');
      expect(flipSwitch().checked).toBe(false);
      toggleFlip();
      expect(look().mode).toBe('light');
      expect(saved(storage).flipped).toBe(true);
      expect(flipLabel()).toContain('Light version');
      choose('Theme', 'Pale sage and leaf green, rounded sans');
      expect(look().mode).toBe('light');
      expect(flipSwitch().checked).toBe(false);
      expect(flipLabel()).toContain('Dark version');
    });
  });

  describe('swaps', () => {
    it('lists every font and palette, marking the theme\'s own', () => {
      open();
      openLook();
      expect(radios('Font')).toHaveLength(13);
      expect(radios('Colours')).toHaveLength(15);
      expect(radios('Font').find((r) => r.input.checked).name).toBe("Clean sans (the theme’s own)");
      expect(radios('Colours').find((r) => r.input.checked).name).toBe("Slate blue and sky blue (the theme’s own)");
    });

    it('swaps the font and the palette, keeps the flip, saves, and can go back to the theme\'s own', () => {
      withSettings({ theme: 'bloom', flipped: true });
      open();
      openLook();
      expect(button('Use the theme’s own font and colours')).toBeUndefined();
      choose('Font', 'Monospace');
      choose('Colours', 'Navy and orange');
      expect(look()).toEqual({ mode: 'light', palette: 'team', font: 'mono', deco: 'flowers' });
      expect(saved(storage)).toMatchObject({ theme: 'bloom', fontSwap: 'mono', paletteSwap: 'team', flipped: true });
      // A palette dot shows what picking it would give: here, flipped.
      const dot = radios('Colours').find((r) => r.name.startsWith('Cream paper')).input.closest('label');
      expect(dot.dataset).toMatchObject({ palette: 'paper', mode: 'dark' });
      open();
      expect(look()).toMatchObject({ palette: 'team', font: 'mono' });
      openLook();
      button('Use the theme’s own font and colours').click();
      expect(look()).toEqual({ mode: 'dark', palette: 'blush', font: 'script', deco: 'flowers' });
      expect(saved(storage)).toMatchObject({ fontSwap: null, paletteSwap: null, flipped: true });
    });
  });

  describe('the "Pick a theme" hint', () => {
    const firstVisit = () => { storage = createFakeStorage(); };

    it('shows after the Division prompt on a first visit, and goes once a theme is picked', () => {
      firstVisit();
      open();
      expect(hint() && isShown(hint())).toBeFalsy();
      button('High School').click();
      expect(isShown(hint())).toBe(true);
      expect(button('Look').classList.contains('is-hinted')).toBe(true);
      openLook();
      choose('Theme', 'Deep ink and teal, engineered sans');
      expect(hint() && isShown(hint())).toBeFalsy();
      open();
      expect(hint() && isShown(hint())).toBeFalsy();
    });

    it('goes when dismissed, for good', () => {
      firstVisit();
      open();
      button('High School').click();
      button('Dismiss the theme hint').click();
      expect(hint() && isShown(hint())).toBeFalsy();
      expect(button('Look').classList.contains('is-hinted')).toBe(false);
      expect(saved(storage).themeHint).toBe(false);
      open();
      expect(hint() && isShown(hint())).toBeFalsy();
    });

    it('stays while the sheet is only opened and closed', () => {
      firstVisit();
      open();
      button('High School').click();
      openLook();
      button('Close Look').click();
      expect(isShown(hint())).toBe(true);
    });
  });

  it('the mini player follows the look', async () => {
    withSettings({ theme: 'paper' });
    open();
    button('Mini player').click();
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
    const doc = pip.window.document;
    expect([...doc.head.querySelectorAll('link')].map((l) => l.getAttribute('href'))).toContain('/clock/themes.css');
    expect(doc.documentElement.dataset).toMatchObject({ mode: 'light', palette: 'paper', font: 'serif' });
    openLook();
    choose('Theme', 'Navy and orange, bold condensed');
    expect(doc.documentElement.dataset).toMatchObject({ mode: 'dark', palette: 'team', font: 'condensed' });
  });
});
