# 04: Database modules share one initialization

**What to build:** Each page initializes the database once, and every database module (Lessons/Schedules, Pages, Questions, Practice Sets) can use it. Today each module keeps its own database handle and its own init function. Some depend on another module's helpers, so a page has to remember to initialize both, and about 13 call sites repeat that pattern. Forgetting one fails only at runtime.

Do this with one small shared database-handle module: a page initializes it once, and every database module reads the database from it instead of keeping its own handle. Tests set the Firebase test double on it once.

Source: candidate 4 of the 2026-10-12 architecture review (hidden init coupling).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A shared database-handle module holds the database; no database module keeps its own handle or init function
- [ ] A page needs one initialization call for all database modules
- [ ] No database module depends on another module having been initialized separately
- [ ] All pages that use the database (teacher, lesson planning, editor, page editor/manager/view, question bank/editor, practice set editor/manager/view, student view) still load and work
- [ ] Test setup initializes once through the same path the pages use
- [ ] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Decisions

- **How to share initialization (2026-10-12, Eric):** one shared database-handle module. Having each module call Firebase's `getDatabase()` lazily was rejected because tests would then have to mock the Firebase import instead of injecting a test double.
