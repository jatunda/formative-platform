// @ts-check
// A small JSON persistence adapter over one key of a Web Storage area
// (localStorage or sessionStorage, or any fake with getItem/setItem). Shared by
// the Robotics Tournament (robotics/storage.js) and the School Clock.

/** @typedef {Pick<Storage, 'getItem' | 'setItem'>} StorageLike */

/**
 * @param {string} key - the key to persist under
 * @param {StorageLike} [storage] - defaults to localStorage
 * @param {{ quiet?: boolean }} [options] - `quiet`: a storage that can't be
 *   read loads as nothing saved, instead of throwing
 * @returns {{load: () => any, save: (value: any) => void}}
 *   `load` returns null when nothing is saved or the data is corrupt; `save`
 *   writes the value as JSON. Storage errors (blocked, quota) propagate to
 *   the caller unless `quiet` says otherwise.
 */
export function createStorageAdapter(key, storage = localStorage, { quiet = false } = {}) {
  /** @returns {string | null} */
  function read() {
    if (!quiet) return storage.getItem(key);
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }
  return {
    load() {
      const raw = read();
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    save(value) {
      storage.setItem(key, JSON.stringify(value));
    },
  };
}
