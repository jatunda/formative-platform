# 01: Saved Progress: survive refresh, resume, reset

**What to build:** A student's work on a Practice Set survives refreshing or closing the page. Coming back puts them on the Frontier, or on the end-of-set summary if they'd finished. A Question left mid-retry comes back exactly as it was: the used Attempt, the wrong pick's Explanation still showing, and any unsubmitted pick. The summary gets a **Reset answers & start over** button that wipes this Practice Set's Saved Progress at once (no confirm) and starts again at Question 1. Single tab only; live sync between tabs is ticket 02.

See the spec (`../spec.md`): the "Saved Progress store" and "Practice Set delivery controller" implementation decisions, and user stories 1–18 and 25–30. `CONTEXT.md` defines Saved Progress and Frontier.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] A Saved Progress store module for one Practice Set, with load, record-one-Question, clear, and subscribe. A browser-storage-backed version for production and an in-memory version for tests. The delivery controller receives the store instead of reaching for storage directly.
- [x] Saved Progress is keyed by Question id (never position), versioned, and namespaced per Practice Set. Storage that's blocked, full, or corrupt falls back to working in-memory without breaking delivery.
- [x] Every widget state change (selection and submit, not just finishing) is recorded, so a half-done Question survives a refresh.
- [x] The question widget can restore a finished Question silently: no celebration, no sound, no focus steal.
- [x] Explicit **Order** step (today: the set's current order, Questions that no longer exist dropped) and **Navigable** step (today: up to and including the Frontier). The Frontier is derived from Saved Progress, never stored.
- [x] On mount: open on the Frontier, or on the summary if every Question is finished.
- [x] Editing a set: removed Questions' saved answers are ignored in the Frontier and summary. Added Questions show as unfinished. Reordered Questions keep their answers.
- [x] The summary shows **Reset answers & start over**. Clicking it clears Saved Progress immediately and lands on Question 1 with nothing answered. No reset control mid-set.
- [x] Tests at the delivery-controller seam (remounting against the same in-memory store stands in for a refresh) cover:
  - resume at the Frontier and on the summary
  - a half-done Question and an unsubmitted pick surviving a remount
  - reset
  - a changed Question list
- [x] Small tests for the browser-storage store cover a save/load round-trip, isolation between Practice Sets, clear, and the corrupt/throwing-storage fallback.
- [x] Existing Frontier navigation and keyboard tests still pass. Lint, typecheck and `test:coverage` are clean, with thresholds not lowered.

## Comments

Implemented in `web/saved-progress.js` (localStorage store plus an in-memory store for tests), wired into `startPracticeSet` in `web/practice-view.js`. The store already has `subscribe` and reacts to `storage` events (unit-tested), but the controller doesn't subscribe yet. Wiring that in is ticket 02. Corrupt per-Question entries are dropped one by one. The question widget also drops a saved pick whose index is past the Options list.

Known limitation: a Practice Set that lists the same Question twice shares one Saved Progress entry for both positions, because entries are keyed by Question id.
