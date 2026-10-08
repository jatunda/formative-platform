# 01: Unify score-input / Mark Complete rendering across Qualification and Elimination match rows

**What to build:** Elimination Match rows (rendered in the Finals/Bracket view) get their score inputs and Mark Complete/Save Edit button from the same shared rendering logic Qualification Match rows already use, instead of a hand-rolled duplicate. A future change to score-input behavior (validation, decimal handling, draft-score formatting) then only has to land in one place instead of two.

Source: candidate 3 of the robotics architecture review (`/improve-codebase-architecture`), strength "Worth exploring." Not yet grilled in detail — treat the solution direction below as a starting point, not a locked design.

Context: `renderMatchRow`/`renderNowPlaying` (Qualification) share `renderQualificationScoreInputs`/`renderMarkQualificationCompleteButton`. `renderBracketMatch` (Elimination) hand-rolls a structurally identical score-input + Mark Complete/Save Edit block inline instead of reusing those helpers — only the dispatch target differs (`setEliminationDraftScore`/`recordEliminationResult` vs. `setQualificationDraftScore`/`recordQualificationResult`). Candidates 1 and 2 of the same review (render-loop consolidation; `state.js`/`match-timeline.js` selector deepening) are already implemented, so the render-loop's click-safety fixes already cover both call sites — they just aren't the same call site yet.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] The existing Qualification score-input/Mark-Complete helpers are parameterized by which match reference (Qualification vs. Elimination) to dispatch against, rather than being Qualification-specific
- [x] `renderBracketMatch` calls the shared helpers instead of hand-rolling its own score-input/button markup
- [x] No duplicate score-input/Mark-Complete/Save-Edit markup remains for Elimination Matches
- [x] Visual output and click behavior for both Qualification and Elimination match rows are unchanged — existing `robotics.test.js` integration coverage for both still passes (updated only if the DOM structure intentionally changes)
- [x] `npm run test:coverage` passes clean per `CLAUDE.md`

## Comments

Implemented by generalizing `renderQualificationScoreInputs`/`renderMarkQualificationCompleteButton` into match-reference-agnostic `renderScoreInputs`/`renderMarkMatchCompleteButton` (in `web/robotics/robotics.js`), parameterized by `matchRef` plus the `setDraftScore`/`recordResult` dispatch functions to call. `renderMatchRow`, `renderNowPlaying`, and `renderBracketMatch` all now call the shared helpers — `renderBracketMatch`'s hand-rolled score-input/button markup was removed entirely. No DOM/class-name changes; all existing `robotics.test.js` coverage (including bracket score-input/Mark Complete assertions) passes unmodified. `npm run test:coverage` passes clean (1165 tests, thresholds met).

Code review (`/code-review`) ran clean on this change — no findings in the diff itself. It did surface one pre-existing issue in `state.js` (`setQualificationNoShow`/`setEliminationNoShow` eagerly look up the match before `updateOneMatch`'s own locator runs, so an unmatched index/id now throws instead of silently no-oping), introduced by the prior candidates-1/2 work (render-loop consolidation, state.js/match-timeline.js selector deepening) already staged alongside this ticket. Out of scope for this ticket — flagged separately rather than fixed here.
