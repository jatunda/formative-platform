# 59: One screen-words module says everything the clock writes

**Priority:** medium

**What to build:** A refactor with no visible change. What the screen says is pieced together across several modules:

- `display-text.js`'s `displayText` and `headingText`. `headingText` calls `displayText` with made-up settings and joins its result with `' · '`, which `stage-text-view.js` splits apart again.
- `mini-content.js`, which rebuilds the Readout options.
- `clock.js`'s `textFor`, and the caption rewrite while the Timer shows (around `renderReadouts`).
- `day-bar-view.js`, which re-joins `name · label` that `formatSegmentName` already joins.

There are 4 different ways of passing the settings that affect the words.

Make one pure module that takes the moment, the time, the settings and the Timer view, and returns the words for the stage, the mini player and the Readout captions as structured fields. The views only draw what it returns. The caption rule gets a pure test.

Source: architecture review, 2026-11-12, candidate 2.

**Blocked by:** 58 (both edit `clock.js`'s render path)

**Status:** open

- [ ] No string is joined in one module and split in another
- [ ] One way to pass the settings that affect the words
- [ ] The Timer-caption rule is tested without the DOM
- [ ] Existing clock tests pass
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
