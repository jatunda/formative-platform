// The Robotics app's persistence, built on the shared storage adapter.
import { createStorageAdapter } from '../storage.js';

/**
 * A swappable persistence adapter for the Tournament state: today this is
 * backed by localStorage (single-device, no backend), but the rest of the
 * app only ever calls `load`/`save` - a future synced adapter (e.g. Firebase,
 * for a student-facing read-only live view) can be dropped in behind the
 * same interface without touching any state or UI code.
 * @param {string} key - localStorage key to persist under
 * @returns {{load: () => object|null, save: (state: object) => void}}
 */
export function createLocalStorageAdapter(key) {
  return createStorageAdapter(key, localStorage);
}
