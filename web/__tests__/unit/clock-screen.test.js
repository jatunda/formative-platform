import { describe, it, expect, vi } from 'vitest';
import { createWakeLockKeeper, detectCapabilities } from '../../clock/screen.js';
import { createFakeWakeLock } from '../helpers/fake-screen.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('detectCapabilities', () => {
  it('finds none of them in a browser without Fullscreen, Wake Lock or Document PiP (like jsdom)', () => {
    expect(detectCapabilities(window)).toEqual({ fullscreen: null, wakeLock: null, pictureInPicture: null });
  });

  it('finds each one only where its API exists', () => {
    const requestWindow = vi.fn(async () => 'pip window');
    const request = vi.fn(async () => 'sentinel');
    const caps = detectCapabilities({
      document: { documentElement: {} },
      navigator: { wakeLock: { request } },
      documentPictureInPicture: { requestWindow },
    });
    expect(caps.fullscreen).toBeNull();
    expect(caps.wakeLock).not.toBeNull();
    expect(caps.pictureInPicture).not.toBeNull();
  });

  it('asks for a screen wake lock and opens a PiP window of the size given', async () => {
    const requestWindow = vi.fn(async () => 'pip window');
    const request = vi.fn(async () => 'sentinel');
    const caps = detectCapabilities({
      document: { documentElement: {} }, navigator: { wakeLock: { request } }, documentPictureInPicture: { requestWindow },
    });
    expect(await caps.wakeLock.request()).toBe('sentinel');
    expect(request).toHaveBeenCalledWith('screen');
    expect(await caps.pictureInPicture.open({ width: 320, height: 200 })).toBe('pip window');
    expect(requestWindow).toHaveBeenCalledWith({ width: 320, height: 200 });
  });

  describe('fullscreen', () => {
    function fullscreenDocument({ enabled = true } = {}) {
      const doc = new EventTarget();
      Object.assign(doc, {
        fullscreenEnabled: enabled,
        fullscreenElement: null,
        documentElement: { requestFullscreen() {} },
        exitFullscreen: vi.fn(async () => {
          doc.fullscreenElement = null;
          doc.dispatchEvent(new Event('fullscreenchange'));
        }),
      });
      return doc;
    }

    it('is missing where the browser turns it off', () => {
      expect(detectCapabilities({ document: fullscreenDocument({ enabled: false }) }).fullscreen).toBeNull();
    });

    it('puts an element fullscreen, reports it, and tells listeners when it changes', async () => {
      const doc = fullscreenDocument();
      const { fullscreen } = detectCapabilities({ document: doc });
      const target = {
        requestFullscreen: vi.fn(async () => {
          doc.fullscreenElement = target;
          doc.dispatchEvent(new Event('fullscreenchange'));
        }),
      };
      const changes = vi.fn();
      const stop = fullscreen.onChange(changes);

      await fullscreen.request(target);
      expect(fullscreen.isActive()).toBe(true);
      expect(changes).toHaveBeenCalledTimes(1);

      await fullscreen.exit();
      expect(fullscreen.isActive()).toBe(false);
      expect(changes).toHaveBeenCalledTimes(2);

      stop();
      await fullscreen.request(target);
      expect(changes).toHaveBeenCalledTimes(2);
    });
  });
});

describe('createWakeLockKeeper', () => {
  it('holds a wake lock until released', async () => {
    const wakeLock = createFakeWakeLock();
    const keeper = createWakeLockKeeper(wakeLock);

    keeper.hold();
    await flush();
    expect(wakeLock.held()).toBe(1);

    keeper.release();
    await flush();
    expect(wakeLock.held()).toBe(0);
  });

  it('asks only once while already holding one', async () => {
    const wakeLock = createFakeWakeLock();
    const keeper = createWakeLockKeeper(wakeLock);
    keeper.hold();
    keeper.hold();
    await flush();
    keeper.hold();
    keeper.refresh();
    await flush();
    expect(wakeLock.requests).toBe(1);
  });

  it('asks again on refresh after the browser let go of it (the tab was hidden)', async () => {
    const wakeLock = createFakeWakeLock();
    const keeper = createWakeLockKeeper(wakeLock);
    keeper.hold();
    await flush();

    wakeLock.browserReleases();
    keeper.refresh();
    await flush();

    expect(wakeLock.requests).toBe(2);
    expect(wakeLock.held()).toBe(1);
  });

  it("doesn't ask on refresh when it isn't meant to be holding one", async () => {
    const wakeLock = createFakeWakeLock();
    createWakeLockKeeper(wakeLock).refresh();
    await flush();
    expect(wakeLock.requests).toBe(0);
  });

  it('lets go of a lock that arrives after it was released', async () => {
    const wakeLock = createFakeWakeLock();
    const keeper = createWakeLockKeeper(wakeLock);
    keeper.hold();
    keeper.release();
    await flush();
    expect(wakeLock.requests).toBe(1);
    expect(wakeLock.held()).toBe(0);
  });

  it('fails quietly when the browser refuses, and can try again later', async () => {
    const wakeLock = createFakeWakeLock({ refuse: true });
    const keeper = createWakeLockKeeper(wakeLock);
    keeper.hold();
    await flush();
    expect(wakeLock.held()).toBe(0);

    wakeLock.refuse = false;
    keeper.refresh();
    await flush();
    expect(wakeLock.held()).toBe(1);
  });

  it('fails quietly when asking throws outright or letting go fails', async () => {
    const keeper = createWakeLockKeeper({ request: () => { throw new Error('no'); } });
    expect(() => keeper.hold()).not.toThrow();

    const sentinel = { released: false, release: () => Promise.reject(new Error('gone')) };
    const failing = createWakeLockKeeper({ request: async () => sentinel });
    failing.hold();
    await flush();
    failing.release();
    await flush();
  });

  it('does nothing without Wake Lock', () => {
    const keeper = createWakeLockKeeper(null);
    expect(() => { keeper.hold(); keeper.refresh(); keeper.release(); }).not.toThrow();
  });
});
