// @ts-check
// Generates the opaque random ids Lessons, Pages, Questions and Practice Sets
// are stored under. Shared by lesson-store.js and database-utils.js's
// generateUniqueHash so there is one id rule.

/**
 * Keep generating random 32-character hex keys until one is unused under
 * basePath.
 * @param {(path: string) => Promise<any>} read - Resolves to the value at a path, null/undefined if none
 * @param {string} basePath - The top-level tree the key must be unique in
 * @returns {Promise<string>}
 */
export async function generateUniqueKey(read, basePath) {
  for (;;) {
    const key = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const existing = await read(`${basePath}/${key}`);
    if (existing === null || existing === undefined) return key;
  }
}
