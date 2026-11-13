# 06: Collapse a Class

**What to build:** On Lesson Planning, a ▸/▾ chevron before each Class name collapses that Class. Collapsed, the pane shows only its header (chevron, name, and the ↗ link once 07 lands); the table, the window-size buttons and the Date Offset control hide. Not remembered across reloads.

**Blocked by:** 05 (Resize a Class's Planning Window). Ordering note: the tickets in this folder are deliberately serial because they edit the same schedule-rendering code and stylesheet rules; the edge prevents merge conflicts, not a logical dependency.

**Status:** closed

- [x] Chevron toggles collapse and is accessible (a button with aria-expanded)
- [x] Collapsed pane hides the table, window-size buttons and Date Offset control
- [x] Collapse state and window size both survive that pane's own re-renders
- [x] Reload shows every Class expanded

## Comments

Done. Each pane's UI state is one `{ windowSize, collapsed }` shape (`PaneUiState` in `web/lesson-planning.js`), passed to `renderClassPane` and kept per Class in a module map, so the all-classes Bulk Offset Shift now keeps both window size and collapse state (closing ticket 05's gap where it reset widened windows to 3). Collapsing toggles `hidden` in place without refetching. A fresh load clears the map, so a page reload shows every Class expanded at 3 days.
