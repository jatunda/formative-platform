# 25: "until end" instead of "left", and no countdown in the Off-Hours line

**Priority:** medium

**What to build:** Two wording fixes on the main screen.

1. The countdown Readout's caption changes from "left" to "until end" (`readouts.js`, `duration(moment.timeLeftMs, 'left')`). Read every place that shows or speaks the caption (main Readouts, mini player, screen-reader labels) and keep them consistent.
2. During Off-Hours the line under the Readouts no longer says how long until the Next School Day ("starts in 2d 14h"). That belongs to the Readouts' "until the Next School Day" mode. The line keeps the rest, e.g. "Back Tue, Nov 11 · A Day" / "Next: Tue, Nov 11 · A Day" / "It's Experience Week · back Mon, Nov 30" (`display-text.js`).

Built behaviour: closed tickets 08 (Off-Hours), 11 (Readout modes).

**Blocked by:** none

**Status:** closed

- [x] No Readout caption says "left" any more; the countdown in a Segment says "until end"
- [x] Off-Hours lines (after school, day off, Experience Week) drop "starts in …"; Summer and no-calendar lines are unchanged
- [x] `startsIn` and any now-unused seconds handling in `display-text.js` are removed rather than left behind
- [x] Tests updated for the new words
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-10: built on `worktree-agent-a167de0a3ba3bf1c8`.**

- **Caption:** a Segment's countdown Readout now says "until end" (`readouts.js`). Beside the timer ring, the old main Readout says "42:30 until end of Period 3" (`clock.js`), and the mini player's foot under a timer says the same (`mini-content.js`). The Remove button's name follows the caption ("Remove Readout: until end"). Passing Periods ("until Period 4") and Off-Hours captions were already right.
- **Off-Hours line:** after school, a day off and Experience Week drop "· starts in …" (`display-text.js`). `startsIn`, the `formatLongDuration` import and the now-unused `showSeconds` parameter are gone. Summer and no-calendar lines are unchanged.
- **Left as is:** the timer's own "left" (the mini player's timer Readout "5:00 left" and the ring's label "Timer, 4:12 left of 5:00"). The timer isn't a Readout, and ticket 29 rewords it.
- **Tests:** updated for the new words. The Off-Hours tests check the whole `.clock-line` text, so a leftover countdown would fail them. The seconds tests now check the Off-Hours countdown Readout instead of the line.
- **Checks:** lint, typecheck and coverage pass. `check:clock` (period, after, dayoff, experience at every size) passed 20/20; the longer caption fits. Spacing between Readouts is ticket 26.
