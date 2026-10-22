# 06: Saving a Page removes Backlinks for links the edit dropped

**What to build:** When a Page is saved and an edit has removed a Page Link or Question Link, the matching Page Backlink / Question Backlink is removed. Today `savePage` overwrites the whole `pages/{id}` record (wiping `linksTo` / `questionLinksTo`) before the Backlink updaters run, so they see no previous links and only ever add. Stale Backlinks accumulate for Pages that still exist, which the ticket 01 cleanup script does not catch, and Page Backlink removal on Page delete (which relies on `linksTo`) has the same blind spot.

Source: found while implementing ticket 01 (2026-10-20). See `issues/closed/01-page-delete-clears-question-backlinks.md` and ADR-0008. Ticket 03 ("only the Page module writes Page records", shared Backlink diffing) is the natural place to fix it or build on.

**Blocked by:** 03 (Pages and Questions use the Slug index module).

**Status:** closed

- [x] Saving a Page with a removed Page Link / Question Link removes the matching Backlink, in the same atomic update
- [x] Page delete removes Page Backlinks even if `linksTo` is out of date
- [x] A cleanup path (extend `scripts/cleanQuestionBacklinks.js` or a sibling) removes Backlinks whose source Page no longer links to the target, dry-run by default
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Comments

- **2026-10-22 (implementer):** `savePage(pageId, parsed, questionTargetIds)` (`web/page-database-utils.js`) now reads the Page's stored `linksTo` / `questionLinksTo` before replacing the record. It diffs both link kinds and writes the record, both lists and every Backlink change in one `update()`. Page Links are resolved there. Question Links are resolved by `resolveQuestionLinkTargets` in the Question module, which the Page editor passes in. `updateBacklinksForPage`, `updateQuestionBacklinksForPage` and `recordPageLinks` are gone.
- `deletePageAndSlugs` scans both whole Backlink indexes through `backlinkRemovals` in `web/backlinks.js`, so it no longer relies on `linksTo`. It skips the Page's own `backlinks/{pageId}/{pageId}` entry so the update's paths don't overlap. `web/question-backlinks.js` was folded into `backlinks.js`, and each `LinkKind` now carries its own Slug extractor and resolves targets through `linkTargets`.
- **Cleanup:** `scripts/cleanQuestionBacklinks.js` is renamed `scripts/cleanBacklinks.js`. It now covers both indexes and removes entries whose source Page is gone or whose current content no longer links to the target (`staleBacklinkRemovals`). It is a dry run by default; `--apply` writes the changes. **Not yet run against production**: run it once to clear entries that built up before this fix.
- Known limits (not new): the save is read-then-write, not a transaction, so two tabs saving at once can still diff against stale lists. The cleanup script repairs that.
