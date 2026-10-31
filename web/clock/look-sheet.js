// The Look sheet: how the clock looks. A compact dialog under the
// top bar on the right (a bottom sheet on small screens) that keeps the clock
// visible beside it, so every choice previews live on the real clock. It holds,
// in order: the theme previews, the flip switch, the bar's whole day / just
// this Segment setting, the font and colour swaps, and "Use the theme's own
// font and colours" after a swap. Also here: the "Pick a theme" hint, the
// decorations, and `applyLook()`, which puts the look on <html>.
//
// Focus is handled by modal.js: it moves in, Tab wraps inside, Escape closes
// it and focus returns to Look. Its scrim is clear (no dimming), so clicking
// the clock closes it too. Every name is a look description from themes.js,
// never who a theme is for.
import { closeButton, fieldset, switchControl } from './controls.js';
import { SVG_NS, el } from './dom.js';
import { icon } from './icons.js';
import { createModal } from './modal.js';
import {
  FONTS, PALETTES, THEMES, lookAttributes, lookParts, nativeMode, otherMode, pickFont, pickPalette, pickTheme, themeLook,
} from './themes.js';

/** @typedef {import('./clock-settings.js').ClockSettings} ClockSettings */

const ID = 'clock-look';
const OWN = ' (the theme’s own)';

/** The flowers decoration (from the design reference), drawn in --deco / --deco-2. */
const FLOWERS = [
  '<g class="clock-deco__leaf"><path d="M70 120c18-30 46-40 74-34-16 26-44 38-74 34z"/>',
  '<path d="M118 40c26 6 40 26 40 52-24-8-38-28-40-52z"/></g>',
  ...[[60, 60, 30], [128, 96, 22], [36, 140, 18]].map(([x, y, r]) => `<g class="clock-deco__flower" transform="translate(${x} ${y})">${
    [0, 72, 144, 216, 288].map((a) => `<ellipse rx="${r * 0.42}" ry="${r * 0.72}" transform="rotate(${a}) translate(0 ${-r * 0.62})"/>`).join('')
  }<circle class="clock-deco__heart" r="${r * 0.3}"/></g>`),
].join('');

/** A decorative flowers drawing. @param {string} className */
function flowers(className) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '0 0 180 180');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = FLOWERS;
  return svg;
}

/**
 * The two corner decorations for the main screen; CSS shows them only for a
 * theme with `data-deco` (and never on small screens).
 */
export function decorations() {
  return [flowers('clock-deco clock-deco--tr'), flowers('clock-deco clock-deco--tl')];
}

/**
 * Put the look on `root` (and its children): data-mode, data-palette,
 * data-font and, for a theme with one, data-deco. Unchanged attributes are
 * left alone.
 * @param {Element} root @param {import('./themes.js').LookSettings} settings
 */
export function applyLook(root, settings) {
  for (const [name, value] of Object.entries(lookAttributes(settings))) {
    if (value === '') root.removeAttribute(name);
    else if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  }
}

/** A radio group's fieldset. @param {string} legend @param {string} className @param {Node[]} children */
const group = (legend, className, children) => fieldset(legend, children, {
  className: `clock-look__group ${className}`, legendClass: 'clock-look__legend',
});

/**
 * @param {{ settings: () => ClockSettings, update: (change: Partial<ClockSettings>) => void,
 *   behind: () => Element[], onChange: (open: boolean) => void }} options
 *   `settings` gives the current settings and `update` saves a change (and redraws the page);
 *   `behind` gives the page parts made inert while it's open, and `onChange` hears it open and close.
 */
