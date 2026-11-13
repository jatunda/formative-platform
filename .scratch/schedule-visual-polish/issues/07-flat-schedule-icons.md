# 07: Flat icons for the schedule buttons

**What to build:** The emoji icons on the schedule pages' buttons become flat line icons that match the page's styling and render the same on every OS: 🔗 Link Lesson, 🗑️ Delete Day, and the ⏳ shown while a schedule button's change is saving, which becomes a small spinning circle in the button's colour. The ⚠️ in editor validation messages stays as it is.

**Blocked by:** 01 (Shared line-icon module), 06 (Full Schedule link). Ordering note: tickets 06–11 change the same schedule rows and stylesheet, so they run in order to avoid merge conflicts.

**Status:** ready-for-agent

- [ ] Link Lesson, Delete Day and the saving indicator use flat icons on both schedule pages
- [ ] The spinner spins while a change saves and the button keeps its size
- [ ] Aria-labels and tooltips unchanged
