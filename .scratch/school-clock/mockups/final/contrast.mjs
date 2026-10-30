// Contrast check over the theme tokens, no browser needed.
//
//   node .scratch/school-clock/mockups/final/contrast.mjs          # summary + failures
//   node .scratch/school-clock/mockups/final/contrast.mjs --table  # also a markdown table
//
// Reads the default palette from tokens.css and every other palette from
// themes.css, checks that each block sets every colour token, and checks
// every colour pair the design uses, in dark and light. Fonts don't change
// colour ratios; shoot.mjs runs axe (which accounts for each font's size and
// weight) over every font x palette x mode on the rendered page.
// Exits 1 on any failure. Writes shots/contrast.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(here, f), 'utf8');

export const TOKENS = ['bg', 'surface', 'surface-2', 'fg', 'muted', 'line', 'line-soft', 'accent', 'accent-text', 'on-accent', 'focus', 'ring', 'on-ring', 'track', 'digits', 'deco', 'deco-2'];

// Blocks: selector -> { token: value } for colour tokens only.
function blocks(css) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css.replace(/\/\*[\s\S]*?\*\//g, '')))) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const vars = {};
    for (const d of m[2].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
    out.push({ sel, vars });
  }
  return out;
}

export function loadPalettes() {
  const tok = blocks(read('tokens.css'));
  const themes = blocks(read('themes.css'));
  const pick = (vars) => Object.fromEntries(TOKENS.filter((t) => t in vars).map((t) => [t, vars[t]]));
  const palettes = {};
  const rootDark = tok.find((b) => b.sel === ':root, [data-palette="slate"]');
  const rootLight = tok.find((b) => b.sel === ':root[data-mode="light"], [data-palette="slate"][data-mode="light"]');
  palettes.slate = { dark: pick(rootDark.vars), light: pick(rootLight.vars) };
  for (const b of themes) {
    const m = b.sel.match(/^\[data-palette="([a-z0-9-]+)"\](\[data-mode="light"\])?$/);
    if (!m) continue;
    (palettes[m[1]] ||= {})[m[2] ? 'light' : 'dark'] = pick(b.vars);
  }
  // Derived tokens (tokens.css): the alpha mixes, per mode.
  const pct = { dark: { soft: 0.16, wash: 0.14 }, light: { soft: 0.12, wash: 0.1 } };
  return { palettes, pct };
}

// ---------- colour maths (WCAG 2.x relative luminance) ----------
const hex = (h) => {
  let s = h.replace('#', '');
  if (s.length === 3) s = [...s].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const lin = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const over = (top, alpha, under) => top.map((c, i) => Math.round(c * alpha + under[i] * (1 - alpha)));

// [label, foreground, background, minimum]. Backgrounds can be a mix:
// ['mix', token, alpha, overToken].
const TEXT = 4.5;
const UI = 3;
export const PAIRS = [
  ['text on page', 'fg', 'bg', TEXT],
  ['text on surface', 'fg', 'surface', TEXT],
  ['text on surface-2', 'fg', 'surface-2', TEXT],
  ['digits on page', 'digits', 'bg', TEXT],
  ['digits during a ring (wash)', 'digits', ['mix', 'ring', 'wash', 'bg'], TEXT],
  ['text on current Segment (strip)', 'fg', ['mix', 'accent', 'soft', 'surface'], TEXT],
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

export function checkAll() {
  const { palettes, pct } = loadPalettes();
  const results = [];
  const problems = [];
  for (const [id, modes] of Object.entries(palettes)) {
    for (const mode of ['dark', 'light']) {
      const p = modes[mode];
      if (!p) {
        problems.push(`${id} ${mode}: block missing`);
        continue;
      }
      const missing = TOKENS.filter((t) => !(t in p));
      if (missing.length) problems.push(`${id} ${mode}: missing ${missing.join(', ')}`);
      const col = (spec) => {
        if (Array.isArray(spec)) return over(hex(p[spec[1]]), pct[mode][spec[2]], hex(p[spec[3]]));
        return hex(p[spec]);
      };
      const row = { palette: id, mode, pairs: {} };
      for (const [label, fg, bg, min] of PAIRS) {
        if (missing.includes(fg) || (typeof bg === 'string' && missing.includes(bg))) continue;
        const r = ratio(col(fg), col(bg));
        row.pairs[label] = +r.toFixed(2);
        if (r < min) problems.push(`${id} ${mode}: ${label} ${r.toFixed(2)} < ${min}`);
      }
      results.push(row);
    }
  }
  return { results, problems };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { results, problems } = checkAll();
  fs.mkdirSync(path.join(here, 'shots'), { recursive: true });
  fs.writeFileSync(path.join(here, 'shots', 'contrast.json'), JSON.stringify({ results, problems }, null, 2));
  const min = (row, labels) => Math.min(...labels.map((l) => row.pairs[l]));
  const textLabels = PAIRS.filter((p) => p[3] === TEXT).map((p) => p[0]);
  const uiLabels = PAIRS.filter((p) => p[3] === UI).map((p) => p[0]);
  console.log(`${results.length} palette x mode blocks, ${PAIRS.length} pairs each: ${problems.length} problems`);
  problems.forEach((p) => console.log('  FAIL ' + p));
  if (process.argv.includes('--table')) {
    console.log('\n| Palette | Mode | Text on page | Muted (lowest) | Digits | Accent text (lowest) | On accent | Ring card | Lowest text pair | Lowest non-text pair |');
    console.log('|---|---|---|---|---|---|---|---|---|---|');
    for (const r of results) {
      const lowText = textLabels.reduce((a, l) => (r.pairs[l] < r.pairs[a] ? l : a));
      const lowUi = uiLabels.reduce((a, l) => (r.pairs[l] < r.pairs[a] ? l : a));
      console.log(`| ${r.palette} | ${r.mode} | ${r.pairs['text on page']} | ${min(r, ['muted on page', 'muted on surface', 'muted on surface-2'])} | ${r.pairs['digits on page']} | ${min(r, ['accent text on page', 'accent text on surface', 'accent text on surface-2'])} | ${r.pairs['text on accent fill']} | ${r.pairs['ring card text']} | ${r.pairs[lowText]} (${lowText}) | ${r.pairs[lowUi]} (${lowUi}) |`);
    }
  }
  process.exit(problems.length ? 1 : 0);
}
