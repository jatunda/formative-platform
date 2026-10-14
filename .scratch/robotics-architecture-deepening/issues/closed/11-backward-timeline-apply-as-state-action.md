# 11: Backward Match Timeline Apply becomes a state action

**What to build:** Clicking Apply on the Match Timeline in Backward mode back-calculates the Start Time from the target End Time inside a state action, not inside the click handler. Today the handler is the only place that combines total duration, scheduled match count (Estimated Bracket Size, Third-Place Match) and the End Time → Start Time conversion, and the state action it calls is a raw patch with no rules. This makes the back-calculation unit-testable without a DOM. Behaviour is unchanged.

Source: candidate 2 of the 2026-10-12 architecture review. Vocabulary: **Match Timeline** (Forward / Backward), **Match Time**, **Field Count**, **Bracket Size** in `web/robotics/CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] An Apply-timeline state action takes the mode and entered values and produces the resulting Match Timeline, including the back-calculated Start Time in Backward mode
- [x] The click handler only reads inputs and dispatches the action
- [x] Changing the actual Bracket Size later still does not re-target the original End Time (existing CONTEXT.md rule)
- [x] Unit tests cover Forward and Backward Apply, with and without a Third-Place Match, and a non-power-of-two Estimated Bracket Size
- [x] Existing Match Timeline DOM tests pass unchanged
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Comments

- **2026-10-14 (implementation):** The action is `applyMatchTimeline(state, { mode, time })` in `web/robotics/state.js`. The click handler only parses the time input and dispatches it with the panel's mode. Two deliberate differences from the old handler:
  - **Cleared End Time.** Clearing the End Time in Backward mode now clears the Start Time too. Before, it stored `null − duration`, a negative epoch that gave every match a bogus clock time.
  - **Which state it reads.** The back-calculation now reads the state at dispatch time rather than the render-time closure. The two only differ if state changed without a re-render.

  The commit also adds an unrelated `suggestEvenMatchesPerTeam` test. It closes a branch-coverage gap in `state.js` that existed before this change.
