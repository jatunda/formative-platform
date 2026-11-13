# 04: Skip / Delay Date Offset control

**What to build:** Changing a Date Offset says what it does to the Lessons. One shared control: an amount box (default 1), **Skip** and **Delay** buttons that apply instantly, the current offset shown, and a "?" tooltip: *Delay: lessons move to later dates (e.g. after a snow day). Skip: lessons move to earlier dates, jumping ahead.* Delay raises the offset, Skip lowers it (see Date Offset in `CONTEXT.md`). Used for the all-classes Bulk Offset Shift, for each Class on Lesson Planning, and on Full Schedule.

**Blocked by:** 03 (Lesson ⋮ menu). Ordering note: the tickets in this folder are deliberately serial because they edit the same schedule-rendering code and stylesheet rules; the edge prevents merge conflicts, not a logical dependency.

**Status:** closed

- [x] The all-classes control shows Skip and Delay instead of − and +, with the same instant apply and success notification
- [x] Each Class's pane on Lesson Planning and the Full Schedule page use the same control; the type-an-absolute-value + Apply input is gone
- [x] Delay raises the Date Offset by the amount, Skip lowers it; the visible days update right after
- [x] Current offset still visible; Full Schedule keeps its "Today is Day N" and Go to Today
- [x] One shared component, not three copies

## Comments

Done. `createDateOffsetControl` in `web/ui-components.js` is now the one Skip/Delay control (label, optional current offset, optional "Today is Day N", "?" tooltip, amount box, Skip/Delay, optional Go to Today), with `getShiftAmount` and `createInfoTooltip` beside it. The three callers only wire `onShift(delta)`: Bulk Offset Shift (`applyBulkShift`, no current offset), each Lesson Planning pane, and Full Schedule (`teacher.js`). The bulk success notification now reads "Delayed all classes N days." / "Skipped all classes ahead N days." instead of "+N"/"-N", per CONTEXT.md's avoid-"+/-" note. Lesson Planning panes no longer compute Today's Day Index (the window starts at today anyway).
