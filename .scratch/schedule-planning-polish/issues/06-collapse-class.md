# 06: Collapse a Class

**What to build:** On Lesson Planning, a ▸/▾ chevron before each Class name collapses that Class. Collapsed, the pane shows only its header (chevron, name, and the ↗ link once 07 lands); the table, the window-size buttons and the Date Offset control hide. Not remembered across reloads.

**Blocked by:** 05 (Resize a Class's Planning Window). Ordering note: the tickets in this folder are deliberately serial because they edit the same schedule-rendering code and stylesheet rules; the edge prevents merge conflicts, not a logical dependency.

**Status:** ready-for-agent

- [ ] Chevron toggles collapse and is accessible (a button with aria-expanded)
- [ ] Collapsed pane hides the table, window-size buttons and Date Offset control
- [ ] Collapse state and window size both survive that pane's own re-renders
- [ ] Reload shows every Class expanded
