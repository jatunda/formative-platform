# 26: Spacing between Readouts so each caption sits with its own number

**Priority:** medium

**What to build:** When the screen shows more than one Readout, the big Readout's caption sits so close to the small Readout under it that it reads as that Readout's label. Fix the spacing so every caption groups with its own number.

Eric confirmed the bug in two layouts: one big Readout over one small one, and one big over two small. Check every layout yourself with `npm run check:clock` (several window sizes, light and dark): one, two and three Readouts, Off-Hours, and the timer running. While the timer runs and the Readouts move to the side they don't overlap, but give the side Readouts **a little** more vertical space between them (a small increase, not a large one). The mini player is fine; leave it alone.

Built behaviour: closed tickets 11, 17 (main screen design), 22 (timer layout). Files: `readout-layout.js`, `readouts-view.js`, `clock.css`, `timer.css`.

**Blocked by:** 25 (the caption gets longer: "until end")

**Status:** open

- [ ] Big over one small, and big over two small: the big caption is clearly closer to its own digits than to the next Readout
- [ ] Timer running: the side Readouts have a little more vertical spacing than now
- [ ] No layout overflows or scrolls at the sizes `check:clock` covers; before/after screenshots attached in the comments
- [ ] Mini player unchanged
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