export function createLookSheet({ settings, update, behind, onChange }) {
  const themeInputs = THEMES.map((theme) => {
    const input = el('input', { type: 'radio', name: `${ID}-theme`, onchange: () => update(pickTheme(theme.id)) });
    const label = el('label', { className: 'clock-theme-tile' }, [
      input,
      el('span', { className: 'clock-theme-tile__preview', 'aria-hidden': 'true' }, [
        ...(theme.deco ? [flowers('clock-theme-tile__deco')] : []),
        el('span', { className: 'clock-theme-tile__label', textContent: 'Period 3' }),
        ' ',
        el('span', { className: 'clock-theme-tile__digits', textContent: '42:17' }),
        el('span', { className: 'clock-theme-tile__bar' }, [el('span')]),
      ]),
      el('span', { className: 'visually-hidden', textContent: themeLook(theme) }),
      el('span', { className: 'clock-theme-tile__check', 'aria-hidden': 'true' }, [icon('check')]),
    ]);
    // Each preview draws itself in its theme's own version.
    applyLook(label, { theme: theme.id, fontSwap: null, paletteSwap: null, flipped: false });
    return { id: theme.id, input, label };
  });

  const flip = switchControl(`${ID}-flip`, 'Light version',
    'Flips this theme. Picking a theme shows its own version again.', (on) => update({ flipped: on }));

  // The bar's setting (day-bar.js): whole day is the saved dayStrip on.
  const barInputs = /** @type {[string, boolean][]} */ ([['Whole day', true], ['Just this Segment', false]]).map(([name, on]) => {
    const input = el('input', { type: 'radio', name: `${ID}-bar`, onchange: () => update({ dayStrip: on }) });
    return { on, input, label: el('label', { className: 'clock-segment' }, [input, el('span', { textContent: name })]) };
  });

  const fontInputs = FONTS.map((font) => {
    const input = el('input', { type: 'radio', name: `${ID}-font`, onchange: () => update(pickFont(settings(), font.id)) });
    const name = el('span', { className: 'visually-hidden' });
    const label = el('label', { className: 'clock-swatch', 'data-font': font.id }, [
      input,
      el('span', { className: 'clock-swatch__face', 'aria-hidden': 'true' }, [
        el('span', { className: 'clock-swatch__aa', textContent: 'Aa' }), ' ',
        el('span', { className: 'clock-swatch__num', textContent: '42' }),
      ]),
      name,
    ]);
    const look = font.look[0].toUpperCase() + font.look.slice(1);
    return { id: font.id, input, label, name, look };
  });

  const paletteInputs = PALETTES.map((palette) => {
    const input = el('input', {
      type: 'radio', name: `${ID}-palette`, onchange: () => update(pickPalette(settings(), palette.id)),
    });
    const name = el('span', { className: 'visually-hidden' });
    const label = el('label', { className: 'clock-swatch clock-swatch--palette', 'data-palette': palette.id }, [
      input,
      el('span', { className: 'clock-swatch__dot', 'aria-hidden': 'true' }, [el('span')]),
      name,
    ]);
    return { id: palette.id, input, label, name, look: palette.look };
  });

  const reset = el('button', {
    type: 'button', className: 'clock-btn clock-btn--small', textContent: 'Use the theme’s own font and colours',
    onclick: () => {
      update({ fontSwap: null, paletteSwap: null });
      // The button goes; focus stays in the sheet.
      themeInputs.find(({ input }) => input.checked).input.focus();
    },
  });

  const dialog = el('div', {
    className: 'clock-look', id: ID, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': `${ID}-title`,
  }, [
    el('div', { className: 'clock-look__head' }, [
      el('h2', { id: `${ID}-title`, textContent: 'Look' }), closeButton('Close Look', () => modal.close()),
    ]),
    el('div', { className: 'clock-look__body' }, [
      group('Theme', 'clock-look__themes', [el('div', { className: 'clock-theme-grid' }, themeInputs.map(({ label }) => label))]),
      flip.label,
      group('Bottom bar', 'clock-look__bar', [
        el('div', { className: 'clock-segmented' }, barInputs.map(({ label }) => label)),
      ]),
      group('Font', 'clock-look__fonts', [el('div', { className: 'clock-swatches' }, fontInputs.map(({ label }) => label))]),
      group('Colours', 'clock-look__palettes', [
        el('div', { className: 'clock-swatches' }, paletteInputs.map(({ label }) => label)),
      ]),
      reset,
    ]),
  ]);
  // Clear, so the clock stays in full view; a click on it closes the sheet.
  const scrim = el('div', { className: 'clock-look-scrim', 'aria-hidden': 'true' });
  const modal = createModal({ dialog, scrim, behind, onChange });

  // The "Pick a theme" hint, under Look (bottom left on small screens).
  const hint = el('span', { className: 'clock-look-hint', role: 'note' }, [
    el('span', { textContent: 'Pick a theme' }),
    el('button', {
      type: 'button', className: 'clock-look-hint__close', 'aria-label': 'Dismiss the theme hint',
      title: 'Dismiss the theme hint', onclick: () => update({ themeHint: false }),
    }, [icon('close')]),
  ]);

  /** Bring every control in step with the settings. */
  function render() {
    const s = settings();
    const { theme, font, palette } = lookParts(s);
    for (const { id, input } of themeInputs) input.checked = id === theme.id;
    const own = nativeMode(palette);
    flip.input.checked = s.flipped;
    flip.label.querySelector(`#${ID}-flip-name`).textContent = own === 'dark' ? 'Light version' : 'Dark version';
    for (const { on, input } of barInputs) input.checked = s.dayStrip === on;
    for (const f of fontInputs) {
      f.input.checked = f.id === font;
      f.name.textContent = f.look + (f.id === theme.font ? OWN : '');
    }
    for (const p of paletteInputs) {
      p.input.checked = p.id === palette;
      p.name.textContent = p.look + (p.id === theme.palette ? OWN : '');
      // Each dot shows what picking it would give: its own version, or the other while flipped.
      const mode = nativeMode(p.id);
      p.label.dataset.mode = s.flipped ? otherMode(mode) : mode;
    }
    reset.hidden = font === theme.font && palette === theme.palette;
    hint.hidden = !s.themeHint || s.division === null || modal.isOpen();
  }
  render();

  return {
    /** The clear scrim and the sheet, in that order, for the page to mount. */
    elements: [scrim, dialog],
    dialog,
    hint,
    render,
    /** Open it from `from` (focus returns there), at the chosen theme. @param {HTMLElement} from */
    open(from) {
      modal.open(from, themeInputs.find(({ input }) => input.checked).input);
      render();
    },
    destroy: modal.destroy,
  };
}
