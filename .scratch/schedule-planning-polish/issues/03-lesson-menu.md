# 03: Lesson ⋮ menu

**What to build:** Each Lesson in a day takes a single row: its title button plus a ⋮ button. The ⋮ opens a small menu: Move left, Move right, Move to previous day, Move to next day, Remove from this day. This replaces the separate left/right/delete buttons (making an accidental remove unlikely) and gives touch users a way to move a Lesson between days, which drag-and-drop can't do on touch (ADR 0003).

**Blocked by:** 02 (Compact day rows). Ordering note: the tickets in this folder are deliberately serial because they edit the same schedule-rendering code and stylesheet rules; the edge prevents merge conflicts, not a logical dependency.

**Status:** ready-for-agent

- [ ] Lesson cluster is one row: title + ⋮
- [ ] Menu items use plain words; items that can't apply are disabled (Move left on the first Lesson, Move right on the last, Move to previous day at Day Index 0)
- [ ] Move to previous/next day appends the Lesson to the end of that day's list (same as drag-and-drop) and works even when that day is outside the visible Planning Window
- [ ] Remove from this day removes only the placement (the Lesson itself still exists), with no confirm
- [ ] Menu closes on outside click or Esc and is keyboard-operable
- [ ] Drag-and-drop still works
- [ ] Comfortable to open and tap on a portrait phone
- [ ] ADR 0003 gets a note: the compact layout shipped; the ⋮ menu covers moving a Lesson to another day on touch; horizontal scroll remains only for days with many Lessons; cross-Class moves remain unsupported
