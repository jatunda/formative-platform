# 25: "until end" instead of "left", and no countdown in the Off-Hours line

**Priority:** medium

**What to build:** Two wording fixes on the main screen.

1. The countdown Readout's caption changes from "left" to "until end" (`readouts.js`, `duration(moment.timeLeftMs, 'left')`). Read every place that shows or speaks the caption (main Readouts, mini player, screen-reader labels) and keep them consistent.
2. During Off-Hours the line under the Readouts no longer says how long until the Next School Day ("starts in 2d 14h"). That belongs to the Readouts' "until the Next School Day" mode. The line keeps the rest, e.g. "Back Tue, Nov 11 · A Day" / "Next: Tue, Nov 11 · A Day" / "It's Experience Week · back Mon, Nov 30" (`display-text.js`).

Built behaviour: closed tickets 08 (Off-Hours), 11 (Readout modes).

**Blocked by:** none

**Status:** open

- [ ] No Readout caption says "left" any more; the countdown in a Segment says "until end"
- [ ] Off-Hours lines (after school, day off, Experience Week) drop "starts in …"; Summer and no-calendar lines are unchanged
- [ ] `startsIn` and any now-unused seconds handling in `display-text.js` are removed rather than left behind
- [ ] Tests updated for the new words
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
