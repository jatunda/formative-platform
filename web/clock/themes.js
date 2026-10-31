// @ts-check
// The School Clock theme set: which palette, font and decoration
// each theme uses, each palette's own mode, and the look descriptions the
// Look sheet uses as accessible names. Colour and font values live in
// tokens.css (the default) and themes.css; the page applies a look by setting
// the attributes `lookAttributes()` gives on <html>. The catalog is the design
// reference's (.scratch/school-clock/mockups/final/themes.js); keep the two in
// step.
//
// - A theme is never named for who it's for: `look` describes what it looks
//   like, and is the only name a teacher (or a screen reader) ever gets.
// - Any theme's font can be swapped for any entry in FONTS and its palette
//   for any entry in PALETTES: every combination is contrast-checked.
// - Themes own their mode: a theme shows its palette's own version until the
//   teacher flips it. There is no "auto".

/** @typedef {'dark' | 'light'} Mode */
/** @typedef {{ id: string, native: Mode, look: string }} Palette */
/** @typedef {{ id: string, look: string }} Font */
/** @typedef {{ id: string, palette: string, font: string, deco?: string }} Theme */
/**
 * The look settings (a slice of ClockSettings).
 * @typedef {{ theme: string, fontSwap: string | null, paletteSwap: string | null, flipped: boolean }} LookSettings
 */

/** @type {readonly Palette[]} Eight are natively dark and seven light; `look` describes the own version. */
export const PALETTES = Object.freeze([
  { id: 'slate', native: 'dark', look: 'Slate blue and sky blue' },
  { id: 'ink', native: 'dark', look: 'Deep ink and teal' },
  { id: 'lab', native: 'light', look: 'Pale sage and leaf green' },
  { id: 'paper', native: 'light', look: 'Cream paper and ink blue' },
  { id: 'parchment', native: 'light', look: 'Parchment and oxblood' },
  { id: 'coast', native: 'dark', look: 'Ocean blue and coral' },
  { id: 'vesper', native: 'dark', look: 'Deep plum and gold' },
  { id: 'terminal', native: 'dark', look: 'Black and green' },
  { id: 'gallery', native: 'light', look: 'Gallery white and vermilion' },
  { id: 'stage', native: 'dark', look: 'Midnight and brass' },
  { id: 'court', native: 'light', look: 'Pale mint and forest green' },
  { id: 'team', native: 'dark', look: 'Navy and orange' },
  { id: 'blush', native: 'light', look: 'Blush pink and rose' },
  { id: 'chalk', native: 'dark', look: 'Chalkboard green' },
  { id: 'contrast', native: 'light', look: 'High contrast, black on white' },
]);

/** @type {readonly Font[]} */
export const FONTS = Object.freeze([
  { id: 'system', look: 'clean sans' },
  { id: 'condensed', look: 'bold condensed' },
  { id: 'din', look: 'engineered sans' },
  { id: 'serif', look: 'book serif' },
  { id: 'classic', look: 'old-style serif' },
  { id: 'slab', look: 'slab serif' },
  { id: 'mono', look: 'monospace' },
  { id: 'rounded', look: 'rounded sans' },
  { id: 'humanist', look: 'humanist sans' },
  { id: 'geometric', look: 'geometric sans' },
  { id: 'heavy', look: 'heavy sans' },
  { id: 'script', look: 'calligraphy labels' },
  { id: 'hand', look: 'handwritten labels' },
]);

const DECOS = Object.freeze([{ id: 'flowers', look: 'with flowers' }]);

/** @type {readonly Theme[]} The picker's order; the first is the default. */
export const THEMES = Object.freeze([
  { id: 'slate', palette: 'slate', font: 'system' },
  { id: 'ink', palette: 'ink', font: 'din' },
  { id: 'lab', palette: 'lab', font: 'rounded' },
  { id: 'paper', palette: 'paper', font: 'serif' },
  { id: 'parchment', palette: 'parchment', font: 'slab' },
  { id: 'coast', palette: 'coast', font: 'humanist' },
  { id: 'vesper', palette: 'vesper', font: 'classic' },
  { id: 'terminal', palette: 'terminal', font: 'mono' },
  { id: 'gallery', palette: 'gallery', font: 'geometric' },
  { id: 'stage', palette: 'stage', font: 'serif' },
  { id: 'court', palette: 'court', font: 'heavy' },
  { id: 'team', palette: 'team', font: 'condensed' },
  { id: 'bloom', palette: 'blush', font: 'script', deco: 'flowers' },
  { id: 'chalk', palette: 'chalk', font: 'hand' },
  { id: 'contrast', palette: 'contrast', font: 'heavy' },
]);

