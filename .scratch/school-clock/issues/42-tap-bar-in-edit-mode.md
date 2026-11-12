# 42: In Readouts edit mode, tap the bar to switch Whole day / Just this Segment

**Priority:** medium

**What to build:** While the Readouts control's edit mode is on, the bar along the bottom becomes tappable, just as each Readout is. Tapping it switches the saved bar setting between **Whole day** and **Just this Segment**, and the Look sheet's "Bottom bar" choice shows the new value. It's a saved device setting, not the per-tab Readout layout. Outside edit mode the bar is not tappable, as today.

In edit mode the bar should look editable, the way Readouts do there (the same edit-mode treatment), and the edit note ("Tap a Readout to change what it shows") should mention the bar too. The bar is a button for keyboard and screen-reader users while editing, with a label that says what a tap does ("Bottom bar: Whole day. Switch to Just this Segment").

On phones, whole day is the agenda list. Tapping it in edit mode switches it the same way. It must not get in the way of scrolling the list (a scroll is not a tap).

Eric's words: "when in readouts editing mode, click on schedule to hide/show it (updates settings to match)". In grilling he clarified that "hide/show" means switching between whole day and just this Segment.

Built behaviour: closed tickets 11 (Readout modes and edit mode), 21 (Look sheet and its Bottom bar choice), 20 (Day Strip).

**Blocked by:** 41 (so a tap during Off-Hours visibly changes the bar instead of seeming to do nothing)

**Status:** ready-for-agent

- [ ] In edit mode, tapping (or pressing Enter/Space on) the bar switches whole day ↔ just this Segment, saves it, and the Look sheet shows the same value
- [ ] Outside edit mode the bar isn't interactive
- [ ] The bar looks editable in edit mode; the edit note mentions it
- [ ] Accessible name and role while editing; focus stays sensible after the switch
- [ ] On phones, scrolling the agenda in edit mode doesn't switch it
- [ ] Works during a Segment, a Passing Period and Off-Hours (with 41's countdown); hidden-bar cases (timer showing, Summer) have nothing to tap
- [ ] Tests cover the tap, the keyboard, saving, the Look sheet matching, and not reacting outside edit mode
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
