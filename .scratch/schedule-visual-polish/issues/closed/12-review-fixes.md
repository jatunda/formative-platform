# 12: code-review fixes for the schedule visual polish

**What to build:** Fix the code-review findings on the `schedule-visual-polish` integration branch: close the gap ticket 03 left (pop-ups appended to `document.body` sit outside `<main>`, so axe `region` fires while one is open) and tidy the duplication and indirection the review flagged. No visible change except that pop-ups now count as landmarks or live inside `<main>`.

**Blocked by:** 01–11 (reviews their merged result).

**Status:** closed

- [x] Pop-ups opened on Lesson Planning / Full Schedule no longer trigger axe `region`: the login overlay and Link Lesson popup are `role="dialog"` + `aria-modal`; the lesson actions menu and toasts mount inside `<main>` when the page has one, else `document.body`. Other pages keep working. The Link Lesson popup is shared with the editor (where it opens a Lesson), so its name is "Search lessons". `check:schedule` now also runs axe with the ⋮ menu and the Link Lesson popup open.
- [x] One teacher-side icon helper in `web/ui-components.js` (beside `savingSpinner`) wraps `lineIcon(name, 'line-icon')`, used in `class-pane-controls.js` and `schedule-day-view.js`
- [x] `web/scripts/schedule-check-matrix.js`: one shared `round` helper; `misalignedRows` and `misplacedPluses` share the "N of M … first …" summary
- [x] `web/scripts/schedule-check.mjs`: one `rowLabel(table, tr)` for the heading/day lookups in the `rows` and `pluses` blocks
- [x] `web/teacher.js` calls the shared `getDateForDayIndex` directly (no forwarding wrapper)
- [x] `web/lesson-planning.js`: the last "+" lookup has no `let dayRow` + cast
- [x] `web/style.css`: `.full-schedule-link` drops the `a.` qualifier if the generic link rule can exclude it cleanly. No clean fix exists, so it stays: adding a third `:not()` raises the site-wide link rule from (0,2,1) to (0,3,1), and later rules that beat it today would stop winning.
- [x] Full Schedule shows an Insert Day "+" below its last day, on the line with the add-day row (Eric's decision, as ticket 10 asked); the teacher.js comment and `check:schedule` (every table has a "+" below its last day) expect it. Clicking it adding a day that persists is ticket 13: an empty day after the last stored day can't be saved today.
- [x] lint, typecheck, test:coverage and `npm run check:schedule` pass
