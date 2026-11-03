/**
 * An in-memory stand-in for localStorage/sessionStorage.
 * @param {Record<string, string>} [items] raw strings to start with
 */
export function createFakeStorage(items = {}) {
  const data = new Map(Object.entries(items));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() { return data.size; },
  };
}
