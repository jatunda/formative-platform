# 56: The ring's geometry lives in one module that the app and the checker share

**Priority:** medium

**What to build:** A refactor with no visible change. Today the facts about the timer's ring are copied by hand:

- `ring-fit.js` has the circle-against-box test (`clears`), `RING_GAP = 12`, and its obstacle selectors.
- `scripts/clock-check-browser.mjs` (around lines 150-176) has its own overlap test, a hand-copied radius (`49.2 / 50`, from `r="48"` in `timer-ring.js` and `stroke-width: 2.4` in `timer.css`), no gap, and slightly different obstacles (whole small Readouts, where ring-fit uses their values).
- The glyph counts `--d`/`--c`/`--u` are worked out by `readoutParts().glyphs` (readouts.js) for `readouts-view.js`, and separately by a regex in `timer-ring.js`.

As a result, the checker can pass a layout that ring-fit treats as touching.

Make one ring geometry module: the radius ratio, the gap, the obstacles and the overlap test, plus one glyph count. ring-fit, the checker (inside `page.evaluate`, for example by importing the module from the served page) and timer-ring all use it. The checker then checks what ring-fit promises: the same obstacles and the same gap.

If the stricter checker turns up layouts that fail `check:clock:full`, don't change layout CSS in this ticket. Add them to `KNOWN_FAILURES` under a new ticket file that lists them, and say so here.

Source: architecture review, 2026-11-12, candidate 3.

**Blocked by:** None

**Status:** closed

- [x] One module holds the ring's radius ratio, gap, obstacles and overlap test; ring-fit and the checker both use it, and the checker's own copy is gone
- [x] timer-ring's glyph count comes from the same place as the Readouts'
- [x] No visible change to the clock
- [x] `npm run check:clock:full` passes (any new failures recorded as above)
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-12: built.** New `web/clock/ring-geometry.js` (`// @ts-check`) holds the ring's facts: its SVG box, radius and stroke (`RING_BOX` 100, `RING_R` 48, `RING_STROKE` 2.4), `RING_GAP` (12, moved from ring-fit), the obstacle selectors (`TOP_BAR_PIECES`, `SIDE_VALUES`), the clearing test (`ringClears`, moved from ring-fit's private `clears`), `ringObstacles(root)` (the top bar's Day Label and buttons and the small Readouts' values, named for a report) and `ringTouches(ringBox, obstacles)`.

- `ring-fit.js` imports the gap, the selectors and the test from it; its search and its numbers are unchanged.
- `clock-check-browser.mjs` drops its own overlap test, the hand-copied `49.2 / 50` radius and its own selectors: inside `page.evaluate` it imports `/clock/ring-geometry.js` from the served page and reports `ringTouches(ring, ringObstacles(document))`. So it now checks ring-fit's circle (the one filling the ring's box, which holds the drawn circle), ring-fit's obstacles (the Day Label's box rather than its text; the small Readouts' values rather than the whole Readouts) and the 12px gap. `RING_SLACK` (0.5px) lets a measured ring fall short of the gap by layout's sub-pixel rounding: without it ring-fit's exact fits at 1280 × 720 and 1440 × 900 measured 11.99px from "Timer" and failed.
- `timer-ring.js` draws its circles from `RING_BOX`/`RING_R`/`RING_STROKE` (the stroke width moved from `timer.css` to the circles' `stroke-width` attribute; no other rule sets it, so the ring draws the same). Its digits' `--d`/`--c` come from the new `glyphCounts` in `readouts.js`, which `readoutParts().glyphs` now uses too; the regexes in `timer-ring.js` are gone.
- Tests: `clock-ring-geometry.test.js` (the drawn circle fits the kept-clear one, the clearing test, `ringTouches` with gap, slack and hidden boxes, `ringObstacles` against a DOM); `clock-page-timer.test.js` checks the ring's digits carry `--d`/`--c`.

The stricter check found 60 renders that keep less than the gap, all at 480 × 320 with the timer and not editing: the ring sits about 4px from "Timer" and 10px from "Bells" (the short layout doesn't fit the ring to the top bar), and in about half the states closer than 12px to a side value. No layout CSS changed here: they're ticket 60 (`60-small-landscape-ring-gap.md`) and one `KNOWN_FAILURES` entry.

Checks in `web/`: `npm run lint`, `npm run typecheck` clean; `npm run test:coverage` 3521 tests pass, 94.43% lines / 96.44% branches; `npm run check:clock:full` passes 1634/1694 with 60 known (ticket 60), 0 unexpected, 0 stale.
