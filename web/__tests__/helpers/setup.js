// Vitest's jsdom environment doesn't reliably provide window.crypto.subtle
// across Node versions (observed missing on the Node 18.x/20.x CI runners,
// present locally) - explicitly backing it with Node's own WebCrypto
// implementation removes the dependency on jsdom/Node version behavior
// here, since every test that hashes a password needs it.
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto?.subtle) {
  globalThis.crypto = webcrypto;
}
