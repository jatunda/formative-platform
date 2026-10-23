// @ts-check
// Plain-fetch reads through the Realtime Database REST API (`.json`
// endpoints; the database is publicly readable, per database.rules.json).
// For student-facing pages that only read once: no Firebase SDK download
// and no live connection (see the pmcq-improvements spec, "Data loading in
// the browser").

// Also in functions/preview-handler.js (CommonJS there, browser ESM here, so they can't share a module).
export const DATABASE_URL = "https://formative-platform-default-rtdb.firebaseio.com";

// Local dev mirrors firebase-config.js: on localhost/127.0.0.1, reads go to
// the Database emulator, never production.
const EMULATOR_PORT = 9000;
const DATABASE_NAMESPACE = "formative-platform-default-rtdb";

/**
 * REST URL for a database path, each segment URL-encoded.
 * @param {string[]} segments e.g. ["practiceSets", id]
 * @param {string} hostname the page's hostname (picks production or the emulator)
 * @returns {string}
 */
export function restUrl(segments, hostname) {
  const path = segments.map(encodeURIComponent).join("/");
  if (["localhost", "127.0.0.1"].includes(hostname)) {
    return `http://${hostname}:${EMULATOR_PORT}/${path}.json?ns=${DATABASE_NAMESPACE}`;
  }
  return `${DATABASE_URL}/${path}.json`;
}

/**
 * Read one database path. Resolves to null when nothing is stored there.
 * @param {string[]} segments
 * @param {{ fetch: typeof globalThis.fetch, hostname: string }} env
 * @returns {Promise<any>}
 * @throws {Error} If the database answers with an error status
 */
export async function readPath(segments, { fetch, hostname }) {
  const response = await fetch(restUrl(segments, hostname));
  if (!response.ok) {
    throw new Error(`Database read failed (${response.status}): ${segments.join("/")}`);
  }
  return (await response.json()) ?? null;
}
