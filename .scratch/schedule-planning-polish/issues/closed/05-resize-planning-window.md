# 05: Resize a Class's Planning Window

**What to build:** On Lesson Planning, each Class's Planning Window can be widened or narrowed with "+3 days" and "−3 days" buttons under its table. It starts at 3 days, grows by 3 with no upper limit, and never goes below 3. Not remembered: a reload puts every Class back to 3 (see Planning Window in `CONTEXT.md`).

**Blocked by:** 04 (Skip / Delay Date Offset control). Ordering note: the tickets in this folder are deliberately serial because they edit the same schedule-rendering code and stylesheet rules; the edge prevents merge conflicts, not a logical dependency.

**Status:** closed

- [x] "+3 days" adds three more Day Indices to that Class only
- [x] "−3 days" removes three, and is disabled at 3
- [x] Other Classes are unaffected
- [x] Reload resets every Class to 3
- [x] Size survives that pane's own re-renders (e.g. after moving a Lesson or changing its Date Offset)
