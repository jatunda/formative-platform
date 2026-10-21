# 06: Saving a Page removes Backlinks for links the edit dropped

**What to build:** When a Page is saved and an edit has removed a Page Link or Question Link, the matching Page Backlink / Question Backlink is removed. Today `savePage` overwrites the whole `pages/{id}` record (wiping `linksTo` / `questionLinksTo`) before the Backlink updaters run, so they see no previous links and only ever add. Stale Backlinks accumulate for Pages that still exist, which the ticket 01 cleanup script does not catch, and Page Backlink removal on Page delete (which relies on `linksTo`) has the same blind spot.

Source: found while implementing ticket 01 (2026-10-20). See `issues/closed/01-page-delete-clears-question-backlinks.md` and ADR-0008. Ticket 03 ("only the Page module writes Page records", shared Backlink diffing) is the natural place to fix it or build on.

**Blocked by:** 03 (Pages and Questions use the Slug index module).

**Status:** needs-triage

- [ ] Saving a Page with a removed Page Link / Question Link removes the matching Backlink, in the same atomic update
- [ ] Page delete removes Page Backlinks even if `linksTo` is out of date
- [ ] A cleanup path (extend `scripts/cleanQuestionBacklinks.js` or a sibling) removes Backlinks whose source Page no longer links to the target, dry-run by default
- [ ] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`
