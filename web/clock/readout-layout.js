// @ts-check
// A tab's Readout layout: which Readouts it shows, in order (the first is the
// big one), each with its own mode. Each tab keeps its own layout in
// sessionStorage, so a reload restores it and other tabs never change it; every
// save is also kept in localStorage as the "last used" layout, which a tab
// with no layout of its own starts from. Nothing here listens for cross-tab
// storage events.
import { createStorageAdapter } from '../storage.js';
import { READOUT_MODES, defaultMode, nextMode } from './readouts.js';

/** @typedef {import('./readouts.js').ReadoutMode} ReadoutMode */
/** @typedef {import('./clock-model.js').Moment} Moment */
/** @typedef {{ readouts: { mode: ReadoutMode }[] }} Layout */

/** The same key in both storage areas. Bump the version if the shape changes. */
export const LAYOUT_KEY = 'school-clock-layout-v1';

/**
 * A first layout: one Readout in the default mode for `moment`.
 * @param {Moment} moment
 * @returns {Layout}
 */
export function newLayout(moment) {
  return { readouts: [{ mode: defaultMode(moment) }] };
}

/** The most Readouts a layout holds: one big and two small, one per mode. */
export const MAX_READOUTS = 3;

/**
 * Whether the layout has room for another Readout.
 * @param {Layout} layout
 */
export function canAddReadout(layout) {
  return layout.readouts.length < MAX_READOUTS;
}

/**
 * The layout with one more Readout at the end, in the first mode no Readout
 * shows yet, going round the cycle from the default mode for `moment`. A full
 * layout comes back as it was.
 * @param {Layout} layout @param {Moment} moment
 * @returns {Layout}
 */
export function addReadout(layout, moment) {
  if (!canAddReadout(layout)) return layout;
  const shown = new Set(layout.readouts.map((r) => r.mode));
  let mode = defaultMode(moment);
  while (shown.has(mode)) mode = nextMode(mode);
  return { readouts: [...layout.readouts, { mode }] };
}

/**
 * The layout with the Readout at `index` switched to its next mode.
 * @param {Layout} layout @param {number} index
 * @returns {Layout}
 */
export function cycleReadout(layout, index) {
  return { readouts: layout.readouts.map((r, i) => (i === index ? { mode: nextMode(r.mode) } : r)) };
}

/**
 * The layout without the Readout at `index`; the same layout back if it's the only one.
 * @param {Layout} layout @param {number} index
 * @returns {Layout}
 */
export function removeReadout(layout, index) {
  if (layout.readouts.length <= 1) return layout;
  return { readouts: layout.readouts.filter((_, i) => i !== index) };
}

/**
 * Saved data (anything) to a layout (its first three Readouts), or null unless
 * it's a non-empty list of known modes.
 * @param {unknown} saved
 * @returns {Layout | null}
 */
function parseLayout(saved) {
  const readouts = /** @type {any} */ (saved)?.readouts;
  if (!Array.isArray(readouts) || readouts.length === 0) return null;
  if (!readouts.every((r) => READOUT_MODES.includes(r?.mode))) return null;
  return { readouts: readouts.slice(0, MAX_READOUTS).map((r) => ({ mode: r.mode })) };
}

/**
 * The tab's layout store.
 * @param {{ session: import('../storage.js').StorageLike, local: import('../storage.js').StorageLike }} storage
 *   `session` is this tab's (sessionStorage), `local` the device's (localStorage).
 * @returns {{ load: () => Layout | null, save: (layout: Layout) => void, keepInTab: (layout: Layout) => void }}
 *   `load` gives the tab's own layout, else the last used one, else null.
 *   `save` (a change) keeps it in the tab and as the last used layout;
 *   `keepInTab` (a tab opening) keeps it in the tab only, so a reload
 *   restores it whatever other tabs do meanwhile. Neither throws: a full or
 *   blocked storage area just doesn't keep it.
 */
export function createLayoutStore({ session, local }) {
  const [tab, device] = [session, local].map((area) => createStorageAdapter(LAYOUT_KEY, area, { quiet: true }));
  return {
    load: () => parseLayout(tab.load()) ?? parseLayout(device.load()),
    save: (layout) => {
      tab.save(layout);
      device.save(layout);
    },
    keepInTab: (layout) => tab.save(layout),
  };
}
