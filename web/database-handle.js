// @ts-check
// The one database handle every database module reads from. A page calls
// initializeDatabase(db) once with firebase-config.js's db; tests call it once
// with the Firebase test double. No database module keeps its own handle, so
// none can be left uninitialized while another works.

/**
 * A Firebase Realtime Database instance (or the test double standing in for
 * one). Opaque here: only the Firebase calls in the database modules use it.
 * @typedef {object} Database
 */

/** @type {Database | null} */
let db = null;

/**
 * Set the database every database module uses. Call once per page.
 * @param {Database | null | undefined} database
 * @throws {Error} If no database instance is given
 */
export function initializeDatabase(database) {
  if (!database) {
    throw new Error("Database instance is required for initialization");
  }
  db = database;
}

/**
 * @returns {Database}
 * @throws {Error} If no page has called initializeDatabase yet
 */
export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  return db;
}
