// @ts-check
// Keeps the timer's ring clear of the top bar. On a wide screen the ring
// takes the top bar's row too (timer.css), trusting the circle to leave the
// corners free for the Day Label and the controls. That holds while the
// screen is much wider than tall; nearer 16:9 at a high zoom, or in a short,
// wide window, the controls reach in far enough to touch the circle. So the
// page measures the top bar and gives the ring two numbers:
// - `--ring-room`: the largest ring that clears it, allowed to sit as low as
//   the stage goes (timer.css adds it to the ring's size rule);
// - `--ring-shift`: how far below the middle the ring then sits, as little as
//   clears it, so a ring that fits in the middle stays there.
// Both come from the ring's region and the top bar, never from where the ring
// itself ends up, so the measuring never feeds back into itself.
// It also gives `--side-room`, the width the column of small Readouts beside
// the ring needs: its widest value plus RING_GAP, on every screen where the
// timer shows. timer.css keeps the ring that much clear of each side, so a
// wide value ("10:40:01 AM") doesn't spill out of the column into the ring.
// A value is only as wide as its own text, never its column, so this doesn't
// feed back either.

/** Clear space between the ring and the nearest piece of the top bar, in px. */
export const RING_GAP = 12;

/** @typedef {{ left: number, top: number, right: number, bottom: number }} Box */

/** Halvings in a search: far below a pixel on any screen. */
const STEPS = 40;

/**
 * Whether a ring of diameter `size` centred at (`x`, `y`) stays `gap` clear of every box.
 * @param {number} x @param {number} y @param {number} size @param {Box[]} boxes @param {number} gap
 */
function clears(x, y, size, boxes, gap) {
  return boxes.every((box) => {
    const dx = Math.max(box.left - x, 0, x - box.right);
    const dy = Math.max(box.top - y, 0, y - box.bottom);
    return Math.hypot(dx, dy) >= size / 2 + gap;
  });
}

/**
 * The largest `value` in [low, high] for which `ok` holds, given `ok` holds below some point and not above it.
 * @param {number} low @param {number} high @param {(value: number) => boolean} ok
 */
function largest(low, high, ok) {
  if (ok(high)) return high;
  for (let i = 0; i < STEPS; i++) {
    const mid = (low + high) / 2;
    if (ok(mid)) low = mid;
    else high = mid;
  }
  return low;
}

/**
 * The widest ring (its diameter, px) that fits `region`'s height, centred across it, and clears
 * every box, sitting as low as `region` goes if it must. Rings sharing that bottom point nest
 * inside each other, so a smaller one always clears where a larger one does.
 * @param {Box} region @param {Box[]} boxes @param {number} gap
 */
export function ringRoom(region, boxes, gap) {
  const x = (region.left + region.right) / 2;
  return largest(0, region.bottom - region.top, (size) => clears(x, region.bottom - size / 2, size, boxes, gap));
}

/**
 * How far below `region`'s middle a ring of diameter `size` must sit to clear every box
 * (0 if it clears in the middle; never past `region`'s bottom).
 * @param {Box} region @param {Box[]} boxes @param {number} gap @param {number} size
 */
export function ringShift(region, boxes, gap, size) {
  const x = (region.left + region.right) / 2;
  const middle = (region.top + region.bottom) / 2;
  const most = Math.max(region.bottom - size / 2 - middle, 0);
  // Lower is clearer (the boxes are above), so look for the least shift that clears.
  return most - largest(0, most, (up) => clears(x, middle + most - up, size, boxes, gap));
}

/**
 * Re-measures whenever the ring, its region, the top bar or any piece of it changes size,
 * and whenever the Readouts change, while the timer shows. `--side-room` is set wherever the
 * ring shows; `--ring-room` and `--ring-shift` only while the ring shares the top bar's row
 * (elsewhere the ring keeps to the stage).
 * @param {HTMLElement} region the Readouts (`.has-timer` while the ring shows)
 * @param {HTMLElement} ring the timer's ring
 * @param {HTMLElement} topBar the top bar: the Day Label and the controls
 */
export function keepRingClear(region, ring, topBar) {
  if (typeof ResizeObserver === 'undefined') return;
  const pieces = [...topBar.querySelectorAll('.clock-day, button')];
  const update = () => {
    if (!region.classList.contains('has-timer')) return;
    const values = [...region.querySelectorAll('.clock-smalls .clock-readout__value')];
    const widest = Math.max(0, ...values.map((value) => value.getBoundingClientRect().width));
    region.style.setProperty('--side-room', `${widest && widest + RING_GAP}px`);
    const area = region.getBoundingClientRect();
    if (area.top >= topBar.getBoundingClientRect().bottom) {
      region.style.removeProperty('--ring-room');
      region.style.removeProperty('--ring-shift');
      return;
    }
    // A hidden piece has an empty box.
    const boxes = pieces.map((piece) => piece.getBoundingClientRect()).filter((box) => box.width && box.height);
    const room = ringRoom(area, boxes, RING_GAP);
    region.style.setProperty('--ring-room', `${room}px`);
    // The size the ring is drawn at (its width caps may make it smaller than the room).
    const size = Math.min(room, ring.getBoundingClientRect().width || room);
    region.style.setProperty('--ring-shift', `${ringShift(area, boxes, RING_GAP, size)}px`);
  };
  const observer = new ResizeObserver(update);
  for (const node of [region, ring, topBar, ...pieces]) observer.observe(node);
  // The small Readouts are rebuilt and their values tick, without the region changing size.
  new MutationObserver(update).observe(region, { childList: true, characterData: true, subtree: true });
}
