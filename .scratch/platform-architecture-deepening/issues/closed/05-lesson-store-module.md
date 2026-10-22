# 05: Lesson store module; deleting a Lesson removes it from Schedules

**What to build:** Every Lesson read and write (get, create, save, duplicate, delete) goes through one Lesson store module. Today the database module reads and creates Lessons, while the Content Editor saves, duplicates and deletes them by writing to the database directly, mixed in with alerts and confirm dialogs.

With one module, deleting a Lesson gets a real rule: it also removes the Lesson from every Class's Schedule, in the same update. The delete confirm warns first, naming each Class and Day Index that will lose the Lesson. Today a deleted Lesson stays in Schedules and the teacher view shows it as "Untitled Lesson".

Source: candidate 6 ("A Lesson store module", Speculative) of the 2026-10-12 architecture review. Vocabulary: **Lesson**, **Schedule**, **Day Index**, **Class** in `CONTEXT.md`. Note the glossary's _Avoid_ on calling Lessons "content", even though they're stored under that tree.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] All Lesson reads and writes go through the Lesson store module; the Content Editor only handles UI (alerts, confirms, notifications)
- [x] The delete confirm lists every Class and Day Index that still uses the Lesson (or says none do) before deleting
- [x] Confirming the delete removes the Lesson and every Schedule reference to it in one atomic update; days left empty stay as empty days (a gap is a valid state) and no Day Index shifts
- [x] Teacher and Lesson Planning views no longer show "Untitled Lesson" for a deleted Lesson
- [x] Unit tests cover the Lesson store against the Firebase test double, including delete removing Schedule references across several Classes; editor tests no longer need Firebase write mocks for save/duplicate/delete
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Decisions

- **Deleting a Lesson a Schedule still uses (2026-10-12, Eric):** remove it from every Schedule, and warn in the confirm which Classes and Day Indices lose it. A warning alone (leaving "Untitled Lesson" behind) and blocking the delete were both rejected.
