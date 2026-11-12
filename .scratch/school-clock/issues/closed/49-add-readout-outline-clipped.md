# 49: Bug: the "Add Readout" dashed outline is partly cut off

**Priority:** low

**What to build:** In Readouts edit mode, the dashed rounded outline around "Add Readout" sometimes shows only partly, with its left side fading out or missing. Find when it happens (which layouts, sizes and number of Readouts; likely a parent clipping it, or a border shared with the divider beside it) and fix it so the whole outline always shows.

Eric's words: "sometimes the dotted line around 'add readout' is only partially visible, with the left side of the squircle fading to invisible."

Built behaviour: closed ticket 11 (Readout modes and edit mode).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] The cause is found and written in a comment on this ticket
- [x] With one, two and three Readouts, at the default sizes and at a phone size, the Add Readout outline is whole on every side
- [x] `npm run check:clock -- --editing` screenshots show it whole
- [x] A test guards the fix where jsdom can; the rest is checked in `check:clock`
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**Cause:** the small Readouts' hairline dividers were drawn with `.clock-smalls > * + *`, which also matched edit mode's Add slot (it follows the Readouts in the same row). A patch rule, `.clock-smalls > .clock-readout-add { border-left: 1.5px dashed }`, put the dashed left side back, but in the wide "beside" layout `.clock-readouts.has-smalls .clock-smalls > * + * { border-left: 0 }` outranks it, so with two Readouts at 1920x1080, 1440x900 and 1280x720 the Add slot had no left border, and its rounded corners tapered off to nothing on that side. One Readout (the Add slot is the row's first child) and phone sizes were whole; three Readouts have no Add slot.

**Fix:** every divider rule (`clock.css` x4, `timer.css` x1) now targets `.clock-readout + .clock-readout`, so dividers only sit between Readouts and never reach the Add slot; the patch rule is gone. A Playwright probe of the Add slot's computed borders (one/two/three Readouts x 1920x1080, 1440x900, 1280x720, 480x320, 390x844, 375x667) showed the left side `0px none` before and all four sides dashed after; `check:clock -- --editing` screenshots show it whole. `clock-hosting.test.js` guards the stylesheet: no `.clock-smalls > * + *` and no Add-slot border patch. The 480x320 edit-mode "stage spills out of its row" failures in `check:clock --editing` predate this and belong to ticket 45.
