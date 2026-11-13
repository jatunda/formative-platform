import { describe, it, expect } from 'vitest';
import {
  DEFAULT_THEME, FONTS, PALETTES, THEMES, lookAttributes, migrateFlipped, nativeMode, pickFont, pickPalette,
  pickTheme, themeLook,
} from '../../clock/themes.js';

const look = (settings) => lookAttributes({ theme: 'slate', fontSwap: null, paletteSwap: null, flipped: false, ...settings });

describe('the theme set', () => {
  it('has 15 themes over 18 palettes and 13 fonts; the default is the dark muted blue one', () => {
    expect(THEMES).toHaveLength(15);
    expect(PALETTES).toHaveLength(18);
    expect(FONTS).toHaveLength(13);
    expect(DEFAULT_THEME).toBe('slate');
    expect(look({})).toEqual({ 'data-mode': 'dark', 'data-palette': 'slate', 'data-font': 'system', 'data-deco': '', 'data-backdrop': '' });
  });

  it('mixes light and dark palettes: 10 are natively dark and 8 light', () => {
    expect(PALETTES.filter((p) => p.native === 'dark')).toHaveLength(10);
    expect(nativeMode('paper')).toBe('light');
    expect(nativeMode('team')).toBe('dark');
    expect(nativeMode('ocean')).toBe('dark');
  });

  it('names each theme by its look, never by who it is for', () => {
    expect(themeLook(THEMES.find((t) => t.id === 'slate'))).toBe('Slate blue and sky blue, clean sans');
    expect(themeLook(THEMES.find((t) => t.id === 'team'))).toBe('Navy and orange with diagonal stripes, bold condensed');
    expect(themeLook(THEMES.find((t) => t.id === 'bloom'))).toBe('Blush pink and rose with flowers and a soft wash, calligraphy labels');
    const names = THEMES.map((t) => `${t.id} ${themeLook(t)}`).join(' ');
    expect(names).not.toMatch(/teacher|student|kid|girl|boy|science|math|english|history|art|music|drama|sport|pe\b|cs\b|for /i);
  });

  it('has the Dodgers, Lakers and VCS colours under the names Eric gave them, as swaps only', () => {
    const team = PALETTES.filter((p) => ['dodgers', 'lakers', 'vcs'].includes(p.id));
    expect(team).toEqual([
      { id: 'dodgers', native: 'light', look: 'Dodgers' },
      { id: 'lakers', native: 'dark', look: 'Lakers' },
      { id: 'vcs', native: 'dark', look: 'VCS' },
    ]);
    expect(THEMES.filter((t) => ['dodgers', 'lakers', 'vcs'].includes(t.palette))).toEqual([]);
    expect(look({ paletteSwap: 'lakers' })).toMatchObject({ 'data-mode': 'dark', 'data-palette': 'lakers', 'data-font': 'system' });
    expect(look({ paletteSwap: 'dodgers', flipped: true })['data-mode']).toBe('dark');
  });

  it('shows a theme in its own version, with its font, decoration and backdrop', () => {
    expect(look({ theme: 'paper' })).toEqual({ 'data-mode': 'light', 'data-palette': 'paper', 'data-font': 'serif', 'data-deco': '', 'data-backdrop': 'ruled' });
    expect(look({ theme: 'bloom' })['data-deco']).toBe('flowers');
    expect(look({ theme: 'lab' })['data-backdrop']).toBe('graph');
  });

  it('shows the other version while flipped', () => {
    expect(look({ theme: 'paper', flipped: true })['data-mode']).toBe('dark');
    expect(look({ flipped: true })['data-mode']).toBe('light');
  });

  it('swaps the font or palette; a swapped palette shows its own version (or the other one while flipped)', () => {
    expect(look({ theme: 'bloom', fontSwap: 'mono', paletteSwap: 'team' })).toEqual({
      'data-mode': 'dark', 'data-palette': 'team', 'data-font': 'mono', 'data-deco': 'flowers', 'data-backdrop': 'wash',
    });
    expect(look({ paletteSwap: 'paper', flipped: true })['data-mode']).toBe('dark');
  });

  it('falls back to the default theme and its own font and palette for ids it does not know', () => {
    expect(look({ theme: 'chalkboard', fontSwap: 'serif-1', paletteSwap: 'ocean' }))
      .toEqual(look({}));
  });

  describe('choosing', () => {
    const settings = { theme: 'bloom', fontSwap: 'mono', paletteSwap: 'team', flipped: true, themeHint: true };

    it('picking a theme drops the swaps, shows its own version and ends the hint', () => {
      expect(pickTheme('ink')).toEqual({ theme: 'ink', fontSwap: null, paletteSwap: null, flipped: false, themeHint: false });
    });

    it('picking a font or palette swaps it, keeping the flip; picking the theme\'s own clears the swap', () => {
      expect(pickFont(settings, 'serif')).toEqual({ fontSwap: 'serif' });
      expect(pickFont(settings, 'script')).toEqual({ fontSwap: null });
      expect(pickPalette(settings, 'coast')).toEqual({ paletteSwap: 'coast' });
      expect(pickPalette(settings, 'blush')).toEqual({ paletteSwap: null });
    });
  });

  describe("16's light / dark / auto setting", () => {
    it('becomes "follow the theme" for auto, or when it matches the theme\'s own mode', () => {
      expect(migrateFlipped({ colorScheme: 'auto', theme: 'slate' })).toBe(false);
      expect(migrateFlipped({ colorScheme: 'dark', theme: 'slate' })).toBe(false);
      expect(migrateFlipped({ colorScheme: 'light', theme: 'paper' })).toBe(false);
    });

    it('becomes "flipped" when it is the other mode, so the clock looks as it did', () => {
      expect(migrateFlipped({ colorScheme: 'light', theme: 'slate' })).toBe(true);
      expect(migrateFlipped({ colorScheme: 'light', theme: 'default' })).toBe(true);
      expect(migrateFlipped({ colorScheme: 'dark', theme: 'slate', paletteSwap: 'paper' })).toBe(true);
    });

    it('is ignored when missing or not a mode', () => {
      expect(migrateFlipped({})).toBe(false);
      expect(migrateFlipped({ colorScheme: 'sepia', theme: 7 })).toBe(false);
    });
  });
});
