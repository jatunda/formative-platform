// One way for page tests to open the School Clock and look around it, so a new
// initClockApp option means changing this file, not every clock-page test.
// It knows only initClockApp's options and the DOM, not the page's insides.

import { vi } from 'vitest';
import { initClockApp } from '../../clock/clock.js';
import { SETTINGS_KEY } from '../../clock/clock-storage.js';
import { createFakeStorage } from './fake-storage.js';
import { accessibleName, isShown } from './clock-dom.js';

/** The element the clock mounts on. */
export const clockMount = () => document.getElementById('clockApp');

/** All the page's text, with its whitespace squashed. */
export const pageText = () => clockMount().textContent.replace(/\s+/g, ' ');

/** @param {string} name @param {ParentNode} root @returns {HTMLButtonElement[]} */
const buttonsNamed = (name, root) => [...root.querySelectorAll('button')].filter((b) => accessibleName(b) === name);

/**
 * A shown button by its accessible name.
 * @param {string} name @param {ParentNode} [root]
 */
export const button = (name, root = clockMount()) => buttonsNamed(name, root).find(isShown);

/**
 * A button by its accessible name, shown or not (to check whether it shows).
 * @param {string} name @param {ParentNode} [root]
 */
export const anyButton = (name, root = clockMount()) => buttonsNamed(name, root)[0];

/** Fake device storage already holding `settings`, as the page would have saved them. */
export const storageWith = (settings) => createFakeStorage({ [SETTINGS_KEY]: JSON.stringify(settings) });

/** What the page has saved to `storage`. */
export const savedSettings = (storage) => JSON.parse(storage.getItem(SETTINGS_KEY));

/**
 * A real clock the test moves by hand; the page's ticks come from fake timers.
 * @param {Date | number} start
 */
export function createRealClock(start) {
  let t = Number(start);
  return {
    now: () => t,
    /** Time passes and the page's timers fire as usual. */
    advance: (ms) => { t += ms; vi.advanceTimersByTime(ms); },
    /** Time passes with no timers firing, like a sleeping or throttled tab. */
    jump: (ms) => { t += ms; },
    /** Set the time outright (no timers fire). @param {Date | number} time */
    set: (time) => { t = Number(time); },
  };
}

/**
 * Open the clock on #clockApp and return it. It reads the time from `clock`
 * and starts on an HS device holding `settings`, unless `storage` is given,
 * with an empty tab. Any other initClockApp option (search, soundPlayer,
 * capabilities, prefersReducedMotion, ...) is passed straight through.
 * @param {{ clock?: { now: () => number }, settings?: object } & Parameters<typeof initClockApp>[0]} [options]
 */
export function openClockPage({
  clock, settings = {}, storage = storageWith({ division: 'HS', ...settings }), tabStorage = createFakeStorage(),
  ...options
} = {}) {
  return initClockApp({ realNow: clock?.now, storage, tabStorage, ...options });
}
