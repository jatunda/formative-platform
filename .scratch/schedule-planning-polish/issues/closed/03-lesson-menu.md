# 03: Lesson ⋮ menu

**What to build:** Each Lesson in a day takes a single row: its title button plus a ⋮ button. The ⋮ opens a small menu: Move left, Move right, Move to previous day, Move to next day, Remove from this day. This replaces the separate left/right/delete buttons (making an accidental remove unlikely) and gives touch users a way to move a Lesson between days, which drag-and-drop can't do on touch (ADR 0003).

**Blocked by:** 02 (Compact day rows). Ordering note: the tickets in this folder are deliberately serial because they edit the same schedule-rendering code and stylesheet rules; the edge prevents merge conflicts, not a logical dependency.

**Status:** closed

- [x] Lesson cluster is one row: title + ⋮
- [x] Menu items use plain words; items that can't apply are disabled (Move left on the first Lesson, Move right on the last, Move to previous day at Day Index 0)
- [x] Move to previous/next day appends the Lesson to the end of that day's list (same as drag-and-drop) and works even when that day is outside the visible Planning Window
- [x] Remove from this day removes only the placement (the Lesson itself still exists), with no confirm
- [x] Menu closes on outside click or Esc and is keyboard-operable
- [x] Drag-and-drop still works
- [x] Comfortable to open and tap on a portrait phone
- [x] ADR 0003 gets a note: the compact layout shipped; the ⋮ menu covers moving a Lesson to another day on touch; horizontal scroll remains only for days with many Lessons; cross-Class moves remain unsupported

## Comments

Done. The ⋮ menu is a reusable `createMenuButton(label, getItems)` in `web/action-menu.js` (focus to the first enabled item, Arrow/Home/End skip disabled items, Esc or Tab or an outside press closes, focus returns to ⋮; mounted on `document.body` with fixed positioning so the Lessons cell's horizontal scroll can't clip it, and kept inside the visual viewport). `createLessonCluster` now renders one `.lesson-cluster-row`; the day moves reuse `moveLessonBetweenDays` (database-utils.js), which reads the target day from the database, so a day outside the Planning Window (or not yet in the Schedule) works. The now-unused `createLeftArrowButton`/`createRightArrowButton`/`createDeleteButton` were removed from ui-components.js.

Touch targets: under `pointer: coarse` the ⋮, the title and the ➕/🔗 icons are 44px (tall and wide) and menu items are 44px tall. On a touch phone narrower than 600px, the ⋮ is 32px wide and ➕/🔗 stay 40px wide (all still 44px tall): with 44px widths a one-Lesson day measured 406px wide at 375px, so those widths are the trade that keeps it fitting (measured 375px, title 62px wide).
