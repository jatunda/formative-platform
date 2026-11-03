// The theme tokens' contrast check, no browser needed (adapted from the design
// reference's .scratch/school-clock/mockups/final/contrast.mjs). Reads the
// default palette from tokens.css and every other one from themes.css, checks
// each block sets every colour token, and checks every colour pair the design
// uses, in both versions of every palette. A font doesn't change a colour
// ratio, so these hold for every font; the rendered axe sweep (see ticket 21's
// Comments) covers each font's size and weight.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { FONTS, PALETTES } from '../../clock/themes.js';

const clockDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../clock');
const read = (file) => readFileSync(resolve(clockDir, file), 'utf8');

const TOKENS = ['bg', 'surface', 'surface-2', 'fg', 'muted', 'line', 'line-soft', 'accent', 'accent-text',
  'on-accent', 'focus', 'ring', 'on-ring', 'track', 'digits', 'deco', 'deco-2'];

/** Each rule's selector and custom properties. @param {string} css */
function blocks(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let m;
  while ((m = re.exec(plain))) {
    const vars = {};
    for (const d of m[2].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
    out.push({ sel: m[1].trim().replace(/\s+/g, ' '), vars });
  }
  return out;
}

const pick = (vars) => Object.fromEntries(TOKENS.filter((t) => t in vars).map((t) => [t, vars[t]]));

function loadPalettes() {
  const tokens = blocks(read('tokens.css'));
  const palettes = {
    slate: {
      dark: pick(tokens.find((b) => b.sel === ':root, [data-palette="slate"]').vars),
      light: pick(tokens.find((b) => b.sel === ':root[data-mode="light"], [data-palette="slate"][data-mode="light"]').vars),
    },
  };
  for (const b of blocks(read('themes.css'))) {
    const m = b.sel.match(/^\[data-palette="([a-z0-9-]+)"\](\[data-mode="light"\])?$/);
    if (m) (palettes[m[1]] ||= {})[m[2] ? 'light' : 'dark'] = pick(b.vars);
  }
  return palettes;
}

// WCAG 2.x relative luminance.
const hex = (h) => {
  let s = h.replace('#', '');
  if (s.length === 3) s = [...s].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const over = (top, alpha, under) => top.map((c, i) => Math.round(c * alpha + under[i] * (1 - alpha)));

// The derived mixes in tokens.css, per mode.
const MIX = { dark: { soft: 0.16, wash: 0.14 }, light: { soft: 0.12, wash: 0.1 } };
const TEXT = 4.5;
const UI = 3;
// [what, foreground, background, minimum]; a background can be ['mix', token, amount, under].
const PAIRS = [
  ['text on page', 'fg', 'bg', TEXT],
  ['text on surface', 'fg', 'surface', TEXT],
  ['text on surface-2', 'fg', 'surface-2', TEXT],
  ['digits on page', 'digits', 'bg', TEXT],
  ['digits during a ring (wash)', 'digits', ['mix', 'ring', 'wash', 'bg'], TEXT],
  ['text on the current Segment', 'fg', ['mix', 'accent', 'soft', 'surface'], TEXT],
  ['muted on page', 'muted', 'bg', TEXT],
  ['muted on surface', 'muted', 'surface', TEXT],
  ['muted on surface-2', 'muted', 'surface-2', TEXT],
  ['accent text on page', 'accent-text', 'bg', TEXT],
  ['accent text on surface', 'accent-text', 'surface', TEXT],
  ['accent text on surface-2', 'accent-text', 'surface-2', TEXT],
  ['text on accent fill', 'on-accent', 'accent', TEXT],
  ['ring card text', 'on-ring', 'ring', TEXT],
  ['"Now" pill (bg on fg)', 'bg', 'fg', TEXT],
  ['control border on page', 'line', 'bg', UI],
  ['control border on surface', 'line', 'surface', UI],
  ['control border on surface-2', 'line', 'surface-2', UI],
  ['accent fill on page', 'accent', 'bg', UI],
  ['accent fill on surface', 'accent', 'surface', UI],
  ['accent fill on surface-2', 'accent', 'surface-2', UI],
  ['progress fill on track', 'accent', 'track', UI],
  ['focus ring on page', 'focus', 'bg', UI],
  ['focus ring on surface', 'focus', 'surface', UI],
  ['focus ring on surface-2', 'focus', 'surface-2', UI],
  ['ringing frame on page', 'ring', 'bg', UI],
];

describe('the theme tokens', () => {
  const palettes = loadPalettes();

  it('have a block for every palette in the catalog, and no other', () => {
    expect(Object.keys(palettes).sort()).toEqual(PALETTES.map((p) => p.id).sort());
  });

  describe.each(PALETTES.flatMap((p) => [[p.id, 'dark'], [p.id, 'light']]))('%s, %s version', (id, mode) => {
    const p = palettes[id]?.[mode];

    it('sets every colour token', () => {
      expect(TOKENS.filter((t) => !(t in (p ?? {})))).toEqual([]);
    });

    it.each(PAIRS)('%s passes', (what, fg, bg, min) => {
      const colour = (spec) => (Array.isArray(spec)
        ? over(hex(p[spec[1]]), MIX[mode][spec[2]], hex(p[spec[3]]))
        : hex(p[spec]));
      expect(ratio(colour(fg), colour(bg))).toBeGreaterThanOrEqual(min);
    });
  });

  describe('fonts', () => {
    const fontBlocks = Object.fromEntries(blocks(read('themes.css'))
      .map((b) => [b.sel.match(/^\[data-font="([a-z]+)"\]$/)?.[1], b.vars])
      .filter(([font]) => font));

    it('have a block for every swap but the default (in tokens.css)', () => {
      expect(Object.keys(fontBlocks).sort()).toEqual(FONTS.map((f) => f.id).filter((f) => f !== 'system').sort());
    });

    it.each(Object.keys(fontBlocks))('%s: the big digits use a readable face, never a decorative one', (font) => {
      const digits = fontBlocks[font]['font-digits'];
      expect(digits).not.toMatch(/cursive|fantasy|Script|Chancery|Ink Free|Chalkboard|Bradley|Comic|Handwriting/i);
    });
  });
});
