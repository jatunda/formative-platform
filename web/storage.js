// @ts-check
// A small JSON persistence adapter over one key of a Web Storage area
// (localStorage or sessionStorage, or any fake with getItem/setItem). Shared by
// the Robotics Tournament (robotics/storage.js) and the School Clock.

/** @typedef {Pick<Storage, 'getItem' | 'setItem'>} StorageLike */

/**
 * @param {string} key - the key to persist under
 * @param {StorageLike} [storage] - defaults to localStorage
 * @returns {{load: () => any, save: (value: any) => void}}
 *   `load` returns null when nothing is saved, the data is corrupt, or the
 *   storage can't be read; `save` writes the value as JSON (and lets a
 *   storage error, e.g. quota, propagate to the caller).
 */
export function createStorageAdapter(key, storage = localStorage) {
  return {
    load() {
      try {
        const raw = storage.getItem(key);
        return raw === null ? null : JSON.parse(raw);
      } catch {
        return null;
      }
    },
    save(value) {
      storage.setItem(key, JSON.stringify(value));
    },
  };
}
