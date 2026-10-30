// The School Clock theme catalog: which palette, font and decoration each
// theme uses, and the look descriptions the picker uses as accessible names.
// Colour and font values live in tokens.css (the default) and themes.css.
//
// Rules (DESIGN.md, "Theme set"):
// - A theme is never named for who it's for. `look` describes what it looks
//   like, and is the only name a teacher (or a screen reader) ever gets.
// - Any theme's font can be swapped for any entry in FONTS and its palette for
//   any entry in PALETTES: every combination is contrast-checked.
// - The decoration belongs to the theme and stays through swaps; it is drawn
//   in the palette's --deco colours.
//
// Works as a browser script (window.ClockThemes) and in Node (module.exports),
// so the real page can turn it into a // @ts-check ES module unchanged.
(function (root) {
  // `native` is the palette's own mode: the version a theme using it shows
  // until the teacher flips it. Eight are dark and seven light. Every palette
  // also has its other version (themes.css), which the flip switch shows.
  // `look` describes the native version.
  const PALETTES = [
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
  ];

  const FONTS = [
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
  ];

  const DECOS = [{ id: 'flowers', look: 'with flowers' }];

  // Order is the picker's order. The first is the default.
  const THEMES = [
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
  ];

  const byId = (list, id) => list.find((x) => x.id === id);

  /** The look description of a theme, used as its accessible name. */
  function themeLook(theme) {
    const p = byId(PALETTES, theme.palette).look;
    const f = byId(FONTS, theme.font).look;
    const d = theme.deco ? ` ${byId(DECOS, theme.deco).look}` : '';
    return `${p}${d}, ${f}`;
  }

  /** A palette's own mode: "dark" or "light". */
  const nativeMode = (paletteId) => (byId(PALETTES, paletteId) || PALETTES[0]).native;

  /**
   * What <html> gets for a theme with optional swaps.
   * - The mode is the (possibly swapped) palette's native mode, or its other
   *   version when `flip` is true. Picking a theme clears `flip`; swapping
   *   the palette keeps it. There is no "auto".
   * - `mode` ("dark" | "light") overrides both. Only the mockup's checks use
   *   it, to render every palette in both versions.
   */
  function themeAttributes({ theme = 'slate', font, palette, flip = false, mode } = {}) {
    const t = byId(THEMES, theme) || THEMES[0];
    const f = byId(FONTS, font) ? font : t.font;
    const p = byId(PALETTES, palette) ? palette : t.palette;
    const own = nativeMode(p);
    const other = own === 'dark' ? 'light' : 'dark';
    const m = mode === 'light' || mode === 'dark' ? mode : flip ? other : own;
    return { 'data-mode': m, 'data-palette': p, 'data-font': f, 'data-deco': t.deco || '' };
  }

  const api = { PALETTES, FONTS, DECOS, THEMES, themeLook, themeAttributes, nativeMode, DEFAULT_THEME: 'slate' };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ClockThemes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
