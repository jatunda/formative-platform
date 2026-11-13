# 04: Skip / Delay Date Offset control

**What to build:** Changing a Date Offset says what it does to the Lessons. One shared control: an amount box (default 1), **Skip** and **Delay** buttons that apply instantly, the current offset shown, and a "?" tooltip: *Delay: lessons move to later dates (e.g. after a snow day). Skip: lessons move to earlier dates, jumping ahead.* Delay raises the offset, Skip lowers it (see Date Offset in `CONTEXT.md`). Used for the all-classes Bulk Offset Shift, for each Class on Lesson Planning, and on Full Schedule.

**Blocked by:** 03 (Lesson ⋮ menu). Ordering note: the tickets in this folder are deliberately serial because they edit the same schedule-rendering code and stylesheet rules; the edge prevents merge conflicts, not a logical dependency.

**Status:** ready-for-agent

- [ ] The all-classes control shows Skip and Delay instead of − and +, with the same instant apply and success notification
- [ ] Each Class's pane on Lesson Planning and the Full Schedule page use the same control; the type-an-absolute-value + Apply input is gone
- [ ] Delay raises the Date Offset by the amount, Skip lowers it; the visible days update right after
- [ ] Current offset still visible; Full Schedule keeps its "Today is Day N" and Go to Today
- [ ] One shared component, not three copies
