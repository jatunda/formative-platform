// Adapts a Firebase Realtime Database to the small read/update port that
// storage-agnostic modules (slug-index.js) take, so they stay pure and
// testable against the Firebase test double.
import {
  ref,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

/**
 * @param {import("https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js").Database} db
 * @returns {import("./slug-index.js").SlugStore}
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
