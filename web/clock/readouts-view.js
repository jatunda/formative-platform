// The Readouts on the School Clock's main screen: one big Readout and up to
// two small ones (beside it on a wide display, below it otherwise), the
// timer's ring (timer-ring.js) in the big spot while it shows, and edit mode's Remove buttons and
// Add slot. The page says what to show; this draws it. It rebuilds only when
// the arrangement changes (so focus survives the ticks) and otherwise just
// rewrites the values.
import { el } from './dom.js';
import { icon } from './icons.js';

/**
 * @typedef {{ count: number, cyclable: boolean, timer: boolean, editing: boolean, canAdd: boolean }} Arrangement
 * - `count`: how many Readouts (the layout's, or 1 for the plain time);
 * - `cyclable`: whether they're the layout's (buttons that cycle) or just the time;
 * - `timer`: the timer's ring takes the big spot, and every Readout is a small one;
 * - `editing`: edit mode, with Remove buttons (when there's more than one) and the Add slot (when `canAdd`).
 * @typedef {ReturnType<typeof import('./readouts.js').readoutParts>} Parts
 */

/**
 * Write a Readout's value into `node`: letters small, and the glyph counts
 * for the size rule. The mini player writes its big Readout the same way.
 * @param {HTMLElement} node @param {Parts} parts
 */
export function writeValue(node, { pieces, glyphs }) {
  node.replaceChildren(...pieces.map(({ text, small }) => (small ? el('span', { className: 'clock-unit', textContent: text }) : text)));
  node.style.setProperty('--d', String(glyphs.digits));
  node.style.setProperty('--c', String(glyphs.colons));
  node.style.setProperty('--u', String(glyphs.letters));
}

/**
 * @param {{ onCycle: (index: number) => void, onRemove: (index: number) => void, onAdd: () => void,
 *   timerFace: HTMLElement }} actions `timerFace` is the timer's ring, which the page keeps up to date
 * @returns {{ element: HTMLElement, show: (arrangement: Arrangement, readouts: Parts[]) => void,
 *   focusReadout: (index: number) => void, focusRemove: (index: number) => boolean }}
 *   `focusRemove` focuses the Remove button at `index` (or the last one), and says whether there was one.
 */
export function createReadoutsView({ onCycle, onRemove, onAdd, timerFace }) {
  const element = el('div', { className: 'clock-readouts' });
  let built = '';
  /** @type {{ face: HTMLElement, value: HTMLElement, caption: HTMLElement, removeName: HTMLElement | null }[]} */
  let shown = [];
  /** @type {HTMLButtonElement[]} */
  let removeButtons = [];

  /** @param {Arrangement} arrangement */
  function build({ count, cyclable, timer, editing, canAdd }) {
    const removable = editing && count > 1;
    removeButtons = [];
    shown = Array.from({ length: count }, (_, i) => {
      const value = el('span', { className: 'clock-readout__value' });
      const caption = el('span', { className: 'clock-readout__caption' });
      const face = cyclable
        ? el('button', { type: 'button', className: 'clock-readout__face', onclick: () => onCycle(i) }, [value, ' ', caption])
        : el('div', { className: 'clock-readout__face' }, [value, ' ', caption]);
      const removeName = removable ? el('span', { className: 'visually-hidden' }) : null;
      return { face, value, caption, removeName };
    });
    const readoutBlock = ({ face, removeName }, i, big) => {
      const children = [face];
      if (removeName) {
        const remove = el('button', { type: 'button', className: 'clock-readout__remove', onclick: () => onRemove(i) }, [
          icon('close'), el('span', { textContent: 'Remove' }), removeName,
        ]);
        removeButtons.push(remove);
        children.push(remove);
      }
      const className = `clock-readout ${big ? 'clock-readout--big' : 'clock-readout--small'}${editing ? ' is-editing' : ''}`;
      return el('div', { className }, children);
    };
    const big = timer ? timerFace : readoutBlock(shown[0], 0, true);
    const smalls = shown.map((readout, i) => [readout, i]).slice(timer ? 0 : 1)
      .map(([readout, i]) => readoutBlock(readout, i, false));
    if (editing && canAdd) {
      smalls.push(el('button', { type: 'button', className: 'clock-readout-add', onclick: () => onAdd() }, [
        icon('plus'), el('span', { textContent: 'Add Readout' }),
      ]));
    }
    element.classList.toggle('has-smalls', smalls.length > 0);
    element.classList.toggle('has-timer', timer);
    element.replaceChildren(big, ...(smalls.length ? [el('div', { className: 'clock-smalls' }, smalls)] : []));
  }

  return {
    element,
    show(arrangement, readouts) {
      const key = JSON.stringify(arrangement);
      if (key !== built) {
        built = key;
        build(arrangement);
      }
      readouts.forEach((parts, i) => {
        const readout = shown[i];
        writeValue(readout.value, parts);
        readout.caption.textContent = parts.caption;
        if (readout.removeName) readout.removeName.textContent = ` Readout: ${parts.caption}`;
      });
    },
    focusReadout(index) {
      shown[index].face.focus();
    },
    focusRemove(index) {
      const button = removeButtons[Math.min(index, removeButtons.length - 1)];
      button?.focus();
      return Boolean(button);
    },
  };
}
