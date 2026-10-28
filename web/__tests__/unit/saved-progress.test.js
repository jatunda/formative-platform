import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLocalStorageSavedProgressStore, createInMemorySavedProgressStore, savedProgressKey } from '../../saved-progress.js';

const FINISHED = { selectedIndex: 0, lastSubmittedWrongIndex: null, attemptCount: 0, finished: true, outcome: 'firstTry' };
const MID_RETRY = { selectedIndex: 1, lastSubmittedWrongIndex: 1, attemptCount: 1, finished: false, outcome: null };

describe('createLocalStorageSavedProgressStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty when nothing has been saved', () => {
    const store = createLocalStorageSavedProgressStore('ps1');
    expect(store.load().questions).toEqual({});
  });

  it('round-trips recorded Question states through storage (a fresh store stands in for a refresh)', () => {
    const store = createLocalStorageSavedProgressStore('ps1');
    store.record('q1', FINISHED);
    store.record('q2', MID_RETRY);

    const afterRefresh = createLocalStorageSavedProgressStore('ps1');
    expect(afterRefresh.load().questions).toEqual({ q1: FINISHED, q2: MID_RETRY });
  });
});

describe('createLocalStorageSavedProgressStore isolation, clear, and fallbacks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps each Practice Set separate', () => {
    createLocalStorageSavedProgressStore('ps1').record('q1', FINISHED);

    expect(createLocalStorageSavedProgressStore('ps2').load().questions).toEqual({});
    expect(createLocalStorageSavedProgressStore('ps1').load().questions).toEqual({ q1: FINISHED });
  });

  it('clear wipes this Practice Set only, in memory and in storage', () => {
    const store = createLocalStorageSavedProgressStore('ps1');
    store.record('q1', FINISHED);
    createLocalStorageSavedProgressStore('ps2').record('q1', FINISHED);

    store.clear();

    expect(store.load().questions).toEqual({});
    expect(createLocalStorageSavedProgressStore('ps1').load().questions).toEqual({});
    expect(createLocalStorageSavedProgressStore('ps2').load().questions).toEqual({ q1: FINISHED });
  });

  it('starts empty when the stored entry is corrupt, then saves over it', () => {
    const store = createLocalStorageSavedProgressStore('ps1');
    store.record('q1', FINISHED);
    const key = localStorage.key(0);
    localStorage.setItem(key, '{not valid json');

    const afterCorruption = createLocalStorageSavedProgressStore('ps1');
    expect(afterCorruption.load().questions).toEqual({});
    afterCorruption.record('q2', MID_RETRY);
    expect(createLocalStorageSavedProgressStore('ps1').load().questions).toEqual({ q2: MID_RETRY });
  });

  it('drops individual Question entries that are corrupt, keeping the valid ones', () => {
    const store = createLocalStorageSavedProgressStore('ps1');
    store.record('q1', FINISHED);
    localStorage.setItem(localStorage.key(0), JSON.stringify({
      version: 1,
      questions: {
        q1: FINISHED,
        empty: {},
        nothing: null,
        text: 'oops',
        negativePick: { ...MID_RETRY, selectedIndex: -1 },
        fractionalPick: { ...MID_RETRY, lastSubmittedWrongIndex: 0.5 },
        badOutcome: { ...FINISHED, outcome: 'great' },
        badAttempts: { ...MID_RETRY, attemptCount: 'one' },
      },
    }));

    expect(createLocalStorageSavedProgressStore('ps1').load().questions).toEqual({ q1: FINISHED });
  });

  it("keeps every wrong pick a student submitted, and older entries saved before wrong picks were recorded", () => {
    const secondTry = { ...FINISHED, attemptCount: 1, outcome: 'secondTry', wrongPicks: [2] };
    const missed = { selectedIndex: 2, lastSubmittedWrongIndex: null, attemptCount: 2, finished: true, outcome: 'missed', wrongPicks: [1, 2] };
    const store = createLocalStorageSavedProgressStore('ps1');
    store.record('q1', secondTry);
    store.record('q2', missed);
    store.record('old', MID_RETRY);

    expect(createLocalStorageSavedProgressStore('ps1').load().questions).toEqual({ q1: secondTry, q2: missed, old: MID_RETRY });
  });

  it('drops an entry whose wrong picks are not a list of Option indexes', () => {
    const store = createLocalStorageSavedProgressStore('ps1');
    store.record('q1', FINISHED);
    localStorage.setItem(localStorage.key(0), JSON.stringify({
      version: 1,
      questions: {
        q1: FINISHED,
        notAList: { ...MID_RETRY, wrongPicks: 1 },
        nullList: { ...MID_RETRY, wrongPicks: null },
        negative: { ...MID_RETRY, wrongPicks: [-1] },
        fractional: { ...MID_RETRY, wrongPicks: [0.5] },
        text: { ...MID_RETRY, wrongPicks: ['1'] },
        nullPick: { ...MID_RETRY, wrongPicks: [null] },
      },
    }));

    expect(createLocalStorageSavedProgressStore('ps1').load().questions).toEqual({ q1: FINISHED });
  });

  it('ignores a stored entry from an unknown version', () => {
    const store = createLocalStorageSavedProgressStore('ps1');
    store.record('q1', FINISHED);
    localStorage.setItem(localStorage.key(0), JSON.stringify({ version: 999, questions: { q1: FINISHED } }));

    expect(createLocalStorageSavedProgressStore('ps1').load().questions).toEqual({});
  });

  it('keeps working in memory when every storage access throws', () => {
    const throwing = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('quota exceeded'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    const store = createLocalStorageSavedProgressStore('ps1', { storage: /** @type {any} */ (throwing) });

    expect(store.load().questions).toEqual({});
    store.record('q1', FINISHED);
    expect(store.load().questions).toEqual({ q1: FINISHED });
    store.clear();
    expect(store.load().questions).toEqual({});
  });

  it('still clears across a refresh when removing the entry fails', () => {
    const storage = {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      removeItem: () => { throw new Error('blocked'); },
    };
    const store = createLocalStorageSavedProgressStore('ps1', { storage: /** @type {any} */ (storage) });
    store.record('q1', FINISHED);

    store.clear();

    expect(createLocalStorageSavedProgressStore('ps1').load().questions).toEqual({});
  });

  it('keeps working in memory when there is no storage at all', () => {
    const store = createLocalStorageSavedProgressStore('ps1', { storage: null, eventTarget: null });

    store.record('q1', FINISHED);
    expect(store.load().questions).toEqual({ q1: FINISHED });
    store.clear();
    expect(store.load().questions).toEqual({});
  });

  it('does not let a caller mutate saved state through a loaded copy', () => {
    const store = createLocalStorageSavedProgressStore('ps1');
    store.record('q1', MID_RETRY);

    store.load().questions.q1.finished = true;

    expect(store.load().questions.q1.finished).toBe(false);
  });
});

