# 06: `createRenderLoop`'s mouse-button guard isn't re-checked when the debounced timer actually fires

**What to build:** `scheduleRender` in `web/robotics/render-loop.js` re-checks `mouseButtonDown` at the moment its queued `setTimeout(0)` callback runs `paint()`, not only at the moment the render was originally requested — closing the gap where a full DOM rebuild can still happen while a mouse button is physically held.

Source: surfaced during `/code-review` of `.scratch/robotics-architecture-deepening/issues/closed/04-no-show-setters-throw-on-unmatched-match-ref.md` (render-loop.js was in scope as logic the reviewed commit range touched/extracted). Not yet grilled in detail.

Context: `scheduleRender()` only defers to `mouseUp` if `mouseButtonDown` is already `true` *when it's called*. Once the `setTimeout(0)` is queued, nothing re-checks `mouseButtonDown` before `paint()` runs inside the timer callback. If a render is requested while the mouse is up (scheduling the timer), and an unrelated `mousedown` lands before that queued macrotask fires, `paint()` executes a full DOM rebuild while the button is physically held — exactly the scenario the surrounding comment in `render-loop.js` says this mechanism exists to prevent.

Repro sketch (using the same fake-timer harness as `robotics-render-loop.test.js`):

```js
const loop = createRenderLoop({ mount, render });
loop.requestRender();                      // schedules setTimeout(0) while mouse is up
document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); // sets mouseButtonDown = true, timer untouched
vi.runAllTimers();                         // paint() still fires here, mid "held button"
```

The existing test suite doesn't catch this because its one mouse-down test (`defers a requested render while the mouse button is down...`) always dispatches `mousedown` *before* calling `requestRender()`, never after scheduling but before the timer fires.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] The queued timer callback re-checks `mouseButtonDown` immediately before calling `paint()`, deferring to `mouseUp` (same as the already-mouse-down path) if the button is now held
- [x] Unit test covers requesting a render while the mouse is up, then a `mousedown` landing before the timer fires — `paint()`/`render` must not run until `mouseup`
- [x] `npm run test:coverage` passes clean per `CLAUDE.md`

## Comments

Fixed by re-checking `mouseButtonDown` inside the queued `setTimeout(0)` callback in `scheduleRender` (`web/robotics/render-loop.js`): if the button is now held, it sets `renderPendingUntilMouseUp = true` and returns without painting, same as the already-mouse-down path — `mouseUp`'s existing handler re-queues the render once the button is released. Added a test reproducing the issue's repro sketch (`requestRender()` while the mouse is up, then `mousedown` before the timer fires); `/code-review` found no further issues.