/** The default theme: dark muted blue with light blue-grey text. */
export const DEFAULT_THEME = 'slate';

/**
 * @template {{ id: string }} T
 * @param {readonly T[]} list @param {unknown} id
 * @returns {T | undefined}
 */
const byId = (list, id) => list.find((x) => x.id === id);

/** The theme with this id, or the default. @param {unknown} id */
export const themeById = (id) => byId(THEMES, id) ?? THEMES[0];
/** Whether `id` names a font in the swap list. @param {unknown} id */
export const isFont = (id) => byId(FONTS, id) !== undefined;
/** Whether `id` names a palette in the swap list. @param {unknown} id */
export const isPalette = (id) => byId(PALETTES, id) !== undefined;
/** Whether `id` names a theme. @param {unknown} id */
export const isTheme = (id) => byId(THEMES, id) !== undefined;

/** A palette's own mode (the default palette's for an unknown id). @param {unknown} paletteId @returns {Mode} */
export const nativeMode = (paletteId) => (byId(PALETTES, paletteId) ?? PALETTES[0]).native;

/** The mode that isn't `mode`. @param {Mode} mode @returns {Mode} */
export const otherMode = (mode) => (mode === 'dark' ? 'light' : 'dark');

/** A theme's look, its accessible name: "Navy and orange, bold condensed". @param {Theme} theme */
export function themeLook(theme) {
  const palette = byId(PALETTES, theme.palette)?.look;
  const font = byId(FONTS, theme.font)?.look;
  const deco = theme.deco ? ` ${byId(DECOS, theme.deco)?.look}` : '';
  return `${palette}${deco}, ${font}`;
}

/**
 * The palette and font a look shows: the theme's own unless swapped (an
 * unknown swap keeps the theme's own).
 * @param {LookSettings} settings
 */
export function lookParts({ theme, fontSwap, paletteSwap }) {
  const own = themeById(theme);
  return {
    theme: own,
    font: isFont(fontSwap) ? /** @type {string} */ (fontSwap) : own.font,
    palette: isPalette(paletteSwap) ? /** @type {string} */ (paletteSwap) : own.palette,
  };
}

/**
 * What <html> gets for these look settings: the mode (already resolved: the
 * palette's own, or the other while flipped), palette, font and decoration
 * ('' for none).
 * @param {LookSettings} settings
 * @returns {Record<'data-mode' | 'data-palette' | 'data-font' | 'data-deco', string>}
 */
export function lookAttributes(settings) {
  const { theme, font, palette } = lookParts(settings);
  const own = nativeMode(palette);
  return {
    'data-mode': settings.flipped ? otherMode(own) : own,
    'data-palette': palette,
    'data-font': font,
    'data-deco': theme.deco ?? '',
  };
}

/**
 * The settings change for picking a theme: its own font, palette and version,
 * and no more "Pick a theme" hint.
 * @param {string} id
 */
export function pickTheme(id) {
  return { theme: id, fontSwap: null, paletteSwap: null, flipped: false, themeHint: false };
}

/** The change for picking a font (the theme's own clears the swap). @param {LookSettings} settings @param {string} id */
export function pickFont(settings, id) {
  return { fontSwap: id === themeById(settings.theme).font ? null : id };
}

/** The change for picking a palette (the flip stays). @param {LookSettings} settings @param {string} id */
export function pickPalette(settings, id) {
  return { paletteSwap: id === themeById(settings.theme).palette ? null : id };
}

/**
 * An earlier version saved `colorScheme: 'light' | 'dark' | 'auto'`; it is now a flip.
 * 'auto' (or nothing) follows the theme; 'light' or 'dark' follows it when it
 * is the saved look's own mode and is flipped otherwise, so the clock looks
 * as it did.
 * @param {Record<string, unknown>} saved
 */
export function migrateFlipped(saved) {
  const { colorScheme } = saved;
  if (colorScheme !== 'light' && colorScheme !== 'dark') return false;
  const { palette } = lookParts({
    theme: String(saved.theme), fontSwap: null, paletteSwap: /** @type {string | null} */ (saved.paletteSwap ?? null), flipped: false,
  });
  return colorScheme !== nativeMode(palette);
}
