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

/**
 * The layout with one more Readout at the end, in the default mode for `moment`.
 * @param {Layout} layout @param {Moment} moment
 * @returns {Layout}
 */
export function addReadout(layout, moment) {
  return { readouts: [...layout.readouts, { mode: defaultMode(moment) }] };
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
 * Saved data (anything) to a layout, or null unless it's a non-empty list of known modes.
 * @param {unknown} saved
 * @returns {Layout | null}
 */
function parseLayout(saved) {
  const readouts = /** @type {any} */ (saved)?.readouts;
  if (!Array.isArray(readouts) || readouts.length === 0) return null;
  if (!readouts.every((r) => READOUT_MODES.includes(r?.mode))) return null;
  return { readouts: readouts.map((r) => ({ mode: r.mode })) };
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
  const [tab, device] = [session, local].map((area) => createStorageAdapter(LAYOUT_KEY, area));
  /** @param {ReturnType<typeof createStorageAdapter>[]} areas @param {Layout} layout */
  function saveTo(areas, layout) {
    for (const area of areas) {
      try {
        area.save(layout);
      } catch {
        // Not kept here; the tab carries on with the layout in memory.
      }
    }
  }
  return {
    load: () => parseLayout(tab.load()) ?? parseLayout(device.load()),
    save: (layout) => saveTo([tab, device], layout),
    keepInTab: (layout) => saveTo([tab], layout),
  };
}