describe('createLocalStorageSavedProgressStore cross-tab changes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function storageEvent(key, newValue) {
    const event = new Event('storage');
    Object.assign(event, { key, newValue });
    return event;
  }

  it('passes another tab\'s write to subscribers and to later loads', () => {
    const eventTarget = new EventTarget();
    const store = createLocalStorageSavedProgressStore('ps1', { eventTarget });
    const seen = [];
    store.subscribe((progress) => seen.push(progress.questions));

    const otherTab = createLocalStorageSavedProgressStore('ps1', { eventTarget: null });
    otherTab.record('q1', FINISHED);
    const key = localStorage.key(0);
    eventTarget.dispatchEvent(storageEvent(key, localStorage.getItem(key)));

    expect(seen).toEqual([{ q1: FINISHED }]);
    expect(store.load().questions).toEqual({ q1: FINISHED });
  });

  it('treats another tab\'s clear (or a wipe of all storage) as empty progress', () => {
    const eventTarget = new EventTarget();
    const store = createLocalStorageSavedProgressStore('ps1', { eventTarget });
    store.record('q1', FINISHED);
    const key = localStorage.key(0);
    const seen = [];
    store.subscribe((progress) => seen.push(progress.questions));

    eventTarget.dispatchEvent(storageEvent(key, null));
    store.record('q1', FINISHED);
    eventTarget.dispatchEvent(storageEvent(null, null));

    expect(seen).toEqual([{}, {}]);
    expect(store.load().questions).toEqual({});
  });

  it('ignores changes to other Practice Sets and stops notifying once unsubscribed', () => {
    const eventTarget = new EventTarget();
    const store = createLocalStorageSavedProgressStore('ps1', { eventTarget });
    createLocalStorageSavedProgressStore('ps2', { eventTarget: null }).record('q1', FINISHED);
    const seen = [];
    const unsubscribe = store.subscribe((progress) => seen.push(progress));

    const otherKey = localStorage.key(0);
    eventTarget.dispatchEvent(storageEvent(otherKey, localStorage.getItem(otherKey)));
    unsubscribe();
    const ownKey = savedProgressKey('ps1');
    eventTarget.dispatchEvent(storageEvent(ownKey, JSON.stringify({ version: 1, questions: { q1: FINISHED } })));

    expect(seen).toEqual([]);
  });
});

describe('createInMemorySavedProgressStore', () => {
  it('shares one record between "tabs", and each hears only the other\'s changes', () => {
    const tabA = createInMemorySavedProgressStore();
    const tabB = createInMemorySavedProgressStore({ sharedWith: tabA });
    const heardByA = [];
    const heardByB = [];
    tabA.subscribe((progress) => heardByA.push(progress.questions));
    const unsubscribeB = tabB.subscribe((progress) => heardByB.push(progress.questions));

    tabA.record('q1', FINISHED);
    tabB.clear();
    unsubscribeB();
    tabA.record('q2', MID_RETRY);

    expect(heardByA).toEqual([{}]);
    expect(heardByB).toEqual([{ q1: FINISHED }]);
    expect(tabB.load().questions).toEqual({ q2: MID_RETRY });
  });

  it('keeps separate stores separate', () => {
    const one = createInMemorySavedProgressStore();
    createInMemorySavedProgressStore().record('q1', FINISHED);

    expect(one.load().questions).toEqual({});
  });
});

describe('createLocalStorageSavedProgressStore without usable localStorage', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', original);
  });

  it('works in memory when merely reading localStorage throws (locked-down browser)', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('SecurityError'); } });
    const store = createLocalStorageSavedProgressStore('ps1');

    store.record('q1', FINISHED);
    expect(store.load().questions).toEqual({ q1: FINISHED });
  });

  it('works in memory when the browser has no localStorage', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: undefined });
    const store = createLocalStorageSavedProgressStore('ps1');

    store.record('q1', FINISHED);
    expect(store.load().questions).toEqual({ q1: FINISHED });
  });
});
