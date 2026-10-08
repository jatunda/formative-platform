# 02: Extract bracket-layout math and time-of-day conversion into pure, tested modules

**What to build:** The Elimination Bracket's column-centering flex-grow ratio calculation and the Match Timeline's time-of-day↔epoch conversion stop living as untested inline functions inside `robotics.js`'s orchestrator, and move into pure modules matching the existing pattern already used for `standings.js`, `match-timeline.js`, and `current-match.js`. Each is independently unit-tested once extracted; the time-of-day functions take an injectable "now" instead of reading `new Date()` directly, so midnight/DST correctness becomes testable instead of assumed.

Source: candidate 4 of the robotics architecture review (`/improve-codebase-architecture`), strength "Worth exploring." Not yet grilled in detail — treat the solution direction below as a starting point, not a locked design. (A third item from the original candidate — `restoreFocusPath`'s sibling-count mismatch bail-out — was already addressed as part of candidate 1's `render-loop.js` consolidation, so it's out of scope here.)

Context: `renderBracketRoundColumn`/`renderBracketSpacer` compute a "1 : 2 : 2 : ... : 2 : 1" flex-grow ratio to center bracket columns, with no test asserting the computed values or resulting layout. `timeOfDayToEpochMs`/`timeOfDayInputValue` construct epoch times from local-machine `new Date()` with no injectable clock. Both fail silently (an uneven bracket column; a wrong date near a day boundary) rather than throwing, which is exactly the risk profile the already-extracted pure modules exist to cover.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] Bracket column grow-ratio math lives in its own exported, pure function (e.g. in a new `bracket-layout.js`, or alongside `bracket.js`), decoupled from DOM construction
- [x] Direct unit tests cover the grow-ratio calculation for small, large, and odd round counts
- [x] `timeOfDayToEpochMs`/`timeOfDayInputValue` live in a pure module (e.g. `match-timeline.js`) and accept an injectable reference time instead of calling `new Date()` internally
- [x] Direct unit tests cover `timeOfDayToEpochMs`/`timeOfDayInputValue`, including a case at/near a day boundary (midnight)
- [x] `robotics.js` calls the extracted functions; no behavior change to the rendered Bracket layout or the Match Timeline's time inputs
- [x] `npm run test:coverage` passes clean per `CLAUDE.md`

## Comments

Implemented: `bracketColumnSpacerGrowRatios` added to new `bracket-layout.js`; `timeOfDayToEpochMs`/`timeOfDayInputValue` moved into `match-timeline.js` with `timeOfDayToEpochMs` taking an optional `referenceTime` (defaults to `Date.now()`). `robotics.js` now imports both and calls them; `renderBracketRoundColumn`/`renderBracketSpacer` keep only DOM construction. Coverage: both new/touched modules at 100%; full suite coverage gate passes clean. `/code-review` found no issues.
