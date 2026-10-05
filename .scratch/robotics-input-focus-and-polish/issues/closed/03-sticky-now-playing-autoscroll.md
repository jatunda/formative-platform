# 03: Sticky Now Playing banner + auto-scroll to the Current Match

**What to build:** On the Schedule & Standings tab:

- The Now Playing hero banner stays pinned in view (sticky) while the Qualification Matches list below it is scrolled, instead of scrolling out of view.
- When the Current Match advances (a match is marked complete and the next not-yet-complete match becomes current), the Qualification Matches list auto-scrolls so the new Current Match row is in view, without the teacher needing to scroll manually.

Auto-scroll should trigger on the Current Match actually changing, not on every re-render (e.g. editing a draft score shouldn't yank scroll position).

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] Scrolling the Qualification Matches list on a tall roster keeps the Now Playing banner visible at the top instead of scrolling away.
- [x] Marking the Current Match complete scrolls the list to bring the new Current Match row into view automatically.
- [x] Editing a draft score (without completing the match) does not trigger an auto-scroll or reset manual scroll position.
- [ ] `cd web && npm run test:coverage` passes.

## Comments

Implemented as commit `a506a50`: `.robotics-now-playing-layout` gets `position: sticky; top: 0` plus an opaque background (robotics.css); `dispatch()` in `robotics.js` now compares the Current Match index before/after each update and calls `scrollIntoView({ block: 'nearest' })` on `.robotics-match-row.is-current` only when it changed. Two new tests cover the Mark Complete / draft-score-edit / other-tab cases and pass in isolation (`npx vitest run robotics.test.js -t "auto-scroll"`).

The last box is unchecked: at implementation time, many other sessions were concurrently editing `robotics.js`/`robotics.css`/`robotics.test.js` in this same working tree for other tickets (01, 02, 04, 05, 06), so the full suite was red for unrelated reasons (e.g. a `flushRender` test helper referenced but not yet defined by another in-flight session). Per user direction, this ticket's isolated diff was committed on top of HEAD without running the full gate. **Re-run `cd web && npm run test:coverage` once the other tickets have landed**, before relying on this box being checked.
