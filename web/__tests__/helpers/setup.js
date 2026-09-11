// Vitest's jsdom environment doesn't reliably provide window.crypto.subtle
// across Node versions (observed missing on the Node 18.x/20.x CI runners,
// present locally) - explicitly backing it with Node's own WebCrypto
// implementation removes the dependency on jsdom/Node version behavior
// here, since every test that hashes a password needs it.
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto?.subtle) {
  globalThis.crypto = webcrypto;
}

// jsdom doesn't provide window.localStorage in this setup either, and
// several modules (teacher.js's scroll/visit tracking, teacher-auth.js's
// session storage) call the bare `localStorage` global directly rather than
// taking it as a dependency. A small in-memory polyfill here means test
// files don't each need their own mock (Web Storage semantics: setItem
// coerces the value to a string, like the real API does).
if (!globalThis.localStorage) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}
