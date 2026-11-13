// @ts-check
// The timer ring's geometry, in one place for everything that needs it:
// timer-ring.js draws the circle from it, ring-fit.js keeps the circle clear
// of what's around it, and the browser check (clock-check-browser.mjs) imports
// this file from the served page, so it checks exactly what ring-fit promises:
// the same circle, the same obstacles, the same gap.
//
// The circle that's kept clear is the one that fills the ring's box (as wide
// as its shorter side, centred in it). The drawn circle sits just inside it:
// radius RING_R plus half of RING_STROKE, on a box RING_BOX across.

/** The ring's SVG box, its circle's radius and its stroke's width, in the box's units. */
export const RING_BOX = 100;
export const RING_R = 48;
export const RING_STROKE = 2.4;

/** Clear space between the ring and anything it must stay clear of, in px. */
export const RING_GAP = 12;

/** The pieces of the top bar the ring keeps clear of: the Day Label and the controls. */
export const TOP_BAR_PIECES = '.clock-day, button';
/** The small Readouts' values, in the column beside the ring. */
export const SIDE_VALUES = '.clock-smalls .clock-readout__value';

/** @typedef {{ left: number, top: number, right: number, bottom: number }} Box */

/**
 * Whether a ring of diameter `size` centred at (`x`, `y`) stays `gap` clear of every box.
 * @param {number} x @param {number} y @param {number} size @param {Box[]} boxes @param {number} gap
 */
export function ringClears(x, y, size, boxes, gap) {
  return boxes.every((box) => {
    const dx = Math.max(box.left - x, 0, x - box.right);
    const dy = Math.max(box.top - y, 0, y - box.bottom);
    return Math.hypot(dx, dy) >= size / 2 + gap;
  });
}

/**
 * How far short of the gap a measured ring may be and still count as clear, in px. Layout
 * rounds boxes to fractions of a pixel, so a ring that ring-fit sizes to touch the gap exactly
 * measures a hair under it.
 */
export const RING_SLACK = 0.5;

/**
 * Of the named boxes, the names of those a ring drawn in `ring` (its box) comes within `gap` of
 * (less RING_SLACK). Boxes with no width or height (hidden pieces) are left out.
 * @param {Box} ring @param {{ name: string, box: Box }[]} obstacles @param {number} [gap]
 */
export function ringTouches(ring, obstacles, gap = RING_GAP) {
  const x = (ring.left + ring.right) / 2;
  const y = (ring.top + ring.bottom) / 2;
  const size = Math.min(ring.right - ring.left, ring.bottom - ring.top);
  return obstacles
    .filter(({ box }) => box.right > box.left && box.bottom > box.top)
    .filter(({ box }) => !ringClears(x, y, size, [box], gap - RING_SLACK))
    .map(({ name }) => name);
}

/**
 * What the ring on `root`'s page must stay clear of, each named for a report: the top bar's
 * Day Label and buttons, and the small Readouts' values.
 * @param {ParentNode} root
 * @returns {{ name: string, box: DOMRect }[]}
 */
export function ringObstacles(root) {
  const top = [...root.querySelectorAll('.clock-top')].flatMap((bar) => [...bar.querySelectorAll(TOP_BAR_PIECES)]);
  return [
    ...top.map((node) => ({
      name: node.matches('button') ? `"${node.textContent?.trim() || node.getAttribute('aria-label')}"` : 'Day Label',
      box: node.getBoundingClientRect(),
    })),
    ...[...root.querySelectorAll(`.clock-readouts ${SIDE_VALUES}`)].map((node, i) => ({
      name: `small Readout ${i + 1}`,
      box: node.getBoundingClientRect(),
    })),
  ];
}
