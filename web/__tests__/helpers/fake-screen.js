// Stand-ins for the browser screen capabilities the School Clock page is given
// (clock/screen.js): Fullscreen, Wake Lock and Document Picture-in-Picture.
// jsdom has none of them.

/**
 * A Wake Lock API. `refuse` makes requests fail (the browser said no).
 * @param {{ refuse?: boolean }} [options]
 */
export function createFakeWakeLock({ refuse = false } = {}) {
  const sentinels = [];
  const wakeLock = {
    refuse,
    requests: 0,
    async request() {
      wakeLock.requests += 1;
      if (wakeLock.refuse) throw new Error('NotAllowedError');
      const sentinel = {
        released: false,
        async release() { sentinel.released = true; },
      };
      sentinels.push(sentinel);
      return sentinel;
    },
    /** How many locks are held right now. */
    held: () => sentinels.filter((s) => !s.released).length,
    /** What the browser does when the tab is hidden. */
    browserReleases() { sentinels.forEach((s) => { s.released = true; }); },
  };
  return wakeLock;
}

/** The Fullscreen API: `userExits()` is the Esc key. */
export function createFakeFullscreen() {
  const listeners = new Set();
  const fire = () => listeners.forEach((listener) => listener());
  const fullscreen = {
    element: null,
    async request(element) { fullscreen.element = element; fire(); },
    async exit() { fullscreen.element = null; fire(); },
    isActive: () => fullscreen.element !== null,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    userExits() { fullscreen.element = null; fire(); },
  };
  return fullscreen;
}

/** Document Picture-in-Picture: each window opened has its own document. */
export function createFakePictureInPicture() {
  const pip = {
    /** Every window opened, oldest first, with the size asked for. */
    windows: [],
    get window() { return pip.windows.at(-1) ?? null; },
    async open(size) {
      const win = new EventTarget();
      Object.assign(win, {
        size,
        closed: false,
        document: document.implementation.createHTMLDocument(''),
        /** Closed by the page, or by the user (its own close button). Like a
         * browser, it says so (pagehide) a moment later, not straight away. */
        close() {
          if (win.closed) return;
          win.closed = true;
          queueMicrotask(() => win.dispatchEvent(new Event('pagehide')));
        },
      });
      pip.windows.push(win);
      return win;
    },
  };
  return pip;
}
