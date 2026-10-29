// @ts-check
// The browser screen features the School Clock uses where they exist:
// Fullscreen, Wake Lock (keep the projector awake) and Document
// Picture-in-Picture (the always-on-top mini player). Each is detected, not
// assumed; a missing one is null, and the page leaves its control out.

/**
 * @typedef {{
 *   request: (element: Element) => Promise<void>,
 *   exit: () => Promise<void>,
 *   isActive: () => boolean,
 *   onChange: (listener: () => void) => () => void,
 * }} Fullscreen `onChange` returns a function that stops listening.
 * @typedef {{ released: boolean, release: () => Promise<void> }} WakeLockSentinelLike
 * @typedef {{ request: () => Promise<WakeLockSentinelLike> }} WakeLock
 * @typedef {{ open: (size: { width: number, height: number }) => Promise<Window> }} PictureInPicture
 * @typedef {{ fullscreen: Fullscreen | null, wakeLock: WakeLock | null, pictureInPicture: PictureInPicture | null }} Capabilities
 */

/**
 * The screen features this browser has.
 * @param {{ document: any, navigator?: any, documentPictureInPicture?: any }} win the browser's `window`
 * @returns {Capabilities}
 */
export function detectCapabilities(win) {
  const doc = win.document;
  const fullscreen = typeof doc.documentElement?.requestFullscreen === 'function' && doc.fullscreenEnabled !== false
    ? {
      request: (element) => element.requestFullscreen(),
      exit: () => doc.exitFullscreen(),
      isActive: () => Boolean(doc.fullscreenElement),
      onChange(listener) {
        doc.addEventListener('fullscreenchange', listener);
        return () => doc.removeEventListener('fullscreenchange', listener);
      },
    }
    : null;
  const lock = win.navigator?.wakeLock;
  const wakeLock = typeof lock?.request === 'function' ? { request: () => lock.request('screen') } : null;
  const pip = win.documentPictureInPicture;
  const pictureInPicture = typeof pip?.requestWindow === 'function' ? { open: (size) => pip.requestWindow(size) } : null;
  return { fullscreen, wakeLock, pictureInPicture };
}

/**
 * Keeps a screen wake lock while it's wanted. The browser lets go of the lock
 * whenever the tab is hidden, so `refresh()` (when the tab is shown again)
 * asks again if it's still wanted. Every failure is quiet: the screen may
 * simply sleep.
 * @param {WakeLock | null} wakeLock
 */
export function createWakeLockKeeper(wakeLock) {
  let wanted = false;
  /** @type {WakeLockSentinelLike | null} */
  let sentinel = null;
  let asking = false;

  /** @param {WakeLockSentinelLike} lock */
  const letGo = (lock) => { lock.release().catch(() => {}); };

  function ask() {
    if (!wakeLock || asking || (sentinel && !sentinel.released)) return;
    asking = true;
    let pending;
    try {
      pending = wakeLock.request();
    } catch {
      asking = false;
      return;
    }
    pending.then((lock) => {
      asking = false;
      if (wanted) sentinel = lock;
      else letGo(lock);
    }, () => { asking = false; });
  }

  return {
    /** Keep the screen awake from now on. */
    hold() {
      wanted = true;
      ask();
    },
    /** Let the screen sleep again. */
    release() {
      wanted = false;
      if (sentinel) letGo(sentinel);
      sentinel = null;
    },
    /** Ask again if the lock is wanted but the browser has let go of it. */
    refresh() {
      if (wanted) ask();
    },
  };
}
