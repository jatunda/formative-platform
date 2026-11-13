# 02: Compact day rows

**What to build:** Schedule rows take less room on both Lesson Planning and Full Schedule. The Day Index and Date columns shrink to their content (no wide empty space to the right of e.g. `8` or `11/2/2026 (Monday)`); the table's 600px minimum width goes away so a short day fits a portrait phone without sideways scrolling; on narrow screens the date shows as `Mon 11/2`. New Lesson and Link Lesson become two icon buttons side by side (➕ and 🔗) after the last Lesson instead of two stacked text buttons. A day with many Lessons still scrolls sideways inside its pane.

**Blocked by:** 01 (In-app confirm dialog). Ordering note: the tickets in this folder are deliberately serial because they edit the same schedule-rendering code and stylesheet rules; the edge prevents merge conflicts, not a logical dependency.

**Status:** ready-for-agent

- [ ] Day Index and Date columns are only as wide as their content on both pages
- [ ] No table minimum width; a day with one Lesson fits a 375px-wide portrait screen with no horizontal scroll
- [ ] Narrow screens show the date as `Mon 11/2`; wider screens keep the current format
- [ ] ➕ (New Lesson) and 🔗 (Link Lesson) sit side by side, each with a tooltip and an accessible label, and behave exactly as the old buttons did
- [ ] Buttons stay comfortably tappable on touch screens (larger targets under `pointer: coarse`)
