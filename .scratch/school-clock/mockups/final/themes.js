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
  const PALETTES = [
    { id: 'slate', look: 'Slate blue and sky blue' },
    { id: 'ink', look: 'Deep ink and teal' },
    { id: 'lab', look: 'Charcoal and lime' },
    { id: 'paper', look: 'Cream paper and ink blue' },
    { id: 'parchment', look: 'Parchment and oxblood' },
    { id: 'coast', look: 'Ocean blue and coral' },
    { id: 'vesper', look: 'Deep plum and gold' },
    { id: 'terminal', look: 'Black and green' },
    { id: 'gallery', look: 'Charcoal and vermilion' },
    { id: 'stage', look: 'Midnight and brass' },
    { id: 'court', look: 'Forest green and gold' },
    { id: 'team', look: 'Navy and orange' },
    { id: 'blush', look: 'Blush pink and rose' },
    { id: 'chalk', look: 'Chalkboard green' },
    { id: 'contrast', look: 'High contrast black and white' },
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

  /**
   * What <html> gets for a theme with optional swaps. `mode` is "dark" or
   * "light" (the page resolves "auto" with matchMedia first).
   */
  function themeAttributes({ theme = 'slate', font, palette, mode = 'dark' } = {}) {
    const t = byId(THEMES, theme) || THEMES[0];
    const f = byId(FONTS, font) ? font : t.font;
    const p = byId(PALETTES, palette) ? palette : t.palette;
    return { 'data-mode': mode === 'light' ? 'light' : 'dark', 'data-palette': p, 'data-font': f, 'data-deco': t.deco || '' };
  }

  const api = { PALETTES, FONTS, DECOS, THEMES, themeLook, themeAttributes, DEFAULT_THEME: 'slate' };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ClockThemes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
