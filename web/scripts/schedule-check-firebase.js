// @ts-check
// A stand-in for the Firebase SDK's app and database modules, which the
// schedule layout check (schedule-check.mjs) serves in place of the gstatic
// URLs the pages import. It keeps the database in memory, starting from
// `globalThis.__scheduleCheckDb` (schedule-check-fixtures.js, set before the
// page loads), and has just the functions the pages import: ref, get, set,
// update, plus the setup calls in firebase-config.js. Writes change the
// in-memory copy only.

/** @type {Record<string, any>} */
const root = JSON.parse(JSON.stringify(/** @type {any} */ (globalThis).__scheduleCheckDb ?? {}));

/** @param {string} path */
const segments = (path) => path.split('/').filter(Boolean);

/** @param {string} path */
function read(path) {
  /** @type {any} */
  let node = root;
  for (const key of segments(path)) node = node?.[key];
  return node === undefined ? null : JSON.parse(JSON.stringify(node));
}

/** @param {string} path @param {any} value null deletes */
function write(path, value) {
  const keys = segments(path);
  const last = /** @type {string} */ (keys.pop());
  /** @type {any} */
  let node = root;
  for (const key of keys) node = node[key] ??= {};
  if (value === null || value === undefined) delete node[last];
  else node[last] = JSON.parse(JSON.stringify(value));
}

export const initializeApp = () => ({});
export const getDatabase = () => ({});
export const connectDatabaseEmulator = () => {};

/** @param {unknown} _db @param {string} [path] */
export const ref = (_db, path = '') => ({ path, key: segments(path).pop() ?? null });

/** @param {{ path: string, key: string | null }} r */
export async function get(r) {
  const value = read(r.path);
  return { key: r.key, exists: () => value !== null, val: () => value };
}

/** @param {{ path: string }} r @param {any} value */
export async function set(r, value) {
  write(r.path, value);
}

/** @param {{ path: string }} r @param {Record<string, any>} updates */
export async function update(r, updates) {
  for (const [path, value] of Object.entries(updates)) write(`${r.path}/${path}`, value);
}
