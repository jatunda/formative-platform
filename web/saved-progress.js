// @ts-check
// Saved Progress for one Practice Set (see CONTEXT.md): one browser's record
// of a student's per-Question widget state, kept in browser storage and never
// in the database (docs/adr/0012). The delivery controller (practice-view.js)
// only talks to the store interface below, so tests inject the in-memory
// store and production uses the localStorage-backed one.

/**
 * @typedef {{
 *   selectedIndex: number|null,
 *   lastSubmittedWrongIndex: number|null,
 *   attemptCount: number,
 *   finished: boolean,
 *   outcome: "firstTry"|"secondTry"|"missed"|null,
 *   wrongAttempts?: number[],
 * }} QuestionState
 *
 * `wrongAttempts` holds the Option index of every wrong Attempt, in order.
 * Entries saved before it existed lack it; they stay valid, and the widget
 * seeds it on restore from what they do record.
 *
 * Keyed by Question id, never by position, so editing a Practice Set's list
 * leaves the Questions still in it intact. `version` lets a later shape (e.g.
 * a saved shuffled order) be told apart from today's.
 * @typedef {{ version: number, questions: Record<string, QuestionState> }} SavedProgress
 *
 * @typedef {{
 *   load: () => SavedProgress,
 *   record: (questionId: string, state: QuestionState) => void,
 *   clear: () => void,
 *   subscribe: (listener: (progress: SavedProgress) => void) => () => void,
 * }} SavedProgressStore
 */

const SAVED_PROGRESS_VERSION = 1;

/** @returns {SavedProgress} */
function emptyProgress() {
  return { version: SAVED_PROGRESS_VERSION, questions: {} };
}

/**
 * @param {SavedProgress} progress
 * @returns {SavedProgress}
 */
function copyProgress(progress) {
  const questions = /** @type {Record<string, QuestionState>} */ ({});
  for (const [id, state] of Object.entries(progress.questions)) {
    questions[id] = { ...state };
  }
  return { version: progress.version, questions };
}

const OUTCOMES = new Set(['firstTry', 'secondTry', 'missed', null]);

/** @param {unknown} value */
function isOptionIndex(value) {
  return Number.isInteger(value) && /** @type {number} */ (value) >= 0;
}

/** @param {unknown} value */
function isOptionIndexOrNull(value) {
  return value === null || isOptionIndex(value);
}

/** @param {unknown} value */
function isOptionIndexList(value) {
  return Array.isArray(value) && value.every(isOptionIndex);
}

/**
 * Whether a stored entry is safe to hand the question widget as restoreState.
 * @param {any} state
 * @returns {state is QuestionState}
 */
function isQuestionState(state) {
  return Boolean(state) && typeof state === 'object'
    && isOptionIndexOrNull(state.selectedIndex)
    && isOptionIndexOrNull(state.lastSubmittedWrongIndex)
    && Number.isInteger(state.attemptCount)
    && typeof state.finished === 'boolean'
    && OUTCOMES.has(state.outcome)
    && (state.wrongAttempts === undefined || isOptionIndexList(state.wrongAttempts));
}

/**
 * @param {string|null} raw
 * @returns {SavedProgress}
 */
function parseProgress(raw) {
  const progress = emptyProgress();
  if (raw === null) return progress;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === SAVED_PROGRESS_VERSION
      && parsed.questions && typeof parsed.questions === 'object') {
      // Corrupt Question entries are dropped one by one (those Questions
      // just show as unanswered), keeping the rest of the student's work.
      for (const [id, state] of Object.entries(parsed.questions)) {
        if (isQuestionState(state)) progress.questions[id] = state;
      }
    }
  } catch {
    // Corrupt entry: start over rather than break delivery.
  }
  return progress;
}

/**
 * @param {string} practiceSetId
 * @returns {string}
 */
export function savedProgressKey(practiceSetId) {
  return `formative-saved-progress:${practiceSetId}`;
}

/**
 * Saved Progress backed by one localStorage entry per Practice Set. The
 * in-memory copy is this tab's source of truth; storage is only persistence
 * (and, via `storage` events, the channel from other tabs). Every storage
 * access is wrapped, so blocked, full, or corrupt storage degrades to
 * in-memory-only progress for this page load instead of breaking delivery.
 * @param {string} practiceSetId
 * @param {{ storage?: Storage|null, eventTarget?: EventTarget|null }} [options]
 * @returns {SavedProgressStore}
 */
export function createLocalStorageSavedProgressStore(practiceSetId, options = {}) {
  const key = savedProgressKey(practiceSetId);
  const storage = options.storage !== undefined ? options.storage : defaultStorage();
  const eventTarget = options.eventTarget !== undefined ? options.eventTarget : window;

  /** @type {SavedProgress} */
  let current = readStorage();
  /** @type {Set<(progress: SavedProgress) => void>} */
  const listeners = new Set();

  function readStorage() {
    if (!storage) return emptyProgress();
    try {
      return parseProgress(storage.getItem(key));
    } catch {
      return emptyProgress();
    }
  }

  function writeStorage() {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(current));
    } catch {
      // Full or blocked: keep going on the in-memory copy.
    }
  }

  if (eventTarget) {
    eventTarget.addEventListener('storage', (event) => {
      const { key: changedKey, newValue } = /** @type {StorageEvent} */ (event);
      // A null key means another tab cleared all of storage.
      if (changedKey !== key && changedKey !== null) return;
      current = parseProgress(changedKey === null ? null : newValue);
      listeners.forEach((listener) => listener(copyProgress(current)));
    });
  }

  return {
    load: () => copyProgress(current),
    record(questionId, state) {
      current.questions[questionId] = { ...state };
      writeStorage();
    },
    clear() {
      // Saved as an empty record rather than removed, through the same
      // guarded write as record(), so other tabs hear it the same way.
      current = emptyProgress();
      writeStorage();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * @typedef {{ progress: SavedProgress, tabs: Set<(progress: SavedProgress) => void> }} SharedArea
 * @typedef {SavedProgressStore & { area: SharedArea }} InMemorySavedProgressStore
 */

/**
 * Saved Progress held only in memory, for tests. Pass `sharedWith` another
 * in-memory store to simulate a second tab of the same Practice Set: the two
 * share one record, and each one's subscribers hear only the *other's*
 * changes, as with real `storage` events.
 * @param {{ sharedWith?: InMemorySavedProgressStore }} [options]
 * @returns {InMemorySavedProgressStore}
 */
export function createInMemorySavedProgressStore({ sharedWith } = {}) {
  /** @type {SharedArea} */
  const area = sharedWith ? sharedWith.area : { progress: emptyProgress(), tabs: new Set() };
  /** @type {Set<(progress: SavedProgress) => void>} */
  const listeners = new Set();
  /** @param {SavedProgress} progress */
  const notifyThisTab = (progress) => listeners.forEach((listener) => listener(copyProgress(progress)));
  area.tabs.add(notifyThisTab);

  function notifyOtherTabs() {
    area.tabs.forEach((notify) => {
      if (notify !== notifyThisTab) notify(area.progress);
    });
  }

  return {
    area,
    load: () => copyProgress(area.progress),
    record(questionId, state) {
      area.progress.questions[questionId] = { ...state };
      notifyOtherTabs();
    },
    clear() {
      area.progress = emptyProgress();
      notifyOtherTabs();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** @returns {Storage|null} */
function defaultStorage() {
  // Merely reading window.localStorage throws in some locked-down browsers.
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}
