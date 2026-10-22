// @ts-check
// Adapts a Firebase Realtime Database to the small read/update port that
// storage-agnostic modules (slug-index.js, lesson-store.js) take, so they
// stay pure and testable against the Firebase test double.
import {
  ref,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

/**
 * The storage port: `read` resolves a path to its value (null when absent);
 * `update` applies a multi-path update atomically, `null` values deleting
 * (Realtime Database semantics).
 * @typedef {object} Store
 * @property {(path: string) => Promise<any>} read
 * @property {(updates: Record<string, any>) => Promise<void>} update
 */

/**
 * @param {import("./database-handle.js").Database} db
 * @returns {Store}
 */
export function realtimeStore(db) {
  return {
    read: async (path) => {
      const snap = await get(ref(db, path));
      return snap.exists() ? snap.val() : null;
    },
    update: (updates) => update(ref(db), updates),
  };
}
