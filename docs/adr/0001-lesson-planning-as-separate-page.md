---
status: accepted
---

# Lesson Planning as its own static page, not a tab in teacher.html

This is a static multi-page site (plain HTML + JS modules, Firebase RTDB, no router/framework) with one page per concern: `teacher.html` is the full single-Class Schedule editor, `editor.html` edits Lesson content, `view.html`/`index.html` are student-facing. The new Lesson Planning feature (all Classes at once, each showing a short Planning Window) could instead have been built as a mode switch inside `teacher.js`.

We built it as a new standalone page (`lesson-planning.html` + `lesson-planning.js`) instead. There is no existing tab/view-switching mechanism anywhere in the app to build on, and `teacher.js` already carries substantial logic for its one job; a second, structurally different view (all Classes, a short window of Day Indices, no full-Schedule scroll) is a better fit for the app's existing one-page-per-concern shape than inventing a new in-page mode-switching pattern from scratch.

**Consequence**: a small shared nav partial was added across the three teacher-facing pages (Full Schedule, Lesson Planning, Content Editor) so moving between them doesn't require typing URLs. Student-facing pages (`index.html`, `view.html`) were deliberately left untouched.
