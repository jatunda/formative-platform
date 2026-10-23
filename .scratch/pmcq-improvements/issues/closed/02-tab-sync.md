# 02: Tab sync

**What to build:** With the same Practice Set open in several tabs, answers, the Frontier and resets stay in sync live. Each tab keeps whichever Question it was showing. If tab A finishes the Question tab B is viewing, tab B redraws it as finished from Saved Progress, without replaying the celebration or sound. A reset in any tab sends every tab back to Question 1, cleared.

See the spec (`../spec.md`): user stories 19–24, and "On a change from another tab…" under the delivery controller decisions.

**Blocked by:** 01 (Saved Progress)

**Status:** closed

- [x] The browser-storage store's subscribe reports changes made in other tabs (via the browser's `storage` event), and the in-memory store notifies other subscribers on the same store, so tests can mount "two tabs".
- [x] On a change from elsewhere, the controller recomputes the Frontier and redraws the viewed Question only if that Question's state changed, silently. It never changes which Question a tab is viewing, except after a reset.
- [x] A reset in one tab sends the others to Question 1 with nothing answered.
- [x] A tab's own changes don't come back to it as "outside" changes and trigger a double redraw.
- [x] Tests mount two controllers on one in-memory store and cover:
  - an answer in one appearing in the other
  - the viewed Question being kept
  - no celebration in the passive tab
  - reset spreading to the other tab
  - the Frontier advancing in the passive tab
- [x] A test for the browser-storage store: a `storage` event for its key reaches subscribers, and other keys are ignored.
- [x] Lint, typecheck and `test:coverage` are clean.

## Comments

- The store side (storage-event subscribe, in-memory `sharedWith` tabs, and its storage-event tests) already landed with 01; this ticket added the controller's subscription in `practice-view.js` and the two-tab controller tests.
- A reset is recognised as incoming Saved Progress with no Questions when this tab had some. Own-change echo suppression relies on the store (real `storage` events never fire in the writing tab; the in-memory store mirrors that).
- Celebration is observed by mocking `celebration.js` in `practice-view.test.js`.
