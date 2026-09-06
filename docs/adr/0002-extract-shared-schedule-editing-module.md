---
status: accepted
---

# Extract shared schedule-editing module instead of duplicating it

Lesson Planning's per-Class panes need the same day-row rendering, Insert/Delete Day (Day Index shifting), and drag-and-drop logic already inlined inside `teacher.js`. That logic could have been copied into new code for `lesson-planning.js`, leaving `teacher.js` untouched and lower-risk, or extracted out of `teacher.js` into a shared module imported by both pages.

We extracted it into a shared module; `teacher.js` was refactored to call it rather than keeping its own copy, so there is exactly one implementation of Insert/Delete Day and drag-and-drop, not two. The index-shifting behavior behind Insert/Delete Day is the kind of logic that's easy to get subtly wrong twice in slightly different ways — duplicating it would mean any future fix has to be found and re-applied in both places. This trades a period of regression risk to `teacher.html` (the page used daily) during the refactor for not having two copies of that logic going forward; the refactor was verified to leave `teacher.html`'s existing behavior unchanged before shipping.
