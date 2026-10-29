// @ts-check
// A small JSON persistence adapter over one key of a Web Storage area
// (localStorage or sessionStorage, or any fake with getItem/setItem). Shared by
// the Robotics Tournament (robotics/storage.js) and the School Clock.

/** @typedef {Pick<Storage, 'getItem' | 'setItem'>} StorageLike */

/**
 * @param {string} key - the key to persist under
 * @param {StorageLike} [storage] - defaults to localStorage
 * @param {{ quiet?: boolean }} [options] - `quiet`: never throw. A storage
 *   that can't be read loads as nothing saved, and a value that can't be
 *   written just isn't kept (the caller carries on with it in memory).
 * @returns {{load: () => any, save: (value: any) => void}}
 *   `load` returns null when nothing is saved or the data is corrupt; `save`
 *   writes the value as JSON. Otherwise storage errors (blocked, quota)
 *   propagate to the caller.
 */
export function createStorageAdapter(key, storage = localStorage, { quiet = false } = {}) {
  /** @template T @param {() => T} action @param {T} fallback @returns {T} */
  function attempt(action, fallback) {
    if (!quiet) return action();
    try {
      return action();
    } catch {
      return fallback;
    }
  }
  return {
    load() {
      const raw = attempt(() => storage.getItem(key), null);
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    save(value) {
      attempt(() => storage.setItem(key, JSON.stringify(value)), undefined);
    },
  };
}
