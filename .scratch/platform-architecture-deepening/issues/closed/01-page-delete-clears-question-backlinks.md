# 01: Deleting a Page clears its Question Backlinks

**What to build:** When a Page is deleted, every Question Backlink recording that the Page links to a Question is removed too, just as its Page Backlinks already are. Today Page deletion clears the Page record, its Slugs and its Page Backlinks, but leaves its entries in the Question Backlink index. The Question editor's delete and remove confirms count those entries, so they keep warning about Pages that no longer exist.

Source: bug found during the 2026-10-12 architecture review (candidate 4 area). Vocabulary: **Page**, **Question**, **Question Link**, **Backlink** in `CONTEXT.md`. See ADR-0008 (Backlinks as a live-maintained index) and ADR-0010 (Questions are linked, not inline).

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] Deleting a Page removes it from the Question Backlinks of every Question it linked to, in the same atomic update as the rest of the delete
- [x] The Question editor's delete/remove confirm no longer counts a deleted Page
- [x] Unit test: a Page with Question Links is deleted, and the Question Backlink entries for it are gone
- [x] A one-off cleanup script alongside the existing ones in `scripts/` removes every Question Backlink entry that points at a Page that no longer exists. It prints what it would remove and only writes when asked to (e.g. a `--apply` flag)
- [ ] The script has been run against the live database, and the result noted in Comments
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Decisions

- **Existing stale entries (2026-10-12, Eric):** clean them up once with a script. Pruning on read was rejected because it adds a database write to a read path; ignoring them was rejected because the delete confirm would keep miscounting.

## Comments

- **2026-10-20 (implementer):** `deletePageAndSlugs` (`web/page-database-utils.js`) now also removes `questionBacklinks/*/{pageId}` in the same single `update()`. It scans the whole `questionBacklinks` index instead of trusting the Page's `questionLinksTo`, because `savePage` does a `set()` on `pages/{pageId}` that wipes `linksTo`/`questionLinksTo` before the backlink updaters run. So those fields only reflect the latest save, and a link removed in an edit leaves its Backlink entry behind (see the follow-up note below). The pure helper `questionBacklinkRemovals` is in `web/question-backlinks.js` (`// @ts-check`, added to `jsconfig.json` include). The delete and the cleanup script both use it.
- **Cleanup script:** `node scripts/cleanQuestionBacklinks.js` is a dry run by default. `--apply` writes the removals in one atomic multi-path update. It needs `firebase-service-account.json` at the repo root, the same as the other scripts.
- **Dry run against the live DB (2026-10-20):** `4 Pages, 0 Questions with Backlinks, 0 Question Backlink entries. No stale Question Backlink entries - nothing to do.` `--apply` has **not** been run. With 0 stale entries it would be a no-op, but the last checkbox is left for Eric.
- **Follow-up bug, not fixed here:** because `savePage` overwrites the record, `updateBacklinksForPage`/`updateQuestionBacklinksForPage` always see `previousLinksTo = []`. They re-add current links but never remove links an edit dropped, in both `backlinks` and `questionBacklinks`. Those stale entries point at *existing* Pages, so this script doesn't catch them. That needs its own ticket.
