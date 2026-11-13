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

**Status:** open

- [ ] One module holds the ring's radius ratio, gap, obstacles and overlap test; ring-fit and the checker both use it, and the checker's own copy is gone
- [ ] timer-ring's glyph count comes from the same place as the Readouts'
- [ ] No visible change to the clock
- [ ] `npm run check:clock:full` passes (any new failures recorded as above)
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
