# 48: Bug: in edit mode, the bar's dashed outline is missing after a switch until the next second

**Priority:** medium

**What to build:** In Readouts edit mode, tapping the bar (the agenda or the Just this Segment bar) switches it correctly, but the switched-to bar has no dashed edit-mode outline until the page redraws on the next second. The outline should be there the moment the switch happens. Find out why (likely the rebuilt bar doesn't get its edit-mode state until the next tick) and fix the cause.

Eric's words: "in readout adjusting mode, when you click on the schedule or the single segment display at the bottom, it switches to the other one correctly, but the dotted line around it doesn't render until the page refreshes at the turn of the second."

Built behaviour: closed tickets 42 (tap the bar in edit mode), 46 (thin bar).

**Blocked by:** 46 (it changes how the bar is drawn)

**Status:** closed

- [x] Right after a tap or Enter/Space switch, the new bar shows the edit-mode outline, with no wait for the next tick
- [x] Focus still lands on the bar's switch after a keyboard switch
- [x] A test fails before the fix and passes after (the outline present straight after the switch, with no tick)
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Cause: `day-bar-view.js`'s `show()` toggled `is-editing` on the bar, then (since a switch changes what's listed) called `build()`, which set `element.className` to `clock-bar clock-bar--<setting>…` and so wiped `is-editing`. The next tick's `show()` didn't rebuild, so its toggle put the outline back: hence the one-second wait. Fix: `build()` writes `is-editing` into the class it sets while in edit mode. Test: `clock-page-bar.test.js` "still looks editable straight after a switch, with no wait for the next tick" (tap and keyboard switch, focus kept), red before the fix.
